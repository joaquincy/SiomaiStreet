import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { CONTRACT_VERSION, DOCUMENT_KEYS, MAX_DOCUMENT_BYTES, UUID_PATTERN, documentTypes, sanitizeApplication, validateApplication } from '../shared/application.js';
import { normalizeDocumentImage } from './documentImages.js';
import { isAcceptedScan } from './documentScanner.js';
import { createUploadCheckQueue } from './uploadCheckQueue.js';
import { DOCUMENT_POLICY_VERSION } from '../shared/documentPolicy.js';
import { ONBOARDING_DOCUMENT_KEY } from '../shared/applicationFollowup.js';

const fail = (message, status = 400, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const documentPath = (session, key) => `direct/${session}/${key}`;

export async function readUploadJson(req, maxBytes = 350000) {
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw fail('Application details are too large.', 413);
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '') || req.headers['content-encoding']) throw fail('Send application details as plain JSON.', 415);
  const chunks = []; let total = 0;
  req.setTimeout?.(10000);
  try {
    for await (const chunk of (req.iterator ? req.iterator({ destroyOnReturn: false }) : req)) {
      total += chunk.length;
      if (total > maxBytes) throw fail('Application details are too large.', 413);
      chunks.push(chunk);
    }
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('The application request is malformed.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw fail('The application request is malformed.');
    return data;
  } finally { req.setTimeout?.(180000); }
}

function validateManifest(value, onboarding = false) {
  if (!Array.isArray(value) || value.length < 1 || value.length > DOCUMENT_KEYS.length) throw fail('Select the required documents.', 422);
  const documents = {};
  return value.map(item => {
    if (!item || !(onboarding ? item.key === ONBOARDING_DOCUMENT_KEY : DOCUMENT_KEYS.includes(item.key)) || Object.hasOwn(documents, item.key)
      || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200 || [...item.name].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
      || !Number.isSafeInteger(item.size) || item.size < 1 || item.size > MAX_DOCUMENT_BYTES || !documentTypes(item.key).includes(item.type)
      || typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)) throw fail('A document has invalid or duplicate details.', 422);
    const entry = { key: item.key, name: item.name, type: item.type, size: item.size, sha256: item.sha256 };
    documents[item.key] = entry;
    return entry;
  }).sort((a, b) => a.key.localeCompare(b.key));
}

export function validateUploadRequest(body) {
  if (body.version !== CONTRACT_VERSION || typeof body.requestId !== 'string' || !UUID_PATTERN.test(body.requestId)) throw fail('Invalid application request. Reload and retry.');
  if (!body.applicationData || typeof body.applicationData !== 'object' || Array.isArray(body.applicationData)) throw fail('Application answers are missing.');
  const manifest = validateManifest(body.manifest);
  const documents = Object.fromEntries(manifest.map(item => [item.key, item]));
  const validationErrors = validateApplication({ ...body.applicationData, documents }, { documentMetadata: true });
  if (validationErrors.length) throw fail('Please correct the application fields listed below.', 422, { validationErrors });
  const data = sanitizeApplication(body.applicationData);
  data.documentPolicyVersion = DOCUMENT_POLICY_VERSION;
  delete data.documents;
  data.email = data.email.trim().toLowerCase();
  data.confirmEmail = data.confirmEmail.trim().toLowerCase();
  return { data, manifest, hash: sha256(JSON.stringify(canonical({ transport: 'direct-v1', data, manifest }))) };
}

export function uploadSessionAccess(secret) {
  const token = row => {
    if (!secret || secret.length < 32) throw fail('Upload session security is not configured.', 503);
    // JSON RPC and REST reads can serialize the same timestamp differently.
    return createHmac('sha256', secret).update(`direct-upload:v1:${row.id}:${row.request_hash}:${Date.parse(row.expires_at)}`).digest('base64url');
  };
  return {
    token, verify(row, supplied) {
      if (typeof supplied !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(supplied)) return false;
      return timingSafeEqual(Buffer.from(token(row)), Buffer.from(supplied));
    }
  };
}

export function assertDocumentBytes(bytes, item) {
  const type = item.content_type;
  const signature = type === 'application/pdf' ? bytes.subarray(0, 5).toString('ascii') === '%PDF-'
    : type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : type === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (bytes.length !== Number(item.size) || bytes.length > MAX_DOCUMENT_BYTES || sha256(bytes) !== item.sha256 || !signature) {
    throw fail('This document does not match the selected file. Select a valid PDF, JPG or PNG and retry.', 422);
  }
}

// All paths come from a server-created session. Client paths and scan flags are ignored.
export function createDirectUploadHandler({ repository, storage, rate, verify, verifyStorage, access, scanDocument, json, receiptDetails, corrections, onboarding, changes, allowUnscanned = false, now = Date.now }) {
  const acquireCheck = createUploadCheckQueue();
  const receipt = row => ({ version: CONTRACT_VERSION, id: row.id, status: 'submitted', submittedAt: row.submitted_at, ...receiptDetails(row) });
  const expired = row => Date.parse(row.expires_at) <= now();
  return async (req, res, sessionId, action, key, correctionContext, onboardingContext, changeContext) => {
    res.setHeader('Connection', 'close');
    if (!await rate(req, sessionId ? 'upload-control' : 'upload-start', sessionId ? 100 : 20)) throw fail('Too many attempts. Keep your draft and try again later.', 429);
    if (!sessionId) {
      let correction, requirement, change;
      if (changeContext) change = await changes.authorize(req, changeContext.applicationId, changeContext.changeId);
      else if (onboardingContext) requirement = await onboarding.authorize(req, onboardingContext.applicationId, onboardingContext.itemId);
      else if (correctionContext) correction = await corrections.authorize(req, correctionContext.applicationId, correctionContext.correctionId);
      else await verify(req); // Public Turnstile, or private portal ownership, precedes parsing.
      await verifyStorage();
      const body = await readUploadJson(req);
      let data, manifest, hash;
      const applicationId = changeContext?.applicationId || onboardingContext?.applicationId || correctionContext?.applicationId || body.requestId;
      if (change) {
        if (body.version !== CONTRACT_VERSION || !UUID_PATTERN.test(body.requestId)) throw fail('Invalid supporting-document request.');
        manifest = validateManifest(body.manifest);
        if (manifest.length !== change.required_documents.length || manifest.some(item => !change.required_documents.includes(item.key))) throw fail('Select all and only the supporting documents listed for this change.', 422);
        data = {};
        hash = sha256(JSON.stringify(canonical({ transport: 'change-evidence-v1', change: change.id, retry: body.requestId, manifest })));
        if (change.evidence_request_id) {
          if (change.evidence_request_id !== body.requestId || change.evidence_hash !== hash) throw fail('Supporting documents were already received. Refresh your details.', 409);
          return json(res, 200, { receipt: { id: change.id, requestId: body.requestId, status: 'received' } });
        }
      } else if (requirement) {
        if (body.version !== CONTRACT_VERSION || !UUID_PATTERN.test(body.requestId) || !Number.isSafeInteger(body.onboardingRevision)) throw fail('Invalid onboarding upload.');
        manifest = validateManifest(body.manifest, true);
        if (manifest.length !== 1) throw fail('Choose one supporting document.');
        data = {};
        hash = sha256(JSON.stringify(canonical({ transport: 'onboarding-v1', item: requirement.id, revision: body.onboardingRevision, retry: body.requestId, manifest })));
        const received = await onboarding.retry(applicationId, requirement.id, body.requestId, hash);
        if (received) return json(res, 200, { receipt: received });
        if (requirement.revision !== body.onboardingRevision || !['not_started', 'needs_correction'].includes(requirement.state)) throw fail('This requirement changed. Refresh before uploading.', 409);
      } else if (correction) {
        if (body.version !== CONTRACT_VERSION || !UUID_PATTERN.test(body.requestId)) throw fail('Invalid replacement request.');
        manifest = validateManifest(body.manifest);
        if (manifest.length !== 1 || manifest[0].key !== correction.document_key) throw fail('Select only the document requested by the reviewer.', 422);
        data = {};
        hash = sha256(JSON.stringify(canonical({ transport: 'direct-correction-v1', correction: correction.id, retry: body.requestId, manifest })));
        if (correction.status === 'received') {
          if (correction.request_id !== body.requestId || correction.request_hash !== hash) throw fail('This replacement request was already completed. Refresh the status.', 409);
          return json(res, 200, { receipt: { id: correction.id, requestId: body.requestId, status: 'received' } });
        }
      } else ({ data, manifest, hash } = validateUploadRequest(body));
      const existing = !correction && !requirement && !change && await repository.application(applicationId);
      if (existing) {
        if (existing.request_hash !== hash) throw fail('This application was already submitted with different answers. Use your original receipt to request a correction.', 409);
        return json(res, 200, { receipt: receipt(existing) });
      }
      let row = await repository.active(applicationId, hash);
      if (!row) {
        if (!await rate(req, correction || requirement || change ? 'new-correction' : 'new-application', correction || requirement || change ? 20 : 4)) throw fail('Too many new upload sessions. Keep your answers and try again later.', 429);
        row = change ? await repository.prepareChange(applicationId, change.id, body.requestId, hash, manifest)
          : requirement ? await repository.prepareOnboarding(applicationId, requirement.id, body.onboardingRevision, body.requestId, hash, manifest)
          : await repository.prepare(applicationId, hash, data, manifest, correction?.id, correction ? body.requestId : undefined);
      }
      return json(res, 200, { sessionId: row.id, token: access.token(row), expiresAt: row.expires_at });
    }
    if (!UUID_PATTERN.test(sessionId)) throw fail('Upload session not found.', 404);
    const row = await repository.session(sessionId);
    const supplied = req.headers.authorization?.replace(/^Bearer /, '');
    if (!row || !access.verify(row, supplied)) throw fail('Upload permission is invalid. Retry from your saved application.', 403);
    if (row.correction_id) await corrections.check(row.application_id, row.correction_id);
    if (row.onboarding_item_id) await onboarding.check(row.application_id, row.onboarding_item_id);
    if (row.answer_change_id) await changes.check(row.application_id, row.answer_change_id);
    if (expired(row)) throw fail('The upload session expired. Your draft is safe; submit again to start a new session.', 410);
    await readUploadJson(req, 1024);
    if (action === 'finalize') {
      const existing = !row.correction_id && !row.onboarding_item_id && !row.answer_change_id && await repository.application(row.application_id);
      if (existing) {
        if (existing.request_hash !== row.request_hash) throw fail('This application was already received with different answers.', 409);
        return json(res, 200, receipt(existing));
      }
      const items = await repository.items(sessionId);
      if (!row.correction_id && !row.onboarding_item_id && !row.answer_change_id) {
        // Pending sessions may have been created before the current validation rules.
        // Recheck before committing; already received applications above retain their receipt.
        const savedAnswers = await repository.answers(sessionId);
        if (!savedAnswers?.application_data) throw fail('Application answers could not be confirmed. Keep your draft and retry.', 503);
        const data = savedAnswers.application_data;
        const documents = Object.fromEntries(items.map(item => [item.document_key, { size: Number(item.size), type: item.content_type }]));
        const validationErrors = validateApplication({ ...data, documents }, { documentMetadata: true });
        if (validationErrors.length) throw fail('Please review your current application answers before submitting again.', 422, { validationErrors });
        if (data.hasCoApplicant !== 'yes' && Object.hasOwn(data, 'coApplicant')) {
          throw fail('This older upload contains co-applicant details that are no longer selected. Retry from your application to exclude them; your draft is kept.', 409);
        }
      }
      if (!items.length || items.some(item => item.state !== 'ready' || !isAcceptedScan(item.verified_document?.scan, allowUnscanned))) throw fail('Some documents still need checking. Retry this application to finish checking them.', 409);
      // The RPC repeats checks and inserts exactly once within a database transaction.
      const result = row.answer_change_id ? await repository.finalizeChange(sessionId, allowUnscanned) : row.onboarding_item_id ? await repository.finalizeOnboarding(sessionId, allowUnscanned) : await repository.finalize(sessionId, allowUnscanned);
      return json(res, 201, row.correction_id || row.onboarding_item_id || row.answer_change_id ? result : receipt(result));
    }
    if (!(row.onboarding_item_id ? key === ONBOARDING_DOCUMENT_KEY : DOCUMENT_KEYS.includes(key))) throw fail('Document not found.', 404);
    const item = await repository.item(sessionId, key);
    if (!item) throw fail('Document not included in this application.', 404);
    if (item.state === 'ready') return json(res, 200, { state: 'ready' });
    if (item.state === 'rejected') throw fail('This document failed security validation. Replace it with a new, valid file before resubmitting.', 422, { validationErrors: [{ step: 6, message: `Replace ${key}: the document failed security validation.` }] });
    const path = documentPath(sessionId, key);
    if (action === 'authorize') {
      // A completed object can be checked again after a lost acknowledgement without re-uploading.
      if (await storage.exists(path)) return json(res, 200, { state: 'uploaded' });
      const grant = await storage.sign(path);
      return json(res, 200, { state: 'upload', ...grant, path, bucket: 'franchise-quarantine' });
    }
    if (action !== 'check') throw fail('Unknown upload action.', 404);
    const timings = [];
    const measure = async (stage, operation) => {
      const started = performance.now();
      try { return await operation(); }
      finally {
        timings.push(`${stage};dur=${(performance.now() - started).toFixed(1)}`);
        // Numeric timings only: no applicant fields, document names, tokens or paths.
        if (!res.headersSent && !res.destroyed) res.setHeader('Server-Timing', timings.join(', '));
      }
    };
    // Wait for bounded local capacity before taking a database lease or reading bytes.
    const releaseCheck = await measure('queue', () => acquireCheck(req, res));
    const lease = randomUUID();
    let claimed = false;
    try {
      if (expired(row)) throw fail('The upload session expired. Your draft is safe; submit again to start a new session.', 410);
      claimed = Boolean(await measure('claim', () => repository.claim(sessionId, key, lease)));
      if (!claimed) {
        const latest = await repository.item(sessionId, key);
        if (latest?.state === 'ready') return json(res, 200, { state: 'ready' });
        if (latest?.attempts >= 8 && !(Date.parse(latest.lease_until) > now())) throw fail(`This upload session has used all 8 checks for this document. Keep your draft. This counter does not reset after a few minutes; wait for the two-hour upload session to expire (about ${Math.max(1, Math.ceil((Date.parse(row.expires_at) - now()) / 60000))} minutes remaining) before starting again, or contact support.`, 409);
        throw fail('This document is already being checked. Wait for that check to finish before retrying; uploaded files are kept. An interrupted check can remain locked for up to 5 minutes.', 409);
      }
      const bytes = await measure('download', () => storage.download('franchise-quarantine', path));
      assertDocumentBytes(bytes, item);
      const original = new File([bytes], item.name, { type: item.content_type });
      const scan = await measure('scan', () => scanDocument(original));
      const rejected = ['rejected', 'infected'].includes(scan?.status);
      if (!isAcceptedScan(scan, allowUnscanned)) throw fail(rejected ? 'This document failed the security scan. Replace it with a safe file.' : 'Document scanning is temporarily unavailable. Your upload is kept for retry.', rejected ? 422 : 503);
      const normalized = await measure('normalize', () => normalizeDocumentImage(original));
      // Re-encoding strips image metadata, including location. Validate the output too.
      const finalScan = normalized === original ? scan : await measure('rescan', () => scanDocument(normalized));
      if (!isAcceptedScan(finalScan, allowUnscanned)) throw fail('The processed document did not pass security scanning. Please retry.', ['rejected', 'infected'].includes(finalScan?.status) ? 422 : 503);
      await measure('promote', () => storage.promote(path, normalized));
      const document = { path, name: normalized.name, contentType: normalized.type, size: normalized.size, scan: finalScan };
      if (!await measure('finish', () => repository.finish(sessionId, key, lease, document))) throw fail('The document check expired. Keep your draft and retry.', 409);
      return json(res, 200, { state: 'ready' });
    } catch (error) {
      if (claimed) await repository.release(sessionId, key, lease, error.status === 422).catch(() => { });
      if (error.status === 422) error.validationErrors = [{ step: 6, message: `${key}: ${error.message}` }];
      throw error;
    } finally { releaseCheck(); }
  };
}

export async function cleanupExpiredUploads({ repository, storage }) {
  let cleaned = 0;
  for (const row of await repository.expired(20)) {
    const items = await repository.items(row.id);
    const application = await repository.application(row.application_id);
    const referenced = new Set(Object.values(application?.document_paths || {}).map(doc => doc.path));
    const paths = items.map(item => documentPath(row.id, item.document_key));
    await storage.remove('franchise-quarantine', paths);
    // A submitted document can be referenced by correction history after replacement.
    if (row.state !== 'submitted') await storage.remove('franchise-documents', paths.filter(path => !referenced.has(path)));
    // Keep the row on any failure so the next run can reconcile ambiguous outcomes.
    await repository.removeSession(row.id);
    cleaned++;
  }
  return cleaned;
}
