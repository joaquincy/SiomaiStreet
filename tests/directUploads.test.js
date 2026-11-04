import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { createDirectUploadHandler, validateUploadRequest, uploadSessionAccess, cleanupExpiredUploads, readUploadJson } from '../server/directUploads.js';
import { createUploadRepository, boundedDocumentBytes, createReviewerDocumentHandler, maintenanceAuthorized } from '../server/directUploadServices.js';
import { documentManifest, submitFranchiseApplication } from '../src/api/directUploads.js';
import { REQUIRED_DOC_KEYS } from '../shared/application.js';
import { uploadDatabase } from './helpers/uploadDatabase.js';
import { createSharedApplicationRateLimit } from '../server/applicationSecurity.js';

let database;
before(async () => { database = await uploadDatabase(); });
after(async () => { await database?.db.close(); });
const fixture = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url), 'utf8'));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAMklEQVRIie3QMQ0AAAjAMPxrQxQSdvG1BpZs9tkIFIuSRcmiZFGyKFmULEoWJYvS+6IDceSQiMhl3nAAAAAASUVORK5CYII=', 'base64');
const valid = () => ({ ...structuredClone(fixture), documents: Object.fromEntries(REQUIRED_DOC_KEYS.map(key => [key, new File([key === 'idPhoto' ? png : '%PDF-1.4\nSYNTHETIC ONLY\n%%EOF'], `${key}.${key === 'idPhoto' ? 'png' : 'pdf'}`, { type: key === 'idPhoto' ? 'image/png' : 'application/pdf' })])) });
const clean = () => ({ status: 'clean', engine: 'ClamAV', scannedAt: new Date().toISOString() });
const requestStream = (body, headers = {}) => Object.assign(Readable.from([Buffer.from(body)]), { headers: { 'content-type': 'application/json', ...headers }, setTimeout() {} });
const res = () => ({ setHeader() {} });
const bodyFor = async (data = valid(), id = randomUUID()) => ({ version: 1, requestId: id, applicationData: { ...data, documents: undefined }, manifest: await documentManifest(data.documents) });

function runtime(overrides = {}) {
  const repository = createUploadRepository(database.request);
  const objects = new Map(); let uploads = 0; let active = 0; let maxActive = 0; let scans = 0; const requests = [];
  const storage = {
    exists: async path => objects.has(`franchise-quarantine/${path}`),
    sign: async path => ({ path, signature: 'synthetic-token', endpoint: 'https://synthetic.invalid/storage/v1/upload/resumable' }),
    download: async (bucket, path) => { const value = objects.get(`${bucket}/${path}`); if (!value) throw Object.assign(new Error('Missing file'), { status: 409 }); return value; },
    promote: async (path, file) => objects.set(`franchise-documents/${path}`, Buffer.from(await file.arrayBuffer())),
    remove: async (bucket, paths) => paths.forEach(path => objects.delete(`${bucket}/${path}`)),
  };
  const handler = createDirectUploadHandler({ repository, storage, rate: async () => true, verify: async () => {}, verifyStorage: async () => {},
    access: uploadSessionAccess('synthetic-only-secret'.repeat(3)), scanDocument: async () => { scans++; return clean(); }, json: (response, status, value) => Object.assign(response, { status, value }), receiptDetails: () => ({}), ...overrides });
  const fetcher = async (url, options) => {
    assert.equal(options.headers['content-type'], 'application/json');
    assert.ok(Buffer.byteLength(options.body) < 350000, 'application API must never receive file bytes');
    requests.push({ url, body: JSON.parse(options.body) });
    const req = requestStream(options.body, options.headers); const response = res();
    const match = url.match(/^\/api\/franchise-applications\/uploads(?:\/([^/]+)\/([^/]+)(?:\/([^/]+))?)?$/);
    const correction = url.match(/^\/api\/application-status\/([^/]+)\/corrections\/([^/]+)\/uploads$/);
    try { await handler(req, response, match?.[1], match?.[2], match?.[3], correction ? { applicationId: correction[1], correctionId: correction[2] } : undefined); }
    catch (error) { response.status = error.status || 500; response.value = { error: error.message, validationErrors: error.validationErrors }; }
    return Response.json(response.value, { status: response.status });
  };
  const uploader = async (file, grant, options) => {
    active++; maxActive = Math.max(maxActive, active);
    try {
      await new Promise(resolve => setTimeout(resolve, 2)); options.signal.throwIfAborted();
      objects.set(`franchise-quarantine/${grant.path}`, Buffer.from(await file.arrayBuffer())); uploads++; options.onProgress(file.size);
    } finally { active--; }
  };
  return { repository, storage, objects, handler, fetcher, uploader, requests, counts: () => ({ uploads, maxActive, scans }) };
}

test('8 MiB document uses direct storage; repeat/lost-receipt retry reuses one SQL application', async () => {
  const rt = runtime(); const data = valid(); const requestId = randomUUID(); const progress = [];
  data.documents.proofOfFunds = new File(['%PDF-', new Uint8Array(8 * 1024 * 1024)], 'synthetic-large.pdf', { type: 'application/pdf' });
  let loseReceipt = true;
  const fetcher = async (url, options) => {
    const response = await rt.fetcher(url, options);
    if (url.endsWith('/finalize') && loseReceipt) { loseReceipt = false; throw new Error('lost acknowledgement'); }
    return response;
  };
  const send = () => submitFranchiseApplication({ formData: data, requestId, fetcher, uploader: rt.uploader, onProgress: message => progress.push(message) });
  await assert.rejects(send(), /retry/);
  const count = rt.counts().uploads;
  const receipt = await send(); assert.equal(receipt.id, requestId);
  assert.equal(rt.counts().uploads, count); assert.equal(rt.counts().maxActive, 2);
  assert.equal((await database.db.query('select count(*)::int as n from franchise_applications where id=$1', [requestId])).rows[0].n, 1);
  assert.ok(progress.some(message => message.includes('Checking documents')));
  data.firstName = 'Changed'; await assert.rejects(send(), /different answers/);
});

test('invalid form, duplicate keys, huge sizes and unsupported types are rejected before signing', async () => {
  const body = await bodyFor(); assert.equal(validateUploadRequest(body).manifest.length, 5);
  assert.throws(() => validateUploadRequest({ ...body, applicationData: { ...body.applicationData, email: 'broken' } }), /correct/);
  for (const manifest of [[...body.manifest, body.manifest[0]], [{ ...body.manifest[0], size: 10485761 }], [{ ...body.manifest[0], size: NaN }], [{ ...body.manifest[0], type: 'text/html' }], [{ ...body.manifest[0], key: '__proto__' }]]) {
    assert.throws(() => validateUploadRequest({ ...body, manifest }));
  }
  const rt = runtime({ verify: async () => { throw Object.assign(new Error('Turnstile rejected'), { status: 403 }); } });
  const stream = requestStream('{broken'); await assert.rejects(rt.handler(stream, res()), /Turnstile/); assert.equal(stream.readableDidRead, false);
});

test('scanner outage keeps uploaded files; retry checks them without re-uploading', async () => {
  let unavailable = true;
  const rt = runtime({ scanDocument: async () => { if (unavailable) throw Object.assign(new Error('Scanner temporarily unavailable'), { status: 503 }); return clean(); } });
  const data = valid(); const id = randomUUID();
  const send = () => submitFranchiseApplication({ formData: data, requestId: id, fetcher: rt.fetcher, uploader: rt.uploader });
  await assert.rejects(send(), /Scanner/); const uploaded = rt.counts().uploads;
  assert.equal(await rt.repository.application(id), null);
  unavailable = false; assert.equal((await send()).id, id); assert.equal(rt.counts().uploads, uploaded);
});

test('lost storage acknowledgement is reconciled before checks and cannot create duplicate applications', async () => {
  const rt = runtime(), data = valid(), requestId = randomUUID();
  const uploader = async (...args) => { await rt.uploader(...args); throw Object.assign(new Error('Lost storage response'), { status: 0 }); };
  const send = () => submitFranchiseApplication({ formData: data, requestId, fetcher: rt.fetcher, uploader });
  assert.equal((await send()).id, requestId);
  const { uploads: uploaded, scans } = rt.counts();
  assert.equal((await send()).id, requestId); assert.equal(rt.counts().uploads, uploaded);
  assert.ok(scans >= Object.keys(data.documents).length); assert.equal(rt.counts().scans, scans);
  assert.equal((await database.db.query('select count(*)::int as n from franchise_applications where id=$1', [requestId])).rows[0].n, 1);
});

test('failed upload without stored bytes keeps the original error and cannot finalize', async () => {
  const rt = runtime(), data = valid(), requestId = randomUUID();
  const failure = Object.assign(new Error('Storage permission rejected; draft kept'), { status: 403 });
  await assert.rejects(submitFranchiseApplication({ formData: data, requestId, fetcher: rt.fetcher, uploader: async () => { throw failure; } }), error => error === failure);
  assert.equal(await rt.repository.application(requestId), null); assert.equal(rt.counts().scans, 0);
});

test('real hourly limiter permits receipt replay after the new-session allowance is spent', async () => {
  const observed = [];
  const rate = createSharedApplicationRateLimit({ secret: 'synthetic-rate-secret'.repeat(2),
    rpc: async body => database.request('/rest/v1/rpc/consume_rate_policies', { body: JSON.stringify(body) }),
    onResult: p => observed.push(p) });
  const ip = `synthetic-${randomUUID()}`;
  const rt = runtime({ rate: (_req, scope, limit) => rate(ip, scope, limit) });
  const data = valid(), requestId = randomUUID();
  const send = () => submitFranchiseApplication({ formData: data, requestId, fetcher: rt.fetcher, uploader: rt.uploader });
  const receipt = await send();
  for (let i = 0; i < 3; i++) assert.equal(await rate(ip, 'new-application', 4), true);
  const fresh = await rt.fetcher('/api/franchise-applications/uploads', { headers: { 'content-type': 'application/json' }, body: JSON.stringify(await bodyFor()) });
  assert.equal(fresh.status, 429);
  assert.equal(observed.at(-1).scope, 'new-application'); assert.equal(observed.at(-1).remaining, 0);
  const uploads = rt.counts().uploads;
  const replay = await send();
  assert.equal(replay.id, receipt.id); assert.equal(replay.status, receipt.status);
  assert.equal(Date.parse(replay.submittedAt), Date.parse(receipt.submittedAt));
  assert.equal(rt.counts().uploads, uploads);
  assert.equal(observed.at(-1).scope, 'upload-start'); // No new-item debit on a replay.
  assert.equal((await database.db.query('select count(*)::int as n from franchise_applications where id=$1', [requestId])).rows[0].n, 1);
});

test('exhausted document checks explain session expiry rather than promising a short reset', async () => {
  const rt = runtime(), body = await bodyFor();
  const session = await (await rt.fetcher('/api/franchise-applications/uploads', { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
  const key = body.manifest[0].key;
  await database.db.query('update franchise_upload_items set attempts=8 where session_id=$1 and document_key=$2', [session.sessionId, key]);
  const checked = await rt.fetcher(`/api/franchise-applications/uploads/${session.sessionId}/check/${key}`, { headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` }, body: '{}' });
  assert.equal(checked.status, 409);
  assert.match((await checked.json()).error, /all 8 checks.*does not reset.*two-hour/);
  assert.equal(rt.counts().scans, 0);
});

test('tampered bytes and malware never enter reviewer storage or create an application', async () => {
  for (const malware of [false, true]) {
    const rt = runtime({ scanDocument: async () => malware ? { status: 'rejected', engine: 'ClamAV' } : clean() });
    const data = valid(); const id = randomUUID();
    const uploader = async (file, grant, options) => { await rt.uploader(file, grant, options); if (!malware) rt.objects.set(`franchise-quarantine/${grant.path}`, Buffer.from('tampered')); };
    await assert.rejects(submitFranchiseApplication({ formData: data, requestId: id, fetcher: rt.fetcher, uploader }), error => error.status === 422 && /document/i.test(error.message));
    assert.equal(await rt.repository.application(id), null);
    assert.equal([...rt.objects.keys()].filter(key => key.startsWith('franchise-documents/')).length, 0);
  }
});

test('forged tokens, expiry and incomplete documents cannot finalize', async () => {
  const rt = runtime(); const body = await bodyFor();
  const start = await rt.fetcher('/api/franchise-applications/uploads', { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const session = await start.json(); const path = `/api/franchise-applications/uploads/${session.sessionId}/finalize`;
  const call = token => rt.fetcher(path, { headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: '{}' });
  assert.equal((await call('x'.repeat(43))).status, 403);
  assert.equal((await call(session.token)).status, 409);
  await database.db.query("update franchise_upload_sessions set expires_at=now()-interval '1 minute' where id=$1", [session.sessionId]);
  // Token binds expiry too: create the corresponding expired-session token for this check.
  const expired = await rt.repository.session(session.sessionId);
  const token = uploadSessionAccess('synthetic-only-secret'.repeat(3)).token(expired);
  assert.equal((await call(token)).status, 410);
});

test('SQL leases and finalization enforce one checker and one insert, including concurrent retries', async () => {
  const rt = runtime(); const body = await bodyFor(); const { data, manifest, hash } = validateUploadRequest(body);
  const session = await rt.repository.prepare(body.requestId, hash, data, manifest);
  const firstLease = randomUUID(); const key = manifest[0].key;
  assert.ok(await rt.repository.claim(session.id, key, firstLease));
  assert.equal(await rt.repository.claim(session.id, key, randomUUID()), null);
  await assert.rejects(rt.repository.finalize(session.id, false), /not ready/);
  for (const item of manifest) {
    const lease = item.key === key ? firstLease : randomUUID();
    if (item.key !== key) assert.ok(await rt.repository.claim(session.id, item.key, lease));
    assert.equal(await rt.repository.finish(session.id, item.key, lease, { path: `direct/${session.id}/${item.key}`, name: item.name, size: item.size, contentType: item.type, scan: clean() }), true);
  }
  const results = await Promise.all([rt.repository.finalize(session.id, false), rt.repository.finalize(session.id, false)]);
  assert.equal(results[0].id, results[1].id);
  assert.equal((await database.db.query('select count(*)::int as n from franchise_applications where id=$1', [body.requestId])).rows[0].n, 1);
});

test('SQL denies public access and does not permit skipped scans in the production finalize call', async () => {
  const privileges = await database.db.query("select has_table_privilege('anon','franchise_upload_sessions','SELECT') as read, has_function_privilege('authenticated','finalize_franchise_upload(uuid,boolean)','EXECUTE') as finalize");
  assert.deepEqual(privileges.rows[0], { read: false, finalize: false });
  const rt = runtime({ scanDocument: async () => ({ status: 'skipped', engine: 'none', scannedAt: new Date().toISOString() }) });
  await assert.rejects(submitFranchiseApplication({ formData: valid(), requestId: randomUUID(), fetcher: rt.fetcher, uploader: rt.uploader }), /scanning/i);
});

test('replacement uses direct uploads, retains original application and retries the same receipt', async () => {
  const original = runtime(); const id = randomUUID();
  await submitFranchiseApplication({ formData: valid(), requestId: id, fetcher: original.fetcher, uploader: original.uploader });
  const correctionId = (await database.db.query("select request_franchise_document($1,'govIdFront','Synthetic replacement request','synthetic-reviewer') as id", [id])).rows[0].id;
  const check = async () => (await database.db.query('select * from franchise_corrections where id=$1', [correctionId])).rows[0];
  const rt = runtime({ corrections: { authorize: async req => { assert.equal(req.headers.authorization, 'Bearer private-portal-code'); return check(); }, check } });
  const data = { documents: { govIdFront: valid().documents.govIdFront } }; const retry = randomUUID();
  const send = () => submitFranchiseApplication({ formData: data, requestId: retry, fetcher: rt.fetcher, uploader: rt.uploader, correction: { id: correctionId, applicationId: id, accessCode: 'private-portal-code' } });
  const receipt = await send(); assert.deepEqual(receipt, { id: correctionId, requestId: retry, status: 'received' });
  const count = rt.counts().uploads; assert.deepEqual(await send(), receipt); assert.equal(rt.counts().uploads, count);
  assert.equal((await database.db.query('select status from franchise_applications where id=$1', [id])).rows[0].status, 'under_review');
});

test('cleanup retries failures and never deletes referenced or submitted documents', async () => {
  const rt = runtime(); const id = randomUUID();
  await submitFranchiseApplication({ formData: valid(), requestId: id, fetcher: rt.fetcher, uploader: rt.uploader });
  await database.db.query("update franchise_upload_sessions set cleanup_after=now()-interval '1 hour' where application_id=$1", [id]);
  const before = [...rt.objects.keys()].filter(key => key.startsWith('franchise-documents/')).length;
  await assert.rejects(cleanupExpiredUploads({ repository: rt.repository, storage: { ...rt.storage, remove: async () => { throw new Error('Storage offline'); } } }), /offline/);
  assert.ok((await rt.repository.expired(20)).length);
  assert.equal(await cleanupExpiredUploads({ repository: rt.repository, storage: rt.storage }), 1);
  assert.equal([...rt.objects.keys()].filter(key => key.startsWith('franchise-documents/')).length, before);
  assert.equal([...rt.objects.keys()].filter(key => key.startsWith('franchise-quarantine/')).length, 0);
});

test('body/stream limits, aborts and malformed receipts keep callers out of success paths', async () => {
  await assert.rejects(readUploadJson(requestStream('x'.repeat(1025)), 1024), /too large/);
  await assert.rejects(readUploadJson(requestStream('{bad')), /malformed/);
  await assert.rejects(boundedDocumentBytes(new Response(new Uint8Array(33)), 32), /size limit/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(submitFranchiseApplication({ formData: valid(), requestId: randomUUID(), signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(submitFranchiseApplication({ formData: valid(), requestId: randomUUID(), fetcher: async () => Response.json({ receipt: {} }) }), /valid receipt/);
  assert.equal(maintenanceAuthorized('Bearer x', 'x'), false);
  assert.equal(maintenanceAuthorized(`Bearer ${'s'.repeat(32)}`, 's'.repeat(32)), true);
});

test('staff links require a verified Auth user, explicit permission and clean document', async () => {
  const user = randomUUID(); const id = randomUUID(); let allowed = false; let scanned = true; const audit = [];
  const handler = createReviewerDocumentHandler({ url: 'https://synthetic.invalid', serviceKey: 'server-only', rate: async () => true,
    fetcher: async () => Response.json({ id: user }), json: (response, status, value) => Object.assign(response, { status, value }),
    request: async (path, options) => {
      if (path.includes('franchise_document_reviewers')) return allowed ? [{ user_id: user }] : [];
      if (path.includes('franchise_applications')) return [{ document_paths: { govIdFront: { path: 'private/test', name: 'ID.pdf', scan: scanned ? clean() : { status: 'skipped' } } } }];
      if (path.includes('access_log')) { audit.push(JSON.parse(options.body)); return; }
      if (path.includes('/object/sign/')) { assert.equal(JSON.parse(options.body).expiresIn, 60); return { signedURL: '/object/sign/franchise-documents/private/test?token=synthetic' }; }
      throw new Error('Unexpected request');
    },
  });
  const req = { headers: { authorization: `Bearer ${'t'.repeat(40)}` } };
  await assert.rejects(handler(req, res(), id, 'govIdFront'), /permission/); assert.equal(audit.length, 0);
  allowed = true; scanned = false; await assert.rejects(handler(req, res(), id, 'govIdFront'), /not available/);
  scanned = true; const response = res(); await handler(req, response, id, 'govIdFront'); assert.equal(response.value.expiresIn, 60); assert.equal(audit.length, 1);
});

test('explicit scan-off permits a receipt and idempotent retry while recording skipped scans', async () => {
  const rt = runtime({ allowUnscanned: true, scanDocument: async () => ({status:'skipped',engine:'none',scannedAt:new Date().toISOString()}) });
  const data = valid(); const id = randomUUID();
  const send = () => submitFranchiseApplication({formData:data,requestId:id,fetcher:rt.fetcher,uploader:rt.uploader});
  const receipt = await send(); assert.equal(receipt.id,id);
  const retried = await send();
  assert.equal(retried.id,receipt.id);
  assert.equal(retried.status,receipt.status);
  assert.equal(Date.parse(retried.submittedAt),Date.parse(receipt.submittedAt));
  assert.equal((await database.db.query('select count(*)::int as total from franchise_applications where id=$1',[id])).rows[0].total,1);
  const row = (await database.db.query('select document_paths from franchise_applications where id=$1',[id])).rows[0];
  for (const doc of Object.values(row.document_paths)) assert.equal(doc.scan.status,'skipped');
});

test('scan-off staff access still enforces permissions and rejects infected or malformed scans', async () => {
 const id=randomUUID(), user=randomUUID(); let allowed=false;
 let scan={status:'skipped',engine:'none',scannedAt:new Date().toISOString()};
 const handler=createReviewerDocumentHandler({url:'https://synthetic.invalid',serviceKey:'server-only',allowUnscannedDocuments:true,rate:async()=>true,
 fetcher:async()=>Response.json({id:user}),json:(response,status,value)=>Object.assign(response,{status,value}),
 request:async path=>{
  if(path.includes('franchise_document_reviewers')) return allowed?[{user_id:user}]:[];
  if(path.includes('franchise_applications')) return [{document_paths:{govIdFront:{path:'private/test',scan}}}];
  if(path.includes('access_log')) return;
  if(path.includes('/object/sign/')) return {signedURL:'/object/sign/franchise-documents/private/test?token=synthetic'};
  throw new Error('Unexpected request');
 }});
 const req={headers:{authorization:`Bearer ${'t'.repeat(40)}`}};
 await assert.rejects(handler(req,res(),id,'govIdFront'),/permission/);
 allowed=true; const response=res(); await handler(req,response,id,'govIdFront');
 assert.equal(response.value.scan.status,'skipped'); assert.match(response.value.warning,/not been virus-checked/);
 for(const invalid of [{status:'rejected',engine:'ClamAV',scannedAt:new Date().toISOString()},{status:'skipped'}]) {
  scan=invalid; await assert.rejects(handler(req,res(),id,'govIdFront'),/not available/);
 }
});
