import { CONTRACT_VERSION, DOCUMENT_KEYS, MAX_DOCUMENT_BYTES, documentTypes, isValidReceipt, UUID_PATTERN } from '../../shared/application.js';
import { uploadDocument, clearUploadTransfers } from './resumableDocuments.js';

const base = '/api/franchise-applications/uploads';
const hashes = new WeakMap();

export async function documentManifest(documents, signal) {
  const entries = Object.entries(documents || {});
  if (!entries.length || entries.length > DOCUMENT_KEYS.length) throw new Error('Select the required application documents.');
  const manifest = [];
  // Hash one file at a time rather than reading all ten 10 MiB documents together.
  for (const [key, file] of entries) {
    signal?.throwIfAborted();
    if (!DOCUMENT_KEYS.includes(key) || !(file instanceof File) || !file.size || file.size > MAX_DOCUMENT_BYTES || !documentTypes(key).includes(file.type)) throw new Error(`Select a supported document up to 10 MiB for ${key}.`);
    if (!hashes.has(file)) {
      const bytes = await file.arrayBuffer();
      signal?.throwIfAborted();
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      hashes.set(file, Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join(''));
    }
    manifest.push({ key, name: file.name, type: file.type, size: file.size, sha256: hashes.get(file) });
  }
  return manifest;
}

export async function submitFranchiseApplication({ formData, requestId, fetcher = fetch, onProgress = () => { }, turnstileToken = '', signal, uploader = uploadDocument, correction }) {
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
    const valid = correction ? result?.id === correction.id && result?.requestId === requestId && result?.status === 'received' : isValidReceipt(result, requestId);
    if (!valid) throw new Error('The service did not return a valid receipt. Your selected documents have been kept. Please retry.');
    clearUploadTransfers();
    return result;
  };
  try {
    const { documents = {}, ...applicationData } = formData;
    onProgress('Preparing documents for secure upload…');
    const manifest = await documentManifest(documents, activeSignal);
    if (correction && (!UUID_PATTERN.test(correction.applicationId) || !UUID_PATTERN.test(correction.id))) throw new Error('Invalid replacement request. Refresh your application status.');
    const startEndpoint = correction ? `/api/application-status/${correction.applicationId}/corrections/${correction.id}/uploads` : base;
    const session = await request(startEndpoint, { version: CONTRACT_VERSION, requestId, applicationData, manifest }, correction?.accessCode);
    if (session?.receipt) return confirmReceipt(session.receipt);
    if (!UUID_PATTERN.test(session?.sessionId) || !/^[A-Za-z0-9_-]{43}$/.test(session?.token || '') || !Number.isFinite(Date.parse(session.expiresAt))) throw new Error('The service returned an invalid upload session. Your draft has been kept. Please retry.');
    const endpoint = `${base}/${session.sessionId}`;
    const completed = new Set();
    const transferred = Object.fromEntries(manifest.map(item => [item.key, 0]));
    const total = manifest.reduce((sum, item) => sum + item.size, 0);
    let next = 0;
    const uploadNext = async () => {
      while (next < manifest.length) {
        activeSignal.throwIfAborted();
        const item = manifest[next++];
        const grant = await request(`${endpoint}/authorize/${item.key}`, {}, session.token);
        if (grant?.state === 'ready') completed.add(item.key);
        else if (grant?.state === 'upload') {
          await uploader(documents[item.key], grant, {
            signal: activeSignal, onProgress: bytes => {
              transferred[item.key] = bytes;
              onProgress(`Uploading documents · ${Math.floor(Object.values(transferred).reduce((sum, value) => sum + value, 0) / total * 100)}% transferred`);
            }
          });
        } else if (grant?.state !== 'uploaded') throw new Error('Upload authorization was incomplete. Keep your draft and retry.');
        transferred[item.key] = item.size;
      }
    };
    const workers = Array.from({ length: Math.min(2, manifest.length) }, () => uploadNext().catch(error => { controller.abort(error); throw error; }));
    const outcomes = await Promise.allSettled(workers);
    const failed = outcomes.find(outcome => outcome.status === 'rejected');
    if (failed) throw failed.reason;
    for (const [index, item] of manifest.entries()) {
      activeSignal.throwIfAborted();
      onProgress(`Checking documents · ${index + 1} of ${manifest.length}. Please keep this page open.`);
      if (!completed.has(item.key)) {
        const checked = await request(`${endpoint}/check/${item.key}`, {}, session.token, 180000);
        if (checked?.state !== 'ready') throw new Error('A document check was not confirmed. Keep your draft and retry.');
      }
    }
    onProgress('Documents checked. Confirming your submission…');
    return confirmReceipt(await request(`${endpoint}/finalize`, {}, session.token));
  } finally { controller.abort(); }
}
