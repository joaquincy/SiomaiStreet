import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import { contactConfiguration, publicContactConfiguration, createContactHandler, readContactJson } from '../server/contact.js';
import { validateContact, validContactReceipt, contactTextLength } from '../shared/contact.js';

const fixture = (extra = {}) => ({ requestId: randomUUID(), channel: 'customer', topic: 'order', name: 'Synthetic Customer', email: 'test@example.invalid', message: 'Synthetic order concern for testing only.', branch: 'Synthetic branch', orderReference: 'TEST-123', privacyAcknowledged: true, ...extra });
const config = () => contactConfiguration({ CONTACT_INTAKE_ENABLED: 'true', SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic', APPLICATION_RATE_SECRET: 'x'.repeat(32), CONTACT_CUSTOMER_QUEUE: 'test_customer', CONTACT_FRANCHISE_QUEUE: 'test_franchise' });
function harness(overrides = {}) {
  const rows = new Map(), rates = [];
  const repository = {
    async find(id) { return rows.get(id); },
    async insert(row) {
      if (rows.has(row.id)) throw new Error('unique key');
      const saved = { ...row, received_at: '2026-10-31T01:00:00.000Z' };
      rows.set(row.id, saved); return saved;
    },
  };
  const handler = createContactHandler({ configuration: config(), repository, rate: async (...args) => { rates.push(args); return true; }, json: (res, status, body) => Object.assign(res, { status, body }), ...overrides });
  const send = async (data = fixture(), headers = {}) => {
    const req = { headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', ...headers }, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(data)); } };
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; } };
    await handler(req, res); return res;
  };
  return { handler, send, rows, rates, repository };
}

test('contact intake stays off until explicitly configured; public options exclude queue names and secrets', () => {
  assert.equal(contactConfiguration({}).customer.enabled, false);
  assert.equal(contactConfiguration({ CONTACT_INTAKE_ENABLED: 'true', CONTACT_CUSTOMER_QUEUE: 'test' }).customer.enabled, false);
  const settings = config();
  assert.equal(settings.customer.enabled, true);
  assert.deepEqual(Object.keys(publicContactConfiguration(settings).customer), ['enabled', 'email', 'phone', 'hours', 'responseNote']);
  const invalid = contactConfiguration({ CONTACT_CUSTOMER_EMAIL: 'bad\r\n@example.invalid', CONTACT_CUSTOMER_PHONE: 'javascript:alert(1)', CONTACT_CUSTOMER_QUEUE: '../bad' });
  assert.equal(invalid.customer.email, ''); assert.equal(invalid.customer.phone, ''); assert.equal(invalid.customer.queue, '');
});

test('shared validation enforces both channel contracts and discards unrelated private input', () => {
  const result = validateContact(fixture({ name: '  Synthetic Customer  ', email: ' TEST@example.invalid ', secret: 'discard' }));
  assert.deepEqual(result.errors, {}); assert.equal(result.data.name, 'Synthetic Customer'); assert.equal(result.data.email, 'test@example.invalid');
  assert.equal(result.data.secret, undefined);
  const franchise = validateContact(fixture({ channel: 'franchise', topic: 'packages' }));
  assert.deepEqual(franchise.errors, {}); assert.equal(franchise.data.branch, ''); assert.equal(franchise.data.orderReference, '');
  assert.ok(validateContact(fixture({ channel: 'franchise' })).errors.topic);
  assert.ok(validateContact(fixture({ privacyAcknowledged: 'true' })).errors.privacyAcknowledged);
  assert.ok(validateContact(fixture({ website: 'spam' })).errors.form);
});

test('invalid values yield useful errors; correcting one field does not hide unresolved errors', () => {
  for (const invalid of [null, [], 42, {}]) assert.ok(Object.keys(validateContact(invalid).errors).length);
  const bad = fixture({ name: '', email: 'bad', message: 'short', privacyAcknowledged: false });
  assert.deepEqual(Object.keys(validateContact(bad).errors).sort(), ['email', 'message', 'name', 'privacyAcknowledged']);
  assert.deepEqual(Object.keys(validateContact({ ...bad, name: 'Fixed' }).errors).sort(), ['email', 'message', 'privacyAcknowledged']);
  assert.ok(validateContact(fixture({ message: 'a'.repeat(2001) })).errors.message);
  assert.ok(validateContact(fixture({ name: 'has\u0000control' })).errors.name);
  assert.ok(validateContact(fixture({ name: { nested: true } })).errors.name);
  assert.ok(validateContact(fixture({ message: '🙂'.repeat(10) })).errors.message);
  assert.equal(contactTextLength('🙂'.repeat(20)), 20);
});

test('admission rejects disabled intake, foreign origins and rate-limited attempts before reading the body', async () => {
  let reads = 0;
  const readJson = async () => { reads++; return fixture(); };
  assert.equal((await harness({ configuration: contactConfiguration({}), readJson }).send()).status, 503);
  assert.equal((await harness({ readJson }).send(fixture(), { origin: 'https://evil.invalid' })).status, 403);
  assert.equal((await harness({ readJson }).send(fixture(), { 'sec-fetch-site': 'cross-site', origin: undefined })).status, 403);
  const blocked = await harness({ readJson, rate: async () => false }).send();
  assert.equal(blocked.status, 429); assert.equal(blocked.headers['Retry-After'], '3600'); assert.equal(blocked.body.accepted, false);
  assert.equal(reads, 0);
  assert.equal((await harness({ readJson, rate: async () => { throw new Error('secret backend detail'); } }).send()).status, 503);
  assert.equal(reads, 0);
});

test('JSON parser enforces byte caps, media type, encoding and malformed JSON', async () => {
  const req = (headers, parts) => ({ headers, async *[Symbol.asyncIterator]() { for (const part of parts) yield Buffer.from(part); } });
  await assert.rejects(readContactJson(req({ 'content-length': '12289' }, [])), { status: 413 });
  await assert.rejects(readContactJson(req({ 'content-type': 'text/plain' }, ['{}'])), { status: 415 });
  await assert.rejects(readContactJson(req({ 'content-type': 'application/json', 'content-encoding': 'gzip' }, [])), { status: 415 });
  await assert.rejects(readContactJson(req({ 'content-type': 'application/json' }, ['{bad'])), { status: 400 });
  await assert.rejects(readContactJson(req({ 'content-type': 'application/json' }, ['x'.repeat(12000), 'y'.repeat(1000)])), { status: 413 });
  assert.deepEqual(await readContactJson(req({ 'content-type': 'application/json; charset=utf-8' }, ['{"a":', '1}'])), { a: 1 });
});

test('invalid requests never insert a row; optional and conditional fields remain optional', async () => {
  const h = harness();
  assert.equal((await h.send(fixture({ requestId: '../query-injection' }))).status, 400);
  const invalid = await h.send(fixture({ name: '', privacyAcknowledged: false }));
  assert.equal(invalid.status, 422); assert.ok(invalid.body.errors.name); assert.ok(invalid.body.errors.privacyAcknowledged); assert.equal(h.rows.size, 0);
  assert.equal((await h.send(fixture({ branch: '', orderReference: '' }))).status, 200);
});

test('a saved message gets a minimal receipt and retries return the same receipt without new-email rate use', async () => {
  const h = harness(), data = fixture();
  const first = await h.send(data), retry = await h.send(data);
  assert.equal(first.status, 200); assert.deepEqual(retry.body, first.body); assert.equal(h.rows.size, 1);
  assert.equal(validContactReceipt(first.body, data.requestId, 'customer'), true);
  assert.deepEqual(Object.keys(first.body), ['id', 'reference', 'channel', 'status', 'receivedAt']);
  const row = h.rows.get(data.requestId);
  assert.equal(row.assigned_queue, 'test_customer'); assert.equal(row.privacy_notice_version, '2026-10-31');
  assert.equal(row.privacyAcknowledged, undefined); assert.equal(row.website, undefined);
  assert.equal(h.rates.filter(call => call[1] === 'contact-new').length, 1);
  assert.equal(h.rates.filter(call => call[1] === 'contact-ingress').length, 2);
  assert.equal((await h.send({ ...data, message: 'Different synthetic request details.' })).status, 409); assert.equal(h.rows.size, 1);
});

test('concurrent identical submissions create one row and recover the unique-key race', async () => {
  const h = harness(), data = fixture();
  const [a, b] = await Promise.all([h.send(data), h.send(data)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.deepEqual(a.body, b.body); assert.equal(h.rows.size, 1);
});

test('franchise messages route to the configured queue; client cannot choose its own queue or status', async () => {
  const h = harness(), data = fixture({ channel: 'franchise', topic: 'location', assigned_queue: 'other', status: 'resolved' });
  assert.equal((await h.send(data)).status, 200);
  const row = h.rows.get(data.requestId);
  assert.equal(row.assigned_queue, 'test_franchise'); assert.equal(row.branch, ''); assert.equal(row.order_reference, ''); assert.equal(row.status, undefined);
  const settings = config(); settings.franchise.enabled = false;
  assert.equal((await harness({ configuration: settings }).send(data)).status, 503);
});

test('a saved insert with lost response is recovered, while uncertain failures never claim success', async () => {
  let saved;
  const data = fixture();
  const recovery = harness({ repository: { find: async () => saved, insert: async row => { saved = { ...row, received_at: '2026-10-31T01:00:00Z' }; throw new Error('network lost after commit'); } } });
  assert.equal((await recovery.send(data)).status, 200);
  const failed = await harness({ repository: { find: async () => null, insert: async () => { throw new Error('private database detail'); } } }).send();
  assert.equal(failed.status, 503); assert.equal(failed.body.accepted, 'unknown'); assert.doesNotMatch(JSON.stringify(failed.body), /private database detail/);
  const unavailable = await harness({ repository: { find: async () => { throw new Error('offline'); } } }).send();
  assert.equal(unavailable.status, 503); assert.equal(unavailable.body.accepted, false);
});

test('partial or mismatched server receipts never pass client verification', () => {
  const id = randomUUID(), good = { id, reference: `SS-INQ-${id.toUpperCase()}`, channel: 'customer', status: 'received', receivedAt: '2026-10-31T01:00:00Z' };
  assert.equal(validContactReceipt(good, id, 'customer'), true);
  for (const bad of [null, {}, { ...good, id: randomUUID() }, { ...good, channel: 'franchise' }, { ...good, status: 'approved' }, { ...good, reference: 'made up' }, { ...good, receivedAt: 'invalid' }]) assert.ok(!validContactReceipt(bad, id, 'customer'));
});

test('actual HTTP chunked overflow returns a useful 413 and accepts a valid retry', async t => {
  const h = harness({ json: (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); } });
  const server = createServer(h.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const send = parts => new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port: server.address().port, method: 'POST', headers: { 'content-type': 'application/json' } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    req.on('error', reject); for (const part of parts) req.write(part); req.end();
  });
  const tooLarge = await send(['{"message":"', 'x'.repeat(13000), '"}']);
  assert.equal(tooLarge.status, 413); assert.match(tooLarge.body.error, /too large/); assert.equal(h.rows.size, 0);
  assert.equal((await send([JSON.stringify(fixture())])).status, 200);
});
