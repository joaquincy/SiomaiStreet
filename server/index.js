import { createTurnstileVerifier, createTransactionalSender } from './transactionalServices.js';
import { startNotificationWorker } from './notificationWorker.js';
import { createNotificationWebhook } from './notificationWebhook.js';
import { readMultipart } from './multipart.js';
import { createStoreLocationsReader } from './storeLocations.js';
import { contactConfiguration, publicContactConfiguration, createContactHandler } from './contact.js';
import { portalAccess, createPortalHandler } from './applicationPortal.js';
import { createApplicationHandler } from './applications.js';
import { createApplicationAdmission, createSharedApplicationRateLimit, clientIP } from './applicationSecurity.js';
import { isDocumentScanDisabled, createSkippedScanner, createDocumentScanner } from './documentScanner.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const envFiles = ['.env.local', '.env'];

for (const file of envFiles) {
  try {
    const contents = await readFile(join(root, file), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const port = Number(process.env.API_PORT || 3001);

const allowedReviewTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const requestCounts = new Map();

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

const rateLimit = (req, limit, windowMs) => {
  const forwarded = process.env.TRUST_PROXY === 'true' ? req.headers['x-forwarded-for'] : null;
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || req.socket.remoteAddress || 'unknown';
  const key = `${ip}:${Math.floor(Date.now() / windowMs)}`;
  const count = (requestCounts.get(key) || 0) + 1;
  requestCounts.set(key, count);
  if (requestCounts.size > 5000) {
    for (const item of requestCounts.keys()) {
      if (!item.endsWith(`:${Math.floor(Date.now() / windowMs)}`)) requestCounts.delete(item);
    }
  }
  return count <= limit;
};

const supabaseRequest = async (path, options = {}) => {
  if (!supabaseUrl || !serviceKey) throw new Error('Server Supabase credentials are not configured.');
  const response = await fetch(`${supabaseUrl}${path}`, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      ...(options.body instanceof Buffer ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
  });
  const responseText = await response.text();
  if (!response.ok) {
    const error = new Error(`Supabase request failed (${response.status}).`);
    error.status = response.status;
    error.detail = responseText.slice(0, 500);
    throw error;
  }
  return responseText ? JSON.parse(responseText) : null;
};

const safeFileName = (name) => name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100) || 'upload';
const readStoreLocations = createStoreLocationsReader(supabaseRequest);
const storagePath = (bucket, path) => `${supabaseUrl}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;

const uploadFile = async (bucket, path, file, contentType) => {
  const bytes = Buffer.from(await file.arrayBuffer());
  const isPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const signatureMatches = contentType === 'application/pdf' ? isPdf
    : contentType === 'image/jpeg' ? isJpeg
      : contentType === 'image/png' ? isPng
        : contentType === 'image/webp' ? isWebp : false;
  if (!signatureMatches) throw Object.assign(new Error(`The file ${file.name} does not match its file type.`), { status: 400 });
  const response = await fetch(storagePath(bucket, path), {
    signal: AbortSignal.timeout(30000),
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': contentType,
      'x-upsert': 'false',
    },
    body: bytes,
  });
  if (!response.ok) {
    const error = new Error(`Could not upload ${file.name}.`);
    error.status = response.status;
    error.detail = (await response.text()).slice(0, 500);
    throw error;
  }
};

const deleteStorageObjects = async (bucket, paths) => {
  if (!paths.length) return;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
    signal: AbortSignal.timeout(15000),
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!response.ok) throw new Error('Storage cleanup failed.');
};

const handleReviewsGet = async (url, res) => {
  const sort = url.searchParams.get('sort');
  const order = sort === 'rating' ? 'rating.desc,created_at.desc'
    : sort === 'helpful' ? 'helpful_count.desc,created_at.desc'
      : 'created_at.desc';
  const rows = await supabaseRequest(
    `/rest/v1/reviews?select=id,branch_id,branch:branches(branch_name),display_name,rating,review_text,photo_path,tags,helpful_count,is_verified,created_at&status=eq.published&order=${encodeURIComponent(order)}&limit=100`,
  );
  json(res, 200, rows.map((row) => ({
    ...row,
    name: row.display_name,
    text: row.review_text,
    branchId: row.branch_id,
    branchName: row.branch?.branch_name || null,
    date: new Date(row.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
    helpful: row.helpful_count,
    verified: row.is_verified,
    image: row.photo_path ? `${supabaseUrl}/storage/v1/object/public/review-photos/${row.photo_path.split('/').map(encodeURIComponent).join('/')}` : null,
  })));
};

const handleBranchesGet = async (_req, res) => {
  const branches = await supabaseRequest('/rest/v1/branches?select=branch_id,branch_name,branch_address&branch_status=eq.Active&order=branch_name.asc&limit=500');
  json(res, 200, { branches: branches || [] });
};

const handleReviewPost = async (req, res) => {
  if (!rateLimit(req, 8, 60 * 60 * 1000)) return json(res, 429, { error: 'Too many review submissions. Please try again later.' });
  const form = await readMultipart(req);
  const displayName = String(form.get('displayName') || '').trim();
  const reviewText = String(form.get('text') || '').trim();
  const rating = Number(form.get('rating'));
  const branchId = Number(form.get('branchId'));
  const photo = form.get('photo');
  if (displayName.length < 1 || displayName.length > 100) throw Object.assign(new Error('Enter a display name (up to 100 characters).'), { status: 400 });
  if (reviewText.length < 1 || reviewText.length > 5000) throw Object.assign(new Error('Enter a review up to 5,000 characters.'), { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw Object.assign(new Error('Choose a rating from 1 to 5.'), { status: 400 });
  if (!Number.isSafeInteger(branchId) || branchId <= 0) throw Object.assign(new Error('Choose an active branch.'), { status: 400 });
  const activeBranches = await supabaseRequest(`/rest/v1/branches?select=branch_id&branch_id=eq.${branchId}&branch_status=eq.Active&limit=1`);
  if (!activeBranches?.length) throw Object.assign(new Error('That branch is no longer available for reviews.'), { status: 400 });
  let photoPath = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 5 * 1024 * 1024 || !allowedReviewTypes.has(photo.type)) throw Object.assign(new Error('Review photos must be JPG, PNG, or WebP files under 5 MB.'), { status: 400 });
    photoPath = `${randomUUID()}/${safeFileName(photo.name)}`;
    await uploadFile('review-photos', photoPath, photo, photo.type);
  }
  try {
    const rows = await supabaseRequest('/rest/v1/reviews', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ branch_id: branchId, display_name: displayName, rating, review_text: reviewText, photo_path: photoPath, status: 'pending', helpful_count: 0, is_verified: false }),
    });
    json(res, 201, { id: rows[0]?.id, status: 'pending' });
  } catch (error) {
    if (photoPath) await deleteStorageObjects('review-photos', [photoPath]);
    throw error;
  }
};

const trustedProxies = (process.env.TRUSTED_PROXY_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);
const applicationRate = createSharedApplicationRateLimit({
  secret: process.env.APPLICATION_RATE_SECRET,
  rpc: body => supabaseRequest('/rest/v1/rpc/consume_application_rate', { method: 'POST', body: JSON.stringify(body) }),
});
const turnstileEnabled = process.env.NODE_ENV === 'production' || process.env.TURNSTILE_ENABLED !== 'false';
const verifyTurnstile = createTurnstileVerifier({ secret: process.env.TURNSTILE_SECRET_KEY, hostnames: (process.env.TURNSTILE_HOSTNAMES || '').split(',').map(s => s.trim()).filter(Boolean) });
const verifyPublic = action => async req => {
 if (turnstileEnabled) await verifyTurnstile({ token: req.headers['x-turnstile-token'], action });
};
const handleEmailWebhook = createNotificationWebhook({ secret: process.env.RESEND_WEBHOOK_SECRET, request: supabaseRequest, json });
const access = portalAccess(process.env.APPLICATION_PORTAL_SECRET);
const contactConfig = contactConfiguration(process.env);
const handleContactPost = createContactHandler({
  configuration: contactConfig, json, verify: verifyPublic('inquiry'),
  allowedOrigins: (process.env.CONTACT_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
  rate: (req, scope, limit, email) => applicationRate(email || clientIP(req, trustedProxies), scope, limit),
  repository: {
    find: async id => (await supabaseRequest(`/rest/v1/contact_inquiries?select=id,request_hash,received_at&id=eq.${id}&limit=1`))?.[0],
    insert: async row => (await supabaseRequest('/rest/v1/contact_inquiries?select=id,request_hash,received_at', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify(row) }))?.[0],
  },
});
const scanDisabled = isDocumentScanDisabled(process.env);
if (scanDisabled) console.warn('⚠ DOCUMENT SCANNING IS DISABLED. Documents will NOT be virus-checked.');
const scanDocument = scanDisabled
  ? createSkippedScanner()
  : createDocumentScanner({ host: process.env.CLAMD_HOST, port: Number(process.env.CLAMD_PORT || 3310) });
const applicationAdmission = createApplicationAdmission({ checkRate:applicationRate, trustedProxies });
const protectedApplicationAdmission = createApplicationAdmission({ checkRate:applicationRate, trustedProxies, verify: verifyPublic('application') });
const verifyApplicationStorage = async () => {
  // Check portal configuration before accepting a new submission.
  access.receipt({id:'00000000-0000-4000-8000-000000000000',submitted_at:new Date().toISOString()});
  if (await supabaseRequest('/rest/v1/rpc/franchise_security_ready', { method:'POST', body:'{}' }) !== true) throw Object.assign(new Error('Private storage is not ready.'), {status:503});
  // Fail before accepting files if the tracking migration is absent.
  await supabaseRequest('/rest/v1/franchise_corrections?select=id&limit=0');
  await supabaseRequest('/rest/v1/franchise_applications?select=portal_access_revoked&limit=0');
};
const handlePortal = createPortalHandler({
  access, json, readMultipart, uploadFile, deleteStorageObjects,
  rate: req => applicationRate(clientIP(req, trustedProxies), 'portal', 60),
  admit: applicationAdmission,
  verifyStorage: verifyApplicationStorage,
  scanDocument,
  allowUnscannedDocuments: scanDisabled,
  reportCleanupFailure: event => console.error('Correction reconciliation required:', JSON.stringify(event)),
  repository: {
    find: async id => (await supabaseRequest('/rest/v1/franchise_applications?select=id,status,submitted_at,updated_at,portal_access_revoked&id=eq.'+id+'&limit=1'))?.[0],
    requests: id => supabaseRequest('/rest/v1/franchise_corrections?select=*&application_id=eq.'+id+'&order=created_at.asc&limit=100'),
    replace: body => supabaseRequest('/rest/v1/rpc/receive_franchise_document',{method:'POST',body:JSON.stringify(body)}),
  },
});
const handleApplicationPost = createApplicationHandler({
  receiptDetails: access.receipt,
  readMultipart, uploadFile, deleteStorageObjects, json,
  admit: protectedApplicationAdmission,
  rateLimit: req => applicationRate(clientIP(req, trustedProxies), 'new-application', 4),
  scanDocument,
  allowUnscannedDocuments: scanDisabled,
  verifyStorage: verifyApplicationStorage,
  reportCleanupFailure: event => console.error('Application orphan cleanup required:', JSON.stringify(event)),
  repository: {
    find: async id => (await supabaseRequest('/rest/v1/franchise_applications?select=id,request_hash,submitted_at,document_paths&id=eq.' + id + '&limit=1'))?.[0] || null,
    insert: async row => (await supabaseRequest('/rest/v1/franchise_applications', {
      method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify(row),
    }))?.[0],
  },
});

const apiServer = createServer(async (req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('x-frame-options', 'DENY');
  const origin = req.headers.origin;
  if (origin && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    res.setHeader('access-control-allow-headers', 'content-type, authorization, x-turnstile-token');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/security-config' && req.method === 'GET') return json(res, 200, { enabled: turnstileEnabled, siteKey: process.env.TURNSTILE_SITE_KEY || '' });
    if (url.pathname === '/api/webhooks/resend' && req.method === 'POST') return await handleEmailWebhook(req,res);
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, configured: Boolean(supabaseUrl && serviceKey) });
    }
    if (url.pathname === '/api/branches' && req.method === 'GET') return await handleBranchesGet(req, res);
    if (url.pathname === '/api/contact-options' && req.method === 'GET') return json(res, 200, publicContactConfiguration(contactConfig));
    if (url.pathname === '/api/contact-inquiries' && req.method === 'POST') return await handleContactPost(req, res);
    if (url.pathname === '/api/store-locations' && req.method === 'GET') {
      try { return json(res, 200, await readStoreLocations()); }
      catch { return json(res, 503, { error: 'Store information is temporarily unavailable. Please try again shortly.' }); }
    }
    if (url.pathname === '/api/reviews' && req.method === 'GET') return await handleReviewsGet(url, res);
    if (url.pathname === '/api/reviews' && req.method === 'POST') return await handleReviewPost(req, res);
    const helpfulMatch = url.pathname.match(/^\/api\/reviews\/([0-9a-f-]{36})\/helpful$/i);
    if (helpfulMatch && req.method === 'POST') {
      if (!rateLimit(req, 60, 60 * 60 * 1000)) return json(res, 429, { error: 'Please wait before voting again.' });
      const result = await supabaseRequest('/rest/v1/rpc/increment_review_helpful', {
        method: 'POST',
        body: JSON.stringify({ review_id: helpfulMatch[1] }),
      });
      if (result === null) return json(res, 404, { error: 'Review not found.' });
      return json(res, 200, { helpful: result });
    }
    const portalMatch = url.pathname.match(/^\/api\/application-status\/([0-9a-f-]{36})(?:\/corrections\/([0-9a-f-]{36}))?$/i);
    if (portalMatch && ((!portalMatch[2] && req.method === 'GET') || (portalMatch[2] && req.method === 'POST'))) return await handlePortal(req,res,portalMatch[1],portalMatch[2]);
    if (url.pathname === '/api/franchise-applications' && req.method === 'POST') return await handleApplicationPost(req, res);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'API route not found.' });

    // In production, serve the Vite build from this same origin as the API.
    if (process.env.NODE_ENV === 'production' || process.env.SERVE_DIST === 'true') {
      const requested = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^([/\\]|\.\.(?:[/\\]|$))+/, '');
      const filePath = join(root, 'dist', requested);
      try {
        const body = await readFile(filePath);
        const contentType = requested.endsWith('.js') ? 'text/javascript'
          : requested.endsWith('.css') ? 'text/css'
            : requested.endsWith('.svg') ? 'image/svg+xml'
              : requested.endsWith('.png') ? 'image/png'
                : requested.endsWith('.jpg') || requested.endsWith('.jpeg') ? 'image/jpeg'
                  : requested.endsWith('.woff2') ? 'font/woff2'
                    : 'text/html';
        res.writeHead(200, { 'content-type': contentType });
        return res.end(body);
      } catch {
        const body = await readFile(join(root, 'dist', 'index.html'));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(body);
      }
    }
    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error('API request failed:', error.message, error.detail || '');
    return json(res, status, { error: status >= 500 ? 'The request could not be completed. Retry with the same application.' : error.message, ...(error.validationErrors ? { validationErrors: error.validationErrors } : {}) });
  }
});

apiServer.requestTimeout = 120000;
apiServer.headersTimeout = 15000;
apiServer.setTimeout(30000, socket => socket.destroy());
apiServer.listen(port, () => console.log(`Siomai Street API listening on port ${port}`));

if (process.env.EMAIL_WORKER_ENABLED === 'true') {
 if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.RESEND_WEBHOOK_SECRET) throw new Error('Email worker configuration is incomplete.');
 const stopNotifications = startNotificationWorker({ request: supabaseRequest, send: createTransactionalSender({ apiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM, replyTo: process.env.EMAIL_REPLY_TO }) });
 apiServer.on('close', stopNotifications);
}
