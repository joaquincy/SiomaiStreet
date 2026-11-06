import test from 'node:test';
import assert from 'node:assert/strict';
import { createCameraSession, captureDimensions, cameraErrorMessage } from '../src/utils/documentCamera.js';
import { lockDocumentScroll } from '../src/utils/documentScrollLock.js';

function fakeStream() {
  let stops = 0;
  return { getTracks: () => [{ stop: () => stops++ }], stops: () => stops };
}
test('camera requests video only; stops old stream before switching and releases once', async () => {
  const streams = [], constraints = [];
  const session = createCameraSession({ getUserMedia: async options => { constraints.push(options); const s = fakeStream(); streams.push(s); return s; } });
  await session.open(); await session.open('user');
  assert.equal(streams[0].stops(), 1);
  assert.equal(constraints[0].audio, false);
  assert.equal(constraints[0].video.facingMode.ideal, 'environment');
  assert.equal(constraints[1].video.facingMode.ideal, 'user');
  session.stop(); session.stop();
  assert.equal(streams[1].stops(), 1);
});
test('late permission grant after cancellation cannot leave camera running', async () => {
  let resolve;
  const stream = fakeStream();
  const session = createCameraSession({ getUserMedia: () => new Promise(r => { resolve = r; }) });
  const pending = session.open();
  await Promise.resolve();
  session.stop();
  await assert.rejects(pending, { name: 'AbortError' });
  resolve(stream); await new Promise(r => setImmediate(r));
  assert.equal(stream.stops(), 1);
});
test('permission deadline allows retry and stops a stream arriving after timeout', async () => {
  let resolve;
  const session = createCameraSession({ getUserMedia: () => new Promise(r => { resolve = r; }) }, 5);
  await assert.rejects(session.open(), /too long/);
  const stream = fakeStream(); resolve(stream); await new Promise(r => setImmediate(r));
  assert.equal(stream.stops(), 1); session.stop();
});
test('cancel before request microtask avoids asking permission', async () => {
  let calls = 0;
  const session = createCameraSession({ getUserMedia: () => { calls++; } });
  const pending = session.open(); session.stop();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls, 0);
});
test('capture bounds preserve orientation, never upscale, and reject unready frames', () => {
  assert.deepEqual(captureDimensions(4000, 3000), { width: 2400, height: 1800 });
  assert.deepEqual(captureDimensions(3000, 4000, 1200), { width: 900, height: 1200 });
  assert.deepEqual(captureDimensions(640, 480), { width: 640, height: 480 });
  for (const bad of [0, NaN, Infinity, -2]) assert.throws(() => captureDimensions(bad, 100));
  assert.match(cameraErrorMessage({ name: 'NotAllowedError' }), /choose a photo/);
});
test('nested preview and camera scroll locks release safely in either order', () => {
  const original = globalThis.document;
  globalThis.document = { body: { style: { overflow: 'auto' } } };
  try {
    for (const reverse of [false, true]) {
      const a = lockDocumentScroll(), b = lockDocumentScroll();
      (reverse ? a : b)(); assert.equal(document.body.style.overflow, 'hidden');
      (reverse ? b : a)(); a(); b(); assert.equal(document.body.style.overflow, 'auto');
    }
  } finally { if (original) globalThis.document = original; else delete globalThis.document; }
});
