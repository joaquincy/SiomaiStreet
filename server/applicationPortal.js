import { createHmac, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { UUID_PATTERN, DOCUMENT_KEYS, documentTypes } from '../shared/application.js';
import { normalizeDocumentImage } from './documentImages.js';
import { isAcceptedScan } from './documentScanner.js';

const fail = (message, status) => Object.assign(new Error(message), { status });
export function portalAccess(secret) {
  const code = id => {
    if (!secret || secret.length < 32) throw fail('Application tracking is not configured.', 503);
    return createHmac('sha256', secret).update('applicant-portal-v1:' + id).digest('base64url');
  };
  return {
    receipt: row => ({ accessCode: code(row.id), accessExpiresAt: new Date(Date.parse(row.submitted_at) + 90 * 86400000).toISOString() }),
    verify: (id, token) => {
      if (!UUID_PATTERN.test(id) || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw fail('Reference or access code is invalid.', 401);
      if (!timingSafeEqual(Buffer.from(code(id)), Buffer.from(token))) throw fail('Reference or access code is invalid.', 401);
    },
  };
}

export function createPortalHandler({ access, rate, admit, repository, readMultipart, scanDocument, uploadFile, deleteStorageObjects, verifyStorage, json, reportCleanupFailure = () => {}, allowUnscannedDocuments = false }) {
  return async (req, res, id, correctionId) => {
    if (correctionId) res.setHeader?.('Connection', 'close');
    // Rate and ownership checks run before multipart parsing and expensive file work.
    if (!await rate(req)) throw fail('Too many attempts. Please wait before retrying.', 429);
    access.verify(id, req.headers.authorization?.replace(/^Bearer /, ''));
    const row = await repository.find(id);
    if (!row || row.portal_access_revoked || !Number.isFinite(Date.parse(row.submitted_at)) || Date.now() >= Date.parse(row.submitted_at) + 90 * 86400000) throw fail('Access has expired or is unavailable. Use the verified support channel for help.', 401);
    const requests = await repository.requests(id);
    if (!correctionId) return json(res, 200, { id, status: row.status, updatedAt: row.updated_at, submittedAt: row.submitted_at, corrections: requests.map(r => ({ id:r.id, documentKey:r.document_key, reason:r.reason, status:r.status, requestedAt:r.created_at, receivedAt:r.received_at })) });
    const request = requests.find(r => r.id === correctionId);
    if (!request) throw fail('Replacement request not found.', 404);
    const release = await admit(req, res);
    const attempt = randomUUID();
    let path; let commitAttempted = false;
    const cleanup = async bucket => { if (path) try { await deleteStorageObjects(bucket, [path]); } catch { reportCleanupFailure({ bucket, id, attempt }); } };
    try {
      await verifyStorage();
      const form = await readMultipart(req, { maxBytes: 11 * 1024 * 1024 });
      req.setTimeout?.(120000);
      if ([...form.keys()].some(k => !['requestId','document'].includes(k)) || form.getAll('document').length !== 1 || form.getAll('requestId').length !== 1 || !UUID_PATTERN.test(form.get('requestId'))) throw fail('Invalid replacement request.', 400);
      let file = form.get('document');
      if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 || !documentTypes(request.document_key).includes(file.type)) throw fail('Choose a nonempty JPG or PNG (PDF allowed except for ID photos), no larger than 10 MiB.', 422);
      const bytes = Buffer.from(await file.arrayBuffer());
      const matches = file.type === 'application/pdf' ? bytes.subarray(0,5).toString() === '%PDF-' : file.type === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
      if (!matches) throw fail('The document does not match its file type.', 422);
      const hash = createHash('sha256').update(file.type).update(bytes).digest('hex');
      const retryId = form.get('requestId');
      if (request.status === 'received') {
        if (request.request_id === retryId && request.request_hash === hash) return json(res, 200, { id:correctionId, requestId:retryId, status:'received' });
        throw fail('This replacement request was already completed. Refresh the status.', 409);
      }
      if (request.status !== 'open' || row.status !== 'more_information_requested' || !DOCUMENT_KEYS.includes(request.document_key)) throw fail('This request is no longer open. Refresh the status.', 409);
      path = `${id}/corrections/${attempt}/${request.document_key}`;
      file = await normalizeDocumentImage(file);
      await uploadFile('franchise-quarantine', path, file, file.type);
      const scan = await scanDocument(file);
      if (scan?.status === 'rejected') throw fail('The replacement failed security checks. Choose a different file.', 422);
      if (!isAcceptedScan(scan, allowUnscannedDocuments)) throw fail('Document scanning is unavailable. Keep your file and retry.', 503);
      await uploadFile('franchise-documents', path, file, file.type);
      commitAttempted = true;
      const result = await repository.replace({ application_id:id, correction_id:correctionId, retry_id:retryId, file_hash:hash, metadata:{ path, name:file.name, contentType:file.type, size:file.size, scan } });
      if (result?.id !== correctionId || result?.requestId !== retryId || result?.status !== 'received') throw fail('Replacement receipt could not be confirmed. Retry with the same file.', 503);
      if (result.path !== path) await cleanup('franchise-documents');
      return json(res, 200, { id:correctionId, requestId:retryId, status:'received' });
    } catch (error) {
      if (!commitAttempted) await cleanup('franchise-documents');
      else reportCleanupFailure({ bucket:'franchise-documents', id, attempt, reason:'reconcile-possible-commit' });
      throw error;
    } finally { await cleanup('franchise-quarantine'); release(); }
  };
}
