import { createHash, timingSafeEqual } from 'node:crypto';
import { DOCUMENT_KEYS, MAX_DOCUMENT_BYTES, UUID_PATTERN } from '../shared/application.js';
import { isAcceptedScan } from './documentScanner.js';

const fail = (message, status = 503) => Object.assign(new Error(message), { status });
const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function createUploadRepository(request) {
  const rpc = (name, body) => request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
  const first = async path => (await request(`/rest/v1/${path}`))?.[0] || null;
  return {
    application: id => first(`franchise_applications?select=id,request_hash,submitted_at,document_paths&id=eq.${id}&limit=1`),
    active: (id, hash) => first(`franchise_upload_sessions?application_id=eq.${id}&request_hash=eq.${hash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=1`),
    prepare: (id, hash, data, manifest, correction, retry) => rpc('prepare_franchise_upload', { p_application_id: id, p_request_hash: hash, p_data: data, p_manifest: manifest, p_correction: correction || null, p_retry: retry || null }),
    session: id => first(`franchise_upload_sessions?id=eq.${id}&limit=1`),
    items: id => request(`/rest/v1/franchise_upload_items?session_id=eq.${id}&order=document_key.asc&limit=10`),
    item: (id, key) => first(`franchise_upload_items?session_id=eq.${id}&document_key=eq.${key}&limit=1`),
    claim: (id, key, lease) => rpc('claim_franchise_upload', { p_session: id, p_key: key, p_lease: lease }),
    finish: (id, key, lease, document) => rpc('finish_franchise_upload', { p_session: id, p_key: key, p_lease: lease, p_document: document }),
    release: (id, key, lease, rejected) => request(`/rest/v1/franchise_upload_items?session_id=eq.${id}&document_key=eq.${key}&lease_id=eq.${lease}`, { method: 'PATCH', body: JSON.stringify({ lease_id: null, lease_until: null, ...(rejected ? { state: 'rejected' } : {}) }) }),
    finalize: (id, allow) => rpc('finalize_franchise_upload', { p_session: id, p_allow_unscanned: allow }),
    expired: limit => request(`/rest/v1/franchise_upload_sessions?cleanup_after=lt.${encodeURIComponent(new Date().toISOString())}&order=cleanup_after.asc&limit=${limit}`),
    removeSession: id => request(`/rest/v1/franchise_upload_sessions?id=eq.${id}`, { method: 'DELETE' }),
  };
}

export async function boundedDocumentBytes(response, maxBytes = MAX_DOCUMENT_BYTES) {
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    await response.body?.cancel(); throw fail('The stored document exceeds the size limit.', 422);
  }
  if (!response.body) throw fail('The uploaded document is empty.', 422);
  const reader = response.body.getReader(); const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw fail('The stored document exceeds the size limit.', 422);
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, total);
  } finally { await reader.cancel().catch(() => { }); reader.releaseLock(); }
}

export function createUploadStorage({ url, serviceKey, request, uploadFile, deleteStorageObjects, fetcher = fetch }) {
  const storageFetch = (path, options = {}) => fetcher(`${url}/storage/v1/${path}`, { signal: AbortSignal.timeout(30000), redirect: 'error', ...options, headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, ...options.headers } });
  const download = async (bucket, path) => {
    const response = await storageFetch(`object/${bucket}/${encodePath(path)}`);
    if (!response.ok) { await response.body?.cancel(); throw fail('The document is not available yet. Retry this application.', response.status === 404 ? 409 : 503); }
    return boundedDocumentBytes(response);
  };
  const exists = async (bucket, path) => {
    const response = await storageFetch(`object/info/${bucket}/${encodePath(path)}`);
    const body = await response.json().catch(() => ({}));
    if (response.ok) return true;
    if (response.status === 404 || String(body.statusCode) === '404' || body.code === 'NoSuchKey' || body.error === 'not_found') return false;
    throw fail('Storage availability could not be confirmed. Keep your draft and retry.');
  };
  return {
    download,
    exists: path => exists('franchise-quarantine', path),
    sign: async path => {
      const result = await request(`/storage/v1/object/upload/sign/franchise-quarantine/${encodePath(path)}`, { method: 'POST', body: '{}', headers: { 'x-upsert': 'false' } });
      const token = new URL(`${url}/storage/v1${result.url}`).searchParams.get('token');
      if (!token) throw fail('Upload authorization could not be created.');
      const endpoint = new URL(url);
      if (/^[a-z0-9-]+\.supabase\.co$/.test(endpoint.hostname)) endpoint.hostname = endpoint.hostname.replace('.supabase.co', '.storage.supabase.co');
      endpoint.pathname = '/storage/v1/upload/resumable';
      return { endpoint: endpoint.href, signature: token };
    },
    promote: async (path, file) => {
      // Stable immutable paths make a crash between Storage and Postgres recoverable.
      const sameExisting = async () => digest(await download('franchise-documents', path)) === digest(Buffer.from(await file.arrayBuffer()));
      if (await exists('franchise-documents', path)) {
        if (!await sameExisting()) throw fail('Stored document mismatch. The application has been kept for safe retry.');
        return;
      }
      try { await uploadFile('franchise-documents', path, file, file.type); }
      catch (error) {
        if (!await exists('franchise-documents', path) || !await sameExisting()) throw error;
      }
    },
    remove: deleteStorageObjects,
  };
}

export function maintenanceAuthorized(supplied, secret) {
  if (typeof secret !== 'string' || secret.length < 32 || typeof supplied !== 'string') return false;
  return timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(`Bearer ${secret}`).digest());
}

export function createReviewerDocumentHandler({ url, serviceKey, request, rate, json, fetcher = fetch, allowUnscannedDocuments = false }) {
  return async (req, res, id, key) => {
    if (!UUID_PATTERN.test(id) || !DOCUMENT_KEYS.includes(key)) throw fail('Document not found.', 404);
    if (!await rate(req)) throw fail('Too many document requests. Try again later.', 429);
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]{20,4096}$/.test(authorization)) throw fail('Sign in to your staff account.', 401);
    // Supabase validates the token; never trust roles/user IDs sent by the browser.
    const auth = await fetcher(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, authorization }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!auth.ok) { await auth.body?.cancel(); throw fail('Your staff session expired. Sign in again.', 401); }
    const user = await auth.json();
    if (!UUID_PATTERN.test(user.id)) throw fail('Invalid staff session.', 401);
    const permitted = await request(`/rest/v1/franchise_document_reviewers?user_id=eq.${user.id}&enabled=eq.true&limit=1`);
    if (!permitted?.length) throw fail('You do not have permission to review application documents.', 403);
    const rows = await request(`/rest/v1/franchise_applications?select=document_paths&id=eq.${id}&limit=1`);
    const document = rows?.[0]?.document_paths?.[key];
    if (!document?.path || !isAcceptedScan(document.scan, allowUnscannedDocuments)) throw fail('This document is not available for review.', 404);
    await request('/rest/v1/franchise_document_access_log', { method: 'POST', body: JSON.stringify({ user_id: user.id, application_id: id, document_key: key }) });
    const signed = await request(`/storage/v1/object/sign/franchise-documents/${encodePath(document.path)}`, { method: 'POST', body: JSON.stringify({ expiresIn: 60 }) });
    if (!signed?.signedURL?.startsWith('/object/sign/')) throw fail('The private document link could not be created.');
    json(res, 200, {
      url: `${url}/storage/v1${signed.signedURL}`, expiresIn: 60, name: document.name, contentType: document.contentType,
      scan: document.scan, warning: document.scan.status === 'skipped' ? 'This document has not been virus-checked.' : null
    });
  };
}
