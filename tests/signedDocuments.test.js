import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { uploadSignedDocument } from '../src/api/signedDocuments.js';
import { uploadDocument } from '../src/api/resumableDocuments.js';
import { createUploadStorage } from '../server/directUploadServices.js';

const file = new File(['SYNTHETIC'], 'synthetic.jpg', { type: 'image/jpeg' });
const grant = {
  endpoint: 'https://synthetic.storage.supabase.co/storage/v1/upload/resumable',
  signedUrl: 'https://synthetic.supabase.co/storage/v1/object/upload/sign/franchise-quarantine/direct/test/govIdBack?token=synthetic-token',
  signature: 'synthetic-token', bucket: 'franchise-quarantine', path: 'direct/test/govIdBack',
};
function xhrStub(action = xhr => { xhr.status = 200; xhr.onload(); }) {
  return {
    upload: {}, headers: {},
    open(method, url) { this.method = method; this.url = url; },
    setRequestHeader(key, value) { this.headers[key] = value; },
    send(body) { this.body = body; queueMicrotask(() => action(this)); },
    abort() { this.aborted = true; this.onabort?.(); },
  };
}

test('small signed uploads send original bytes directly, report bounded progress and release listeners', async () => {
  const controller = new AbortController(), progress = [];
  const xhr = xhrStub(value => { value.upload.onprogress({ loaded: file.size + 20 }); value.status = 200; value.onload(); });
  await uploadDocument(file, grant, { signal: controller.signal, onProgress: bytes => progress.push(bytes), xhrFactory: () => xhr });
  assert.equal(xhr.method, 'PUT'); assert.equal(xhr.body, file);
  assert.equal(new URL(xhr.url).origin, 'https://synthetic.supabase.co');
  assert.deepEqual(xhr.headers, { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' });
  assert.deepEqual(progress, [file.size, file.size]);
  assert.equal(xhr.timeout, 120000);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  assert.equal(xhr.onload, null); assert.equal(xhr.upload.onprogress, null);
});

test('signed failures provide safe actionable errors without exposing provider bodies or signed URLs', async () => {
  for (const status of [400, 403, 409, 413, 415, 422, 429, 500]) {
    const xhr = xhrStub(value => { value.status = status; value.responseText = grant.signedUrl; value.onload(); });
    await assert.rejects(uploadSignedDocument(file, grant, { xhrFactory: () => xhr }), error => {
      assert.equal(error.status, status); assert.equal(error.uploadError, true);
      assert.match(error.message, /draft and completed files are kept/);
      assert.doesNotMatch(error.message, /synthetic-token|https:/); return true;
    });
    assert.equal(xhr.onerror, null);
  }
});

test('network interruption and timeout settle cleanly; cancellation aborts the transfer', async () => {
  for (const [event, status] of [['onerror', 0], ['ontimeout', 408]]) {
    const xhr = xhrStub(value => value[event]());
    await assert.rejects(uploadSignedDocument(file, grant, { xhrFactory: () => xhr }), error => error.status === status);
    assert.equal(xhr[event], null);
  }
  const controller = new AbortController(), xhr = xhrStub(() => {});
  const pending = uploadSignedDocument(file, grant, { signal: controller.signal, xhrFactory: () => xhr });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(xhr.aborted, true); assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('invalid grants cannot send bytes to another project, path or insecure origin', () => {
  const badGrants = [
    { signedUrl: grant.signedUrl.replace('synthetic.supabase', 'another.supabase') },
    { signedUrl: grant.signedUrl.replace('govIdBack?', 'govIdFront?') },
    { signedUrl: grant.signedUrl.replace('synthetic-token', 'different-token') },
    { endpoint: grant.endpoint.replace('https:', 'http:') },
    { bucket: 'franchise-documents' }, { signature: '' }, { path: '../govIdBack' },
    { endpoint: 'invalid' }, { signedUrl: 'invalid' },
  ];
  for (const override of badGrants) {
    assert.throws(() => uploadSignedDocument(file, { ...grant, ...override }, { xhrFactory: () => assert.fail('Must not create a request') }), /invalid/);
  }
});

test('storage issues compatible TUS and signed PUT grants without revealing server credentials', async () => {
  for (const tokenProperty of [true, false]) {
    const storage = createUploadStorage({ url: 'https://synthetic.supabase.co', serviceKey: 'private-server-key', request: async (path, options) => {
      assert.equal(options.headers['x-upsert'], 'false');
      assert.match(path, /franchise-quarantine\/direct\/test\/govIdBack$/);
      return tokenProperty ? { token: 'synthetic-token' } : { url: '/object/upload/sign/franchise-quarantine/direct/test/govIdBack?token=synthetic-token' };
    } });
    assert.deepEqual(await storage.sign(grant.path), { endpoint: grant.endpoint, signature: grant.signature, signedUrl: grant.signedUrl });
  }
});
