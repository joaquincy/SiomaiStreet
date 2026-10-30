import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DRAFT_TTL_MS, isDraftCurrent, loadApplicationDraft, loadDraftDocuments, saveDraftDocuments, clearApplicationDraft } from '../src/utils/applicationDraft.js';

// Small storage fault simulator: exercises our async success/error handling,
// not IndexedDB's implementation. Real-browser coverage is tracked separately.
function storageHarness(t, { draft = null, records = [], textFailure = false, fileFailure = false } = {}) {
  const previous = globalThis.window;
  const state = { draft, records, textFailure, fileFailure, fileClears: 0, closed: 0 };
  globalThis.window = {
    localStorage: {
      getItem: () => state.draft,
      removeItem: () => {
        if (state.textFailure) throw new Error('localStorage denied');
        state.draft = null;
      },
    },
    indexedDB: {
      open: () => {
        const request = {};
        queueMicrotask(() => {
          if (state.fileFailure) {
            request.error = new Error('IndexedDB denied');
            request.onerror();
            return;
          }
          request.result = {
            close: () => { state.closed++; },
            transaction: () => {
              const transaction = {
                objectStore: () => ({
                  clear: () => { state.fileClears++; state.records = []; },
                  put: record => state.records.push(record),
                  getAll: () => {
                    const read = {};
                    queueMicrotask(() => { read.result = state.records; read.onsuccess(); });
                    return read;
                  },
                }),
              };
              queueMicrotask(() => transaction.oncomplete?.());
              return transaction;
            },
          };
          request.onsuccess();
        });
        return request;
      },
    },
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
  return state;
}

test('draft expiry rejects the exact seven-day boundary, missing and future timestamps', () => {
  const now = Date.now();
  const draft = { requestId: randomUUID(), updatedAt: new Date(now).toISOString() };
  assert.equal(isDraftCurrent(draft, now), true);
  assert.equal(isDraftCurrent(draft, now + DRAFT_TTL_MS - 1), true);
  assert.equal(isDraftCurrent(draft, now + DRAFT_TTL_MS), false);
  assert.equal(isDraftCurrent({ ...draft, updatedAt: undefined }, now), false);
  assert.equal(isDraftCurrent({ ...draft, updatedAt: 'bad' }, now), false);
  assert.equal(isDraftCurrent(draft, now - 1), false);
});

test('expired answers and orphaned documents are not restored and both stores are cleared', async t => {
  const draft = { requestId: randomUUID(), updatedAt: new Date(Date.now() - DRAFT_TTL_MS).toISOString(), formData: { firstName: 'Expired synthetic applicant' } };
  const state = storageHarness(t, { draft: JSON.stringify(draft), records: [{ key: 'govIdFront', file: new File(['test'], 'test.pdf') }] });
  const loaded = loadApplicationDraft();
  assert.deepEqual(loaded.formData, {});
  assert.notEqual(loaded.requestId, draft.requestId);
  assert.equal(loaded.discarded, true);
  assert.deepEqual(await loadDraftDocuments(loaded.requestId), {});
  assert.equal(state.draft, null);
  assert.deepEqual(state.records, []);
  assert.equal(state.closed, 1);
});

test('document drafts retain their request ID and never restore another application’s files', async t => {
  const requestId = randomUUID();
  const state = storageHarness(t, { draft: JSON.stringify({ requestId, updatedAt: new Date().toISOString() }) });
  const file = new File(['synthetic'], 'test.pdf', { type: 'application/pdf' });
  await saveDraftDocuments({ govIdFront: file }, requestId);
  assert.equal(state.records[0].requestId, requestId);
  assert.equal((await loadDraftDocuments(requestId)).govIdFront, file);
  state.records.push({ key: 'proofOfFunds', file, requestId: randomUUID() });
  assert.deepEqual(Object.keys(await loadDraftDocuments(requestId)), ['govIdFront']);
  await assert.rejects(loadDraftDocuments(randomUUID()), /another tab/);
});

test('cleanup still clears files when localStorage fails, reports failure and permits retry', async t => {
  const state = storageHarness(t, { draft: 'sensitive synthetic data', records: [{ key: 'test' }], textFailure: true });
  await assert.rejects(clearApplicationDraft(), /cleanup failed/);
  assert.equal(state.fileClears, 1);
  assert.deepEqual(state.records, []);
  assert.notEqual(state.draft, null);
  state.textFailure = false;
  await clearApplicationDraft();
  assert.equal(state.draft, null);
});

test('cleanup still removes answers when IndexedDB fails and never reports success', async t => {
  const state = storageHarness(t, { draft: 'synthetic', fileFailure: true });
  await assert.rejects(clearApplicationDraft(), /cleanup failed/);
  assert.equal(state.draft, null);
  state.fileFailure = false;
  await clearApplicationDraft();
});

test('expired draft cleanup failures propagate instead of restoring sensitive files', async t => {
  storageHarness(t, { draft: 'not-json', fileFailure: true });
  assert.deepEqual(loadApplicationDraft().formData, {});
  await assert.rejects(loadDraftDocuments(randomUUID()), /cleanup failed/);
});

test('inaccessible metadata does not delete potentially valid saved documents', async t => {
  const state = storageHarness(t, { records: [{ key: 'synthetic' }] });
  globalThis.window.localStorage.getItem = () => { throw new Error('Storage blocked'); };
  assert.deepEqual(loadApplicationDraft().formData, {});
  await assert.rejects(loadDraftDocuments(randomUUID()), /Storage blocked/);
  assert.equal(state.fileClears, 0);
  assert.equal(state.records.length, 1);
});
