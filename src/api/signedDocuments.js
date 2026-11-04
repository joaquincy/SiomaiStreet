// File bytes go directly to private storage, never through a Vercel Function.
export function validateUploadGrant(grant) {
  const invalid = () => new Error('The upload service returned an invalid authorization. Keep your draft and retry.');
  let endpoint;
  try { endpoint = new URL(grant.endpoint); } catch { throw invalid(); }
  if (!(endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname)))
    || endpoint.pathname !== '/storage/v1/upload/resumable' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
    || grant.bucket !== 'franchise-quarantine' || typeof grant.signature !== 'string' || !grant.signature
    || typeof grant.path !== 'string' || grant.path.includes('\\') || grant.path.split('/').some(part => !part || part === '.' || part === '..')) throw invalid();
  return endpoint;
}

export function uploadSignedDocument(file, grant, { signal, onProgress = () => {}, xhrFactory = () => new XMLHttpRequest() } = {}) {
  signal?.throwIfAborted();
  const endpoint = validateUploadGrant(grant);
  let destination;
  try { destination = new URL(grant.signedUrl); }
  catch { throw new Error('The upload service returned an invalid destination. Keep your draft and retry.'); }
  const sameProject = destination.origin === endpoint.origin ||
    (destination.protocol === 'https:' && endpoint.protocol === 'https:' &&
      /^[a-z0-9-]+\.supabase\.co$/.test(destination.hostname) &&
      endpoint.hostname === destination.hostname.replace('.supabase.co', '.storage.supabase.co') && !destination.port && !endpoint.port);
  const path = '/storage/v1/object/upload/sign/franchise-quarantine/' + grant.path.split('/').map(encodeURIComponent).join('/');
  if (!sameProject || destination.pathname !== path || destination.searchParams.get('token') !== grant.signature || destination.username || destination.password || destination.hash) {
    throw new Error('The upload service returned an invalid destination. Keep your draft and retry.');
  }
  return new Promise((resolve, reject) => {
    const xhr = xhrFactory(); let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null;
      xhr.upload.onprogress = null;
      if (error) reject(error); else resolve();
    };
    const abort = () => { finish(signal?.reason || new DOMException('Upload cancelled.', 'AbortError')); xhr.abort(); };
    try {
      xhr.open('PUT', destination.href);
      xhr.timeout = 120000;
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.onprogress = event => { if (!settled) onProgress(Math.min(file.size, Math.max(0, event.loaded))); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) { onProgress(file.size); finish(); }
        else finish(documentUploadError(file.name, xhr.status));
      };
      xhr.onerror = () => finish(documentUploadError(file.name, 0));
      xhr.ontimeout = () => finish(documentUploadError(file.name, 408));
      xhr.onabort = () => finish(signal?.reason || new DOMException('Upload cancelled.', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort(); else xhr.send(file);
    } catch { finish(documentUploadError(file.name, 0)); xhr.abort(); }
  });
}

export function documentUploadError(name, status = 0) {
  const reason = status === 401 || status === 403 ? 'Upload permission expired or was rejected. Retry to request fresh permission.'
    : status === 409 ? 'Storage reports an existing upload. Retry so we can check and reuse it.'
      : status === 413 ? 'Storage rejected the file size. Choose a file up to 10 MiB.'
        : status === 415 || status === 422 ? 'Storage rejected this document. Choose a supported PDF, JPG or PNG for this field.'
          : status === 429 ? 'Storage is busy. Wait a moment before retrying.'
            : status === 0 ? 'The browser could not reach document storage. Check your connection and retry.'
              : status === 408 ? 'The upload timed out. Retry on a stable connection.'
                : `Document storage rejected the upload (HTTP ${status}). Retry; if it continues, report this code to support.`;
  // Never include a provider body, signed URL or token in the error.
  return Object.assign(new Error(`${name}: ${reason} Your draft and completed files are kept.`), { status, uploadError: true });
}
