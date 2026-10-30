import { createHash, randomUUID } from 'node:crypto';
import { MAX_APPLICATION_BYTES } from './applicationSecurity.js';
import { normalizeDocumentImage } from './documentImages.js';
import { CONTRACT_VERSION, DOCUMENT_KEYS, UUID_PATTERN, sanitizeApplication, validateApplication } from '../shared/application.js';

const fail = (message, status = 400, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const receipt = row => ({ version: CONTRACT_VERSION, id: row.id, status: 'submitted', submittedAt: row.submitted_at });

// Inject storage and database access so tests use this handler without live credentials.
export function createApplicationHandler({ readMultipart, repository, uploadFile, deleteStorageObjects, rateLimit, json, admit, scanDocument, verifyStorage, reportCleanupFailure = () => {}, receiptDetails = () => ({}) }) {
  if (![admit, scanDocument, verifyStorage].every(fn => typeof fn === 'function')) throw new Error('Application security dependencies are required.');
  return async (req, res) => {
    const release = await admit(req, res);
    try {
    await verifyStorage();
    const form = await readMultipart(req, { maxBytes: MAX_APPLICATION_BYTES });
    // Body ingress remains subject to the short socket timeout. Scans and
    // private-storage calls have their own timeouts after ingress completes.
    req.setTimeout?.(600000);
    const requestId = form.get('requestId');
    if (form.get('version') !== String(CONTRACT_VERSION) || !UUID_PATTERN.test(requestId)) throw fail('This application request is invalid. Reload and try again.');
    for (const key of ['version','requestId','applicationData']) if (form.getAll(key).length !== 1) throw fail(`Expected one ${key} field.`);
    const raw = form.get('applicationData');
    if (typeof raw !== 'string' || raw.length > 300000) throw fail('Application data is missing or too large.');
    let data;
    try { data = JSON.parse(raw); } catch { throw fail('Application data is invalid.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw fail('Application data is invalid.');
    const documents = {};
    for (const [key, file] of form.entries()) {
      if (['version','requestId','applicationData'].includes(key)) continue;
      if (!DOCUMENT_KEYS.includes(key) || !(file instanceof File) || documents[key]) throw fail('Unsupported or duplicate document field.');
      documents[key] = file;
    }
    const validationErrors = validateApplication({...data, documents});
    if (validationErrors.length) throw fail('Please correct the application fields listed below.', 422, { validationErrors });
    data = sanitizeApplication(data);
    delete data.documents;
    data.email = data.email.trim().toLowerCase();
    data.confirmEmail = data.confirmEmail.trim().toLowerCase();
    const hash = createHash('sha256').update(JSON.stringify(canonical(data)));
    for (const key of Object.keys(documents).sort()) {
      const file = documents[key];
      const bytes = Buffer.from(await file.arrayBuffer());
      const signatureMatches = file.type === 'application/pdf' ? bytes.subarray(0,5).toString('ascii') === '%PDF-'
        : file.type === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
          : bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!signatureMatches) throw fail(`The document ${key} does not match its file type.`);
      hash.update(JSON.stringify([key, file.name, file.type, file.size]));
      hash.update(bytes);
    }
    const requestHash = hash.digest('hex');
    const checkExisting = row => {
      if (row.request_hash !== requestHash) throw fail('This request was already submitted with different answers. Keep the original receipt and contact us for a correction.', 409);
      return { ...receipt(row), ...receiptDetails(row) };
    };
    const existing = await repository.find(requestId);
    if (existing) return json(res, 200, checkExisting(existing));
    if (!await rateLimit(req, 4, 60 * 60 * 1000)) {
      res.setHeader('Retry-After', '3600');
      throw fail('Too many applications. Please wait before retrying.', 429);
    }
    const attempt = randomUUID();
    const paths = [];
    const quarantinePaths = [];
    const scans = {};
    const cleanup = async (bucket, objects) => {
      if (!objects.length) return;
      try { await deleteStorageObjects(bucket, objects); }
      catch { reportCleanupFailure({ bucket, requestId, attempt }); }
    };
    const documentPaths = {};
    let insertAttempted = false;
    try {
      // No document enters the reviewer bucket until EVERY document passes scanning.
      for (const [key, originalFile] of Object.entries(documents)) {
        let file;
        try { file = await normalizeDocumentImage(originalFile); }
        catch(error) { throw fail(error.message, error.status || 422, {validationErrors:[{step:6,message:`Replace ${key}: ${error.message}`}]}); }
        documents[key] = file;
        const path = `${requestId}/${attempt}/${key}`;
        quarantinePaths.push(path);
        await uploadFile('franchise-quarantine', path, file, file.type);
        const scan = await scanDocument(file);
        if (scan?.status === 'rejected') throw fail('A document failed security checks. Replace it and retry.', 422, { validationErrors: [{ step: 6, message: `Replace ${key}: document failed security checks.` }] });
        if (scan?.status !== 'clean' || scan.engine !== 'ClamAV' || !Number.isFinite(Date.parse(scan.scannedAt))) throw fail('Document scanning is unavailable. Keep your draft and retry.', 503);
        scans[key] = scan;
      }
      for (const [key, file] of Object.entries(documents)) {
        // Attempt-specific paths prevent a losing concurrent request from deleting the winner's files.
        const path = `${requestId}/${attempt}/${key}`;
        paths.push(path);
        await uploadFile('franchise-documents', path, file, file.type);
        documentPaths[key] = { path, name: file.name, contentType: file.type, size: file.size, scan: scans[key] };
      }
      const applicationData = { ...data };
      delete applicationData.confirmEmail;
      const row = { id: requestId, request_hash: requestHash, applicant_name: `${data.firstName.trim()} ${data.lastName.trim()}`, applicant_email: data.email, applicant_phone: data.primaryPhone, target_region: data.targetRegion, target_city: data.targetCity, selected_package: data.selectedPackage, application_data: applicationData, document_paths: documentPaths, status: 'submitted' };
      insertAttempted = true;
      const saved = await repository.insert(row);
      if (!saved || saved.id !== requestId || !saved.submitted_at) throw fail('Receipt could not be confirmed.', 503);
      return json(res, 201, { ...receipt(saved), ...receiptDetails(saved) });
    } catch (error) {
      if (insertAttempted) {
        // A timeout may mean COMMIT succeeded. Never delete files merely because its response was lost.
        const saved = await repository.find(requestId).catch(() => null);
        if (saved) {
          const winnerPaths = new Set(Object.values(saved.document_paths || {}).map(file => file.path));
          await cleanup('franchise-documents', paths.filter(path => !winnerPaths.has(path)));
          return json(res, 200, checkExisting(saved));
        }
        // Ambiguous commit: preserve files for reconciliation; retry with the SAME request ID.
        reportCleanupFailure({ bucket: 'franchise-documents', requestId, attempt, reason: 'ambiguous-commit' });
      } else {
        await cleanup('franchise-documents', paths);
      }
      throw error;
    } finally {
      await cleanup('franchise-quarantine', quarantinePaths);
    }
    } finally { release(); }
  };
}
