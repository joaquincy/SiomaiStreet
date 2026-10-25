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
const maxBodyBytes = 110 * 1024 * 1024;
const allowedDocumentKeys = new Set([
  'govIdFront', 'govIdBack', 'proofOfBilling', 'proofOfFunds', 'idPhoto',
  'dtiSecCert', 'businessPermit', 'resumeCv', 'characterRef', 'siteProposal',
]);
const allowedDocumentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
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

const readRequestBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error('Request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const readMultipart = async (req) => {
  const contentType = req.headers['content-type'];
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) {
    throw Object.assign(new Error('Expected a multipart form submission.'), { status: 400 });
  }
  const body = await readRequestBody(req);
  const form = await new Request('http://localhost', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  }).formData();
  return form;
};

const safeFileName = (name) => name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100) || 'upload';
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
  await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ prefixes: paths }),
  });
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

const handleApplicationPost = async (req, res) => {
  if (!rateLimit(req, 4, 60 * 60 * 1000)) return json(res, 429, { error: 'Too many applications from this connection. Please contact us for help.' });
  const form = await readMultipart(req);
  let data;
  try {
    data = JSON.parse(String(form.get('applicationData') || ''));
  } catch {
    throw Object.assign(new Error('Application data is missing or invalid.'), { status: 400 });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Object.assign(new Error('Application data is invalid.'), { status: 400 });
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Applicant name and a valid email address are required.'), { status: 400 });
  if (data.email !== data.confirmEmail) throw Object.assign(new Error('Email addresses do not match.'), { status: 400 });
  if (!data.consent_nda || !data.consent_backgroundCheck || !data.consent_accuracy || !data.consent_privacy) throw Object.assign(new Error('All required consents must be accepted.'), { status: 400 });
  const files = [];
  for (const [key, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;
    if (!allowedDocumentKeys.has(key)) throw Object.assign(new Error('An unsupported document was included.'), { status: 400 });
    if (value.size > 10 * 1024 * 1024 || !allowedDocumentTypes.has(value.type)) throw Object.assign(new Error('Documents must be PDF, JPG, or PNG files under 10 MB each.'), { status: 400 });
    files.push({ key, file: value });
  }
  if (files.length > 10) throw Object.assign(new Error('No more than 10 documents can be submitted.'), { status: 400 });
  const requiredDocuments = ['govIdFront', 'govIdBack', 'proofOfBilling', 'proofOfFunds', 'idPhoto'];
  const uploadedKeys = new Set(files.map(({ key }) => key));
  if (requiredDocuments.some((key) => !uploadedKeys.has(key))) throw Object.assign(new Error('Please include all required documents.'), { status: 400 });

  const id = randomUUID();
  const uploadedPaths = [];
  const documentPaths = {};
  try {
    for (const { key, file } of files) {
      const path = `${id}/${key}-${safeFileName(file.name)}`;
      await uploadFile('franchise-documents', path, file, file.type);
      uploadedPaths.push(path);
      documentPaths[key] = { path, name: file.name, contentType: file.type, size: file.size };
    }
    const applicationData = { ...data };
    delete applicationData.documents;
    delete applicationData.confirmEmail;
    const rows = await supabaseRequest('/rest/v1/franchise_applications', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        id,
        applicant_name: `${firstName} ${lastName}`.slice(0, 200),
        applicant_email: email,
        applicant_phone: String(data.primaryPhone || '').slice(0, 100) || null,
        target_region: String(data.targetRegion || '').slice(0, 120) || null,
        target_city: String(data.targetCity || '').slice(0, 160) || null,
        selected_package: ['food-cart', 'kiosk', 'casual-dining'].includes(data.selectedPackage) ? data.selectedPackage : null,
        application_data: applicationData,
        document_paths: documentPaths,
        status: 'submitted',
      }),
    });
    json(res, 201, { id: rows[0]?.id || id, status: 'submitted' });
  } catch (error) {
    await deleteStorageObjects('franchise-documents', uploadedPaths);
    throw error;
  }
};

const apiServer = createServer(async (req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('x-frame-options', 'DENY');
  const origin = req.headers.origin;
  if (origin && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, configured: Boolean(supabaseUrl && serviceKey) });
    }
    if (url.pathname === '/api/branches' && req.method === 'GET') return await handleBranchesGet(req, res);
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
    return json(res, status, { error: status >= 500 ? 'The request could not be completed. Please try again later.' : error.message });
  }
});

apiServer.listen(port, () => console.log(`Siomai Street API listening on port ${port}`));
