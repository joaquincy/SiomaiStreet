import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { uploadDocument, clearUploadTransfers } from '../src/api/resumableDocuments.js';

// Real tus-js-client HTTP transfers against a synthetic TUS server. Node's transport
// is exercised here; this does not substitute for browser XHR / hosted Supabase QA.
async function tusServer(t, { failPatch = false, hold = false, rejectStatus = 0 } = {}) {
  const chunks = []; const methods = []; const lengths = [];
  let offset = 0; let size = 0; let failures = 0; let posts = 0;
  const server = createServer(async (req, res) => {
    try {
      methods.push(req.method);
      assert.equal(req.headers['x-signature'], 'synthetic-scoped-token');
      assert.equal(req.headers['x-upsert'], 'false');
      assert.equal(req.headers.authorization, undefined);
      res.setHeader('Tus-Resumable', '1.0.0');
      if (rejectStatus) { res.writeHead(rejectStatus); return res.end('Synthetic authorization failure'); }
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'Upload-Offset': String(offset), 'Upload-Length': String(size) }); return res.end();
      }
      if (req.method === 'POST') { posts++; size = Number(req.headers['upload-length']); }
      if (hold) return; // Abort must close this pending transfer without leaving a ten-minute timer.
      let count = 0; const incoming = [];
      for await (const chunk of req) { count += chunk.length; assert.ok(count <= 6 * 1024 * 1024); incoming.push(chunk); }
      if (req.method === 'PATCH' && failPatch && failures++ === 0) { res.writeHead(503); return res.end(); }
      lengths.push(count); offset += count; chunks.push(...incoming);
      res.writeHead(req.method === 'POST' ? 201 : 204, { Location: '/storage/v1/upload/resumable/synthetic', 'Upload-Offset': String(offset) }); res.end();
    } catch { res.writeHead(500); res.end(); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { clearUploadTransfers(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { grant: { endpoint: `http://127.0.0.1:${server.address().port}/storage/v1/upload/resumable`, path: 'direct/synthetic/proofOfFunds', bucket: 'franchise-quarantine', signature: 'synthetic-scoped-token' },
    result: () => ({ bytes: Buffer.concat(chunks), methods, lengths, posts, offset }), server };
}

test('TUS transfers 8 MiB as bounded chunks, resumes after a failed PATCH and clears completion', async t => {
  const runtime = await tusServer(t, { failPatch: true });
  const input = Object.assign(Buffer.alloc(8 * 1024 * 1024, 65), { size: 8 * 1024 * 1024, name: 'synthetic.pdf', type: 'application/pdf' });
  const progress = [];
  await uploadDocument(input, runtime.grant, { onProgress: bytes => progress.push(bytes) });
  const result = runtime.result();
  assert.equal(result.bytes.equals(input), true); assert.equal(result.posts, 1); assert.ok(result.methods.includes('HEAD'));
  assert.deepEqual(result.lengths, [6 * 1024 * 1024, 2 * 1024 * 1024]);
  assert.ok(progress.length); assert.ok(progress.every(value => value >= 0 && value <= input.size));
});

test('aborting a transfer releases the promise and abort listeners without leaking provider credentials', async t => {
  const runtime = await tusServer(t, { hold: true }); const controller = new AbortController();
  const input = Object.assign(Buffer.alloc(1024), { size: 1024, name: 'synthetic.pdf', type: 'application/pdf' });
  const pending = uploadDocument(input, runtime.grant, { signal: controller.signal });
  await once(runtime.server, 'request'); controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('large file falls back once to signed PUT when the TUS endpoint rejects its token', async t => {
  const runtime = await tusServer(t, { rejectStatus: 400 });
  runtime.grant.signedUrl = new URL(`/storage/v1/object/upload/sign/franchise-quarantine/${runtime.grant.path}?token=${runtime.grant.signature}`, runtime.grant.endpoint).href;
  const input = Object.assign(Buffer.alloc(7 * 1024 * 1024), { size: 7 * 1024 * 1024, name: 'synthetic.pdf', type: 'application/pdf' });
  let puts = 0;
  const xhrFactory = () => ({ upload: {}, open(method) { assert.equal(method, 'PUT'); }, setRequestHeader() {},
    send(body) { puts++; assert.equal(body, input); this.status = 200; this.onload(); }, abort() {} });
  await uploadDocument(input, runtime.grant, { xhrFactory });
  assert.equal(puts, 1); assert.deepEqual(runtime.result().methods, ['POST']);
});
