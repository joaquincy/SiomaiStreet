import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, getEventListeners } from 'node:events';
import { createUploadCheckQueue } from '../server/uploadCheckQueue.js';

const connection = () => ({ req: new EventEmitter(), res: new EventEmitter() });

test('document queue admits two checks and starts waiting checks in order when released', async () => {
  const acquire = createUploadCheckQueue();
  const releases = [await acquire(), await acquire()];
  const admissions = [];
  const third = acquire().then(release => { admissions.push(3); return release; });
  const fourth = acquire().then(release => { admissions.push(4); return release; });
  await Promise.resolve(); assert.deepEqual(admissions, []);
  releases[0](); releases[0](); // Release is idempotent; this cannot admit two waiters.
  const releaseThird = await third;
  assert.deepEqual(admissions, [3]);
  releases[1](); const releaseFourth = await fourth;
  assert.deepEqual(admissions, [3, 4]);
  releaseThird(); releaseFourth();
});

test('document queue caps waiters, times out cleanly and remains usable', async () => {
  const acquire = createUploadCheckQueue({ maxActive: 1, maxWaiting: 1, waitMs: 15 });
  const release = await acquire(); const { req, res } = connection();
  const pending = assert.rejects(acquire(req, res), error => error.status === 503 && /still busy/.test(error.message));
  await assert.rejects(acquire(), error => error.status === 503 && /busy/.test(error.message));
  await pending;
  assert.equal(getEventListeners(req, 'aborted').length, 0);
  assert.equal(getEventListeners(res, 'close').length, 0);
  release(); const next = await acquire(); next();
});

test('aborted requests and closed responses leave no queued work or listeners', async () => {
  for (const event of ['aborted', 'close']) {
    const acquire = createUploadCheckQueue({ maxActive: 1, maxWaiting: 1 });
    const release = await acquire(); const { req, res } = connection();
    const cancelled = assert.rejects(acquire(req, res), error => error.status === 503 && /cancelled/.test(error.message));
    (event === 'aborted' ? req : res).emit(event);
    await cancelled;
    assert.equal(getEventListeners(req, 'aborted').length, 0);
    assert.equal(getEventListeners(res, 'close').length, 0);
    const next = acquire(); release(); (await next)();
  }
});

test('admitting queued work clears its timeout and disconnect listeners', async () => {
  const acquire = createUploadCheckQueue({ maxActive: 1, waitMs: 15 });
  const release = await acquire(); const { req, res } = connection();
  const next = acquire(req, res); release(); const releaseNext = await next;
  assert.equal(getEventListeners(req, 'aborted').length, 0);
  assert.equal(getEventListeners(res, 'close').length, 0);
  req.emit('aborted'); res.emit('close');
  releaseNext();
  const remaining = await acquire(); remaining();
});

test('requests disconnected before admission never consume capacity', async () => {
  const acquire = createUploadCheckQueue({ maxActive: 1 });
  await assert.rejects(acquire({ aborted: true }, {}), /cancelled/);
  await assert.rejects(acquire({}, { destroyed: true }), /cancelled/);
  const release = await acquire(); release();
});
