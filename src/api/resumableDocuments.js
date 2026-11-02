// Loaded only when a document actually needs uploading, outside the initial page bundle.
const resumes = new Map();
export const clearUploadTransfers = () => resumes.clear();

export async function uploadDocument(file, grant, { signal, onProgress = () => { } }) {
  signal?.throwIfAborted();
  const { Upload } = await import('tus-js-client');
  signal?.throwIfAborted();
  const endpoint = new URL(grant.endpoint);
  if (!(endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname)))
    || endpoint.pathname !== '/storage/v1/upload/resumable' || grant.bucket !== 'franchise-quarantine'
    || typeof grant.signature !== 'string' || !grant.signature) throw new Error('The upload service returned an invalid authorization. Keep your draft and retry.');
  const cacheKey = `${endpoint.origin}/${grant.path}`;
  for (const [key, value] of resumes) if (value.expires < Date.now()) resumes.delete(key);
  while (resumes.size >= 20) resumes.delete(resumes.keys().next().value);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true; clearTimeout(deadline); signal?.removeEventListener('abort', abort);
      if (!error) resumes.delete(cacheKey);
      if (error) reject(error); else resolve();
    };
    const upload = new Upload(file, {
      endpoint: endpoint.href,
      uploadUrl: resumes.get(cacheKey)?.url || null,
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      retryDelays: [0, 1500, 3000, 6000],
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: true,
      headers: { 'x-signature': grant.signature, 'x-upsert': 'false' },
      metadata: { bucketName: grant.bucket, objectName: grant.path, contentType: file.type, cacheControl: '0' },
      onShouldRetry: error => {
        const status = error.originalResponse?.getStatus() || 0;
        return !signal?.aborted && (status === 0 || status === 408 || status === 423 || status === 429 || status >= 500);
      },
      onBeforeRequest: request => {
        signal?.throwIfAborted();
        if (new URL(request.getURL()).origin !== endpoint.origin) throw new Error('Invalid upload destination.');
      },
      onUploadUrlAvailable: () => {
        if (upload.url) resumes.set(cacheKey, { url: upload.url, expires: Date.now() + 2 * 60 * 60 * 1000 });
      },
      onProgress: sent => { if (!settled) onProgress(Math.min(file.size, Math.max(0, sent))); },
      onSuccess: () => finish(),
      // Provider error strings may contain signed URLs; never display those strings.
      onError: () => finish(new Error(`Upload interrupted for ${file.name}. Keep your draft and retry; completed files are kept.`)),
    });
    const abort = () => {
      void upload.abort().catch(() => { });
      finish(signal?.reason || new DOMException('Upload cancelled.', 'AbortError'));
    };
    const deadline = setTimeout(() => {
      void upload.abort().catch(() => { });
      finish(new Error('The document upload timed out. Keep your draft and retry on a stable connection.'));
    }, 10 * 60 * 1000);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    else {
      try { upload.start(); }
      catch { void upload.abort().catch(() => {}); finish(new Error('The document upload could not start. Keep your draft and retry.')); }
    }
  });
}
