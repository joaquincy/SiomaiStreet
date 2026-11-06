import { CONTRACT_VERSION, DOCUMENT_KEYS, MAX_DOCUMENT_BYTES, documentTypes, isValidReceipt, UUID_PATTERN, omitPassportBack } from '../../shared/application.js';
import { uploadDocument, clearUploadTransfers } from './resumableDocuments.js';
import { rateAwareFetch, rateFeedback } from '../utils/rateLimits.js';
import { ONBOARDING_DOCUMENT_KEY } from '../../shared/applicationFollowup.js';
import { documentFingerprint } from '../utils/documentFingerprint.js';
import { duplicateIdSides, DUPLICATE_ID_MESSAGE } from '../../shared/applicationQuality.js';

const base = '/api/franchise-applications/uploads';

export async function documentManifest(documents, signal, onboarding = false) {
  const entries = Object.entries(documents || {});
  if (!entries.length || entries.length > DOCUMENT_KEYS.length) throw new Error('Select the required application documents.');
  const manifest = [];
  // Hash one file at a time rather than reading all ten 10 MiB documents together.
  for (const [key, file] of entries) {
    signal?.throwIfAborted();
    if (!(onboarding ? key === ONBOARDING_DOCUMENT_KEY : DOCUMENT_KEYS.includes(key)) || !(file instanceof File) || !file.size || file.size > MAX_DOCUMENT_BYTES || !documentTypes(key).includes(file.type)) throw new Error(`Select a supported document up to 10 MiB for ${key}.`);
    manifest.push({ key, name: file.name, type: file.type, size: file.size, sha256: await documentFingerprint(file, signal) });
  }
  return manifest;
}

export async function submitFranchiseApplication({ formData, requestId, emailProof, fetcher = rateAwareFetch, onProgress = () => { }, turnstileToken = '', signal, uploader = uploadDocument, correction, onboarding, changeEvidence }) {
  const privateRequest = changeEvidence || onboarding || correction;
  const finishFeedback = rateFeedback.beginBatch();
  const controller = new AbortController();
  const activeSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const request = async (path, body, token, timeout = 30000) => {
    activeSignal.throwIfAborted();
    let response;
    try {
      response = await fetcher(path, {
        method: 'POST', signal: AbortSignal.any([activeSignal, AbortSignal.timeout(timeout)]),
        headers: { 'content-type': 'application/json', Accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : { 'x-turnstile-token': turnstileToken }) }, body: JSON.stringify(body),
      });
    } catch {
      activeSignal.throwIfAborted();
      throw new Error('We could not confirm receipt. Keep this application and retry; completed documents will be reused and the same request will not create a duplicate.');
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(result?.error || 'The request failed. Keep your draft and retry.'), { status: response.status, validationErrors: result?.validationErrors });
    return result;
  };
  const confirmReceipt = result => {
    const valid = privateRequest ? result?.id === privateRequest.id && result?.requestId === requestId && result?.status === 'received' : isValidReceipt(result, requestId);
    if (!valid) throw new Error('The service did not return a valid receipt. Your selected documents have been kept. Please retry.');
    clearUploadTransfers();
    return result;
  };
  try {
    const { documents: selectedDocuments = {}, ...applicationData } = formData;
    const documents = privateRequest ? selectedDocuments : omitPassportBack(selectedDocuments, applicationData.govIdType);
    // Do not transmit a former partner's details, even from an older caller/draft.
    if (applicationData.hasCoApplicant !== 'yes') delete applicationData.coApplicant;
    onProgress('Preparing documents for secure upload…');
    const manifest = await documentManifest(documents, activeSignal, Boolean(onboarding));
    if (!privateRequest && duplicateIdSides(applicationData, Object.fromEntries(manifest.map(item => [item.key, item.sha256])))) throw Object.assign(new Error(DUPLICATE_ID_MESSAGE), { validationErrors: [{ step: 6, message: DUPLICATE_ID_MESSAGE }] });
    if (privateRequest && (!UUID_PATTERN.test(privateRequest.applicationId) || !UUID_PATTERN.test(privateRequest.id))) throw new Error('Invalid document request. Refresh your application status.');
    const startEndpoint = privateRequest ? `/api/application-status/${privateRequest.applicationId}/${changeEvidence ? 'changes' : onboarding ? 'onboarding' : 'corrections'}/${privateRequest.id}/uploads` : base;
    const session = await request(startEndpoint, { version: CONTRACT_VERSION, requestId, applicationData, manifest, ...(!privateRequest ? { emailProof } : {}), ...(onboarding ? { onboardingRevision: onboarding.revision } : {}) }, privateRequest?.accessCode);
    if (session?.receipt) return confirmReceipt(session.receipt);
    if (!UUID_PATTERN.test(session?.sessionId) || !/^[A-Za-z0-9_-]{43}$/.test(session?.token || '') || !Number.isFinite(Date.parse(session.expiresAt))) throw new Error('The service returned an invalid upload session. Your draft has been kept. Please retry.');
    const endpoint = `${base}/${session.sessionId}`;
    const completed = new Set();
    const transferred = Object.fromEntries(manifest.map(item => [item.key, 0]));
    const total = manifest.reduce((sum, item) => sum + item.size, 0);
    let lastProgress = '';
    const reportProgress = () => {
      if (activeSignal.aborted) return;
      const percent = Math.floor(Object.values(transferred).reduce((sum, value) => sum + value, 0) / total * 100);
      const message = `Uploading documents · ${percent}% transferred. Checking documents · ${completed.size} of ${manifest.length} complete.`;
      // XHR emits many byte events; only update React/live regions when visible progress changes.
      if (message !== lastProgress) { lastProgress = message; onProgress(message); }
    };
    let next = 0;
    const uploadNext = async () => {
      while (next < manifest.length) {
        activeSignal.throwIfAborted();
        const item = manifest[next++];
        const grant = await request(`${endpoint}/authorize/${item.key}`, {}, session.token);
        if (grant?.state === 'ready') completed.add(item.key);
        else if (grant?.state === 'upload') {
          try { await uploader(documents[item.key], grant, {
            signal: activeSignal, onProgress: bytes => {
              transferred[item.key] = Math.min(item.size, Math.max(0, Number.isFinite(bytes) ? bytes : 0));
              reportProgress();
            }
          }); } catch (error) {
            activeSignal.throwIfAborted();
            // A lost storage response or competing retry may have completed the file.
            // Reconcile once before declaring failure; final server checks still verify it.
            let recovered;
            try { recovered = await request(`${endpoint}/authorize/${item.key}`, {}, session.token); }
            catch { throw error; }
            if (recovered?.state === 'ready') completed.add(item.key);
            else if (recovered?.state !== 'uploaded') throw error;
          }
        } else if (grant?.state !== 'uploaded') throw new Error('Upload authorization was incomplete. Keep your draft and retry.');
        transferred[item.key] = item.size;
        reportProgress();
        // Check each document as soon as it arrives, while the other worker progresses.
        // Two end-to-end workers bound upload bandwidth, server memory and database pressure.
        if (!completed.has(item.key)) {
          const checked = await request(`${endpoint}/check/${item.key}`, {}, session.token, 180000);
          if (checked?.state !== 'ready') throw new Error('A document check was not confirmed. Keep your draft and retry.');
          completed.add(item.key);
          reportProgress();
        }
      }
    };
    const workers = Array.from({ length: Math.min(2, manifest.length) }, () => uploadNext().catch(error => { controller.abort(error); throw error; }));
    const outcomes = await Promise.allSettled(workers);
    const failed = outcomes.find(outcome => outcome.status === 'rejected');
    if (failed) throw failed.reason;
    activeSignal.throwIfAborted();
    onProgress('Documents checked. Confirming your submission…');
    return confirmReceipt(await request(`${endpoint}/finalize`, {}, session.token));
  } finally { controller.abort(); finishFeedback(); }
}
