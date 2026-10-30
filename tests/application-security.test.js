const syntheticPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAMklEQVRIie3QMQ0AAAjAMPxrQxQSdvG1BpZs9tkIFIuSRcmiZFGyKFmULEoWJYvS+6IDceSQiMhl3nAAAAAASUVORK5CYII=','base64');
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createApplicationAdmission, createSharedApplicationRateLimit, clientIP, MAX_APPLICATION_BYTES } from '../server/applicationSecurity.js';
import { createDocumentScanner } from '../server/documentScanner.js';
import { createApplicationHandler } from '../server/applications.js';
import { REQUIRED_DOC_KEYS } from '../shared/application.js';
import { readMultipart } from '../server/multipart.js';

const req = (headers = {}) => ({ headers: { 'content-type': 'multipart/form-data; boundary=test', ...headers }, socket: { remoteAddress: '127.0.0.1' } });
const res = () => ({ setHeader() {} });
test('admission denies excess attempts and oversized bodies before reading any upload', async () => {
  let checked = 0;
  const admit = createApplicationAdmission({ checkRate: async () => { checked++; return false; } });
  await assert.rejects(admit(req({ 'content-length': String(MAX_APPLICATION_BYTES + 1) }), res()), { status: 413 });
  assert.equal(checked, 0);
  await assert.rejects(admit(req(), res()), { status: 429 });
  await assert.rejects(admit(req(), res()), { status: 429 }); // Failed admission releases its slot.
  assert.equal(checked, 2);
});
test('admission bounds active work, releases once, and fails closed on unavailable limiter', async () => {
  const admit = createApplicationAdmission({ checkRate: async () => true });
  const release = await admit(req(), res());
  await assert.rejects(admit(req(), res()), { status: 503 });
  release(); release();
  (await admit(req(), res()))();
  await assert.rejects(createApplicationAdmission({ checkRate: async () => { throw new Error('offline'); } })(req(), res()), /offline/);
});
test('forwarded IP spoofing is ignored unless immediate proxy is explicitly trusted', () => {
  const request = req({ 'x-forwarded-for': '1.2.3.4, 10.0.0.8' });
  assert.equal(clientIP(request), '127.0.0.1');
  assert.equal(clientIP(request, ['127.0.0.1']), '10.0.0.8');
  assert.equal(clientIP(request, ['127.0.0.1', '10.0.0.8']), '1.2.3.4');
});
test('shared limiter uses scoped pseudonymous keys and rejects invalid RPC results', async () => {
  const keys = [];
  const limit = createSharedApplicationRateLimit({ secret: 'x'.repeat(32), rpc: async args => { keys.push(args.key_hash); return true; } });
  await limit('1.2.3.4', 'ingress', 20); await limit('1.2.3.4', 'new-application', 4);
  assert.ok(keys.every(key => /^[a-f0-9]{64}$/.test(key))); assert.notEqual(keys[0], keys[1]);
  await assert.rejects(createSharedApplicationRateLimit({ rpc: async () => true })('ip', 'ingress', 20), { status: 503 });
  await assert.rejects(createSharedApplicationRateLimit({ secret: 'x'.repeat(32), rpc: async () => null })('ip', 'ingress', 20), { status: 503 });
});

test('chunked multipart request cannot exceed its streaming byte cap', async () => {
  const request = { ...req(), async *[Symbol.asyncIterator]() { yield Buffer.alloc(11); } };
  await assert.rejects(readMultipart(request, { maxBytes: 10 }), { status: 413 });
});

test('ClamD protocol handles clean, infected, malformed, early close and timeout responses', async t => {
  for (const verdict of ['stream: OK\0', 'stream: Eicar-Test-Signature FOUND\0', 'stream: scan limit exceeded ERROR\0', 'close', 'timeout']) {
    const server = createServer(socket => {
      let data = Buffer.alloc(0);
      socket.on('error', () => {});
      socket.on('data', chunk => {
        data = Buffer.concat([data, chunk]);
        if (data.length < 10 + 4 + 4 + 4) return;
        assert.equal(data.subarray(0, 10).toString(), 'zINSTREAM\0');
        if (verdict === 'close') socket.end();
        else if (verdict !== 'timeout') socket.end(verdict);
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());
    const scan = createDocumentScanner({ host: '127.0.0.1', port: server.address().port, timeoutMs: 150 });
    const file = new File(['test'], 'test.pdf');
    if (verdict === 'stream: OK\0') assert.equal((await scan(file)).status, 'clean');
    else if (verdict.includes('FOUND')) assert.equal((await scan(file)).status, 'rejected');
    else await assert.rejects(scan(file), { status: 503 });
  }
  await assert.rejects(createDocumentScanner({})(new File(['test'], 'test.pdf')), { status: 503 });
});

test('quarantine gate: no insert or reviewer upload until every file is clean; cleanup failures are reported', async () => {
  const data = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url), 'utf8'));
  const form = new FormData(); form.set('version', '1'); form.set('requestId', randomUUID()); form.set('applicationData', JSON.stringify(data));
  for (const key of REQUIRED_DOC_KEYS) form.set(key, new File([key==='idPhoto'?syntheticPng:'%PDF-1.4\nTEST'], 'test.pdf', { type:key==='idPhoto'?'image/png':'application/pdf' }));
  for (const mode of ['clean', 'rejected', 'offline', 'malformed']) {
    const events = []; let scanned = 0, released = false;
    const handler = createApplicationHandler({
      admit: async () => () => { released = true; }, verifyStorage: async () => {},
      readMultipart: async () => form, rateLimit: async () => true, json: () => {},
      repository: { find: async () => null, insert: async row => { events.push('insert'); return { ...row, submitted_at: new Date().toISOString() }; } },
      uploadFile: async bucket => { events.push(bucket); if (bucket === 'franchise-documents') assert.equal(scanned, REQUIRED_DOC_KEYS.length); },
      deleteStorageObjects: async bucket => { events.push('delete:' + bucket); throw new Error('cleanup offline'); },
      reportCleanupFailure: event => events.push('alert:' + event.bucket),
      scanDocument: async () => { scanned++; if (mode === 'offline') throw new Error('scanner offline'); return mode === 'malformed' ? {} : { status: mode, engine: 'ClamAV', scannedAt: new Date().toISOString() }; },
    });
    if (mode === 'clean') { await handler(req(), res()); assert.ok(events.includes('insert')); }
    else { await assert.rejects(handler(req(), res())); assert.ok(!events.includes('insert')); assert.ok(!events.includes('franchise-documents')); }
    assert.ok(events.includes('alert:franchise-quarantine')); assert.equal(released, true);
  }
});

test('private-storage preflight failure stops parsing and releases capacity', async () => {
  let parsed = false, released = false;
  const handler = createApplicationHandler({ admit: async () => () => { released = true; }, scanDocument: async () => {}, verifyStorage: async () => { throw new Error('public bucket'); }, readMultipart: async () => { parsed = true; } });
  await assert.rejects(handler(req(), res()), /public bucket/);
  assert.equal(parsed, false); assert.equal(released, true);
});
