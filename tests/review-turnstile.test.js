import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { submitReview } from '../src/api/reviewSubmission.js';
import { createReviewSubmissionHandler } from '../server/reviewSubmission.js';
import { readMultipart } from '../server/multipart.js';

const review = { name: 'Synthetic reviewer', text: 'Synthetic feedback only.', rating: 5, branchId: '1' };
const receipt = { id: 'synthetic-review', status: 'pending' };

test('review waits for verification, sends submissionId and header token, and requests a fresh token for retries', async () => {
  const order = []; let checks = 0;
  const submissionId = randomUUID();
  const verify = async action => { assert.equal(action, 'review'); order.push('verify'); return `fresh-${++checks}`; };
  const photo = new File(['synthetic'], 'test.png', { type: 'image/png' });
  const fetcher = async (url, options) => {
    order.push('post'); assert.equal(url, '/api/reviews');
    assert.equal(options.headers['x-turnstile-token'], `fresh-${checks}`);
    assert.equal(options.body.get('submissionId'), submissionId);
    assert.equal(options.body.get('photo').name, 'test.png');
    assert.equal(options.body.get('displayName'), review.name);
    if (checks === 1) return Response.json({ error: 'Check expired; retry.' }, { status: 400 });
    return Response.json({ ...receipt, submissionId }, { status: 201 });
  };
  await assert.rejects(submitReview({ ...review, submissionId, photo, verify, fetcher }), /expired/);
  assert.deepEqual(await submitReview({ ...review, submissionId, photo, verify, fetcher }), { ...receipt, submissionId });
  assert.deepEqual(order, ['verify', 'post', 'verify', 'post']);
  assert.equal(photo.size, 9);
});

test('cancelled, unavailable and aborted verification never posts review/photos', async () => {
  let posts = 0;
  const fetcher = async () => { posts++; return Response.json(receipt); };
  for (const message of ['Verification cancelled. Your answers have been kept.', 'Security check unavailable.']) {
    await assert.rejects(submitReview({ ...review, fetcher, verify: async () => { throw new Error(message); } }), { message });
  }
  const controller = new AbortController();
  await assert.rejects(submitReview({ ...review, fetcher, signal: controller.signal, verify: async () => { controller.abort(); return 'late-token'; } }), { name: 'AbortError' });
  assert.equal(posts, 0);
});

test('invalid review photos or submissionId fail before challenging and invalid receipts are not success', async () => {
  let checks = 0;
  await assert.rejects(submitReview({ ...review, submissionId: 'not-a-uuid', verify: async () => { checks++; } }), /out of date/);
  await assert.rejects(submitReview({ ...review, photo: new File(['test'], 'test.svg', { type: 'image/svg+xml' }), verify: async () => { checks++; } }), /JPG, PNG or WebP/);
  assert.equal(checks, 0);
  await assert.rejects(submitReview({ ...review, verify: async () => 'token', fetcher: async () => Response.json({}) }), /receipt could not be confirmed/);
  await assert.rejects(
    submitReview({ ...review, submissionId: randomUUID(), verify: async () => 'token', fetcher: async () => Response.json({ ...receipt, submissionId: randomUUID() }) }),
    /receipt could not be confirmed/,
  );
});

test('production review endpoint checks rate then Turnstile before multipart reads or writes, and replays idempotent retries', async t => {
  // Isolated test process: no local env files or actual provider calls.
  const env = { SIOMAI_SERVERLESS: 'true', NODE_ENV: 'production', SUPABASE_URL: 'https://db.example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-key', APPLICATION_RATE_SECRET: 'r'.repeat(32), TURNSTILE_SECRET_KEY: 'synthetic-turnstile',
    TURNSTILE_HOSTNAMES: 'example.invalid', TURNSTILE_ENABLED: 'false' };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let events, verdict, rateAllowed = true, failProvider = false;
  const savedBySubmissionId = new Map();
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/rpc/consume_rate_policies')) {
      events.push('rate');
      const requested = JSON.parse(options.body).p_policies;
      return Response.json({ allowed: rateAllowed, policies: requested.map(p => ({ key_hash: p.key_hash, limit: p.max_requests,
        windowSeconds: p.window_seconds, allowed: rateAllowed, remaining: rateAllowed ? p.max_requests - 1 : 0, resetAfter: p.window_seconds })) });
    }
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      events.push('verify');
      assert.equal(JSON.parse(options.body).response, 'synthetic-token');
      if (failProvider) throw new Error('Synthetic provider failure');
      return Response.json(verdict);
    }
    if (url.includes('/rest/v1/reviews?select=')) {
      events.push('lookup');
      const match = url.match(/submission_id=eq\.([0-9a-f-]{36})/i);
      const row = match ? savedBySubmissionId.get(match[1].toLowerCase()) : null;
      return Response.json(row ? [row] : []);
    }
    if (url.includes('/rest/v1/branches?')) { events.push('branch'); return Response.json([{ branch_id: 1 }]); }
    if (url.includes('/storage/v1/object/review-photos/')) { events.push('upload'); return Response.json({}); }
    if (url.endsWith('/rest/v1/reviews')) {
      events.push('insert');
      const payload = JSON.parse(options.body);
      const saved = { ...receipt, ...payload };
      savedBySubmissionId.set(payload.submission_id, saved);
      return Response.json([saved]);
    }
    throw new Error(`Unexpected network request: ${url}`);
  };
  const { handleRequest } = await import('../server/index.js');
  const submissionId = randomUUID();
  const buildBytes = async (overrides = {}) => {
    const form = new FormData();
    form.set('submissionId', overrides.submissionId ?? submissionId);
    form.set('displayName', overrides.name ?? review.name);
    form.set('text', overrides.text ?? review.text);
    form.set('rating', String(overrides.rating ?? 5));
    form.set('branchId', String(overrides.branchId ?? 1));
    form.set('photo', overrides.photo ?? new File([new Uint8Array([255, 216, 255, 0])], 'synthetic.jpg', { type: 'image/jpeg' }));
    const wire = new Request('http://example.invalid', { method: 'POST', body: form });
    return { contentType: wire.headers.get('content-type'), bytes: Buffer.from(await wire.arrayBuffer()) };
  };
  const initialWire = await buildBytes();
  async function attempt(token, wirePayload = initialWire) {
    events = []; let status, result;
    const headers = new Map();
    await handleRequest({ url: '/api/reviews', method: 'POST', socket: { remoteAddress: '127.0.0.1' },
      headers: { 'content-type': wirePayload.contentType, ...(token ? { 'x-turnstile-token': token } : {}) },
      async *[Symbol.asyncIterator]() { events.push('parse'); yield wirePayload.bytes; },
    }, { setHeader(k, v) { headers.set(k, v); }, removeHeader(k) { headers.delete(k); },
      writeHead(code) { status = code; }, end(body) { result = JSON.parse(body); } });
    return { status, result };
  }
  assert.equal((await attempt()).status, 400);
  assert.deepEqual(events, ['rate']);
  rateAllowed = false;
  assert.equal((await attempt('synthetic-token')).status, 429);
  assert.deepEqual(events, ['rate']);
  rateAllowed = true;
  for (const invalid of [
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'evil.invalid', action: 'review' },
    { success: true, hostname: 'example.invalid', action: 'application' },
  ]) {
    verdict = invalid;
    assert.equal((await attempt('synthetic-token')).status, 400);
    assert.deepEqual(events, ['rate', 'verify']);
  }
  failProvider = true;
  assert.equal((await attempt('synthetic-token')).status, 503);
  assert.deepEqual(events, ['rate', 'verify']);
  failProvider = false;
  verdict = { success: true, hostname: 'example.invalid', action: 'review' };
  const first = await attempt('synthetic-token');
  assert.equal(first.status, 201);
  assert.deepEqual(first.result, { ...receipt, submissionId });
  assert.deepEqual(events, ['rate', 'verify', 'parse', 'lookup', 'branch', 'upload', 'insert']);

  // Identical retry after lost response returns existing receipt without uploading or inserting again.
  const retry = await attempt('synthetic-token');
  assert.equal(retry.status, 200);
  assert.deepEqual(retry.result, { ...receipt, submissionId, replayed: true });
  assert.deepEqual(events, ['rate', 'verify', 'parse', 'lookup']);
  assert.equal(savedBySubmissionId.size, 1);

  // Modified retry under the same submissionId is rejected with 409 Conflict.
  const modified = await attempt('synthetic-token', await buildBytes({ text: 'Changed review text under same submission ID.' }));
  assert.equal(modified.status, 409);
  assert.deepEqual(events, ['rate', 'verify', 'parse', 'lookup']);
});

test('review submission handler recovers unique-key race and lost commit response without deleting winner photo', async () => {
  const rows = new Map();
  const uploaded = new Set();
  const deleted = [];
  let loseCommitResponse = false;

  const handler = createReviewSubmissionHandler({
    json: (res, status, body) => Object.assign(res, { status, body }),
    rate: async () => true,
    verify: async () => {},
    readMultipart,
    uploadFile: async (_bucket, path) => {
      await new Promise(resolve => setImmediate(resolve));
      uploaded.add(path);
    },
    deleteStorageObjects: async (_bucket, paths) => {
      for (const path of paths) {
        uploaded.delete(path);
        deleted.push(path);
      }
    },
    request: async (path, options = {}) => {
      if (path.startsWith('/rest/v1/reviews?select=')) {
        const match = path.match(/submission_id=eq\.([0-9a-f-]{36})/i);
        const row = match ? rows.get(match[1].toLowerCase()) : null;
        return row ? [row] : [];
      }
      if (path.startsWith('/rest/v1/branches?')) return [{ branch_id: 1 }];
      if (path === '/rest/v1/reviews' && options.method === 'POST') {
        const payload = JSON.parse(options.body);
        if (rows.has(payload.submission_id)) {
          throw Object.assign(new Error('duplicate key value violates unique constraint "reviews_submission_id_key"'), { status: 409 });
        }
        const saved = { id: `review-${rows.size + 1}`, ...payload };
        rows.set(payload.submission_id, saved);
        if (loseCommitResponse) {
          loseCommitResponse = false;
          throw new Error('COMMIT succeeded but HTTP response was lost');
        }
        return [saved];
      }
      throw new Error(`Unexpected request: ${path}`);
    },
  });

  const send = async (submissionId, extra = {}) => {
    const form = new FormData();
    form.set('submissionId', submissionId);
    form.set('displayName', extra.name ?? review.name);
    form.set('text', extra.text ?? review.text);
    form.set('rating', String(extra.rating ?? review.rating));
    form.set('branchId', String(extra.branchId ?? review.branchId));
    form.set('photo', new File([new Uint8Array([255, 216, 255, 0])], 'photo.jpg', { type: 'image/jpeg' }));
    const wire = new Request('http://example.invalid', { method: 'POST', body: form });
    const bytes = Buffer.from(await wire.arrayBuffer());
    const res = { setHeader() {} };
    await handler({
      headers: { 'content-type': wire.headers.get('content-type') },
      async *[Symbol.asyncIterator]() { yield bytes; },
    }, res);
    return res;
  };

  // 1. Lost commit response: DB row and winner photo are preserved, receipt is returned.
  const lostId = randomUUID();
  loseCommitResponse = true;
  const recovered = await send(lostId);
  assert.equal(recovered.status, 200);
  assert.equal(recovered.body.id, 'review-1');
  assert.equal(recovered.body.submissionId, lostId);
  assert.equal(recovered.body.replayed, true);
  assert.equal(uploaded.has(rows.get(lostId).photo_path), true, 'winner photo must not be deleted');
  assert.equal(deleted.length, 0);

  // 2. Concurrent duplicate submission race: one row saved, loser photo cleaned up, both get same receipt.
  const raceId = randomUUID();
  const [first, second] = await Promise.all([send(raceId), send(raceId)]);
  assert.equal(first.body.id, second.body.id);
  assert.equal(rows.size, 2);
  assert.equal(uploaded.has(rows.get(raceId).photo_path), true);
  assert.equal(deleted.length, 1, 'loser duplicate photo is cleaned up');
});

test('review submission idempotency SQL migration enforces unique submission_id and hash pairing while preserving legacy rows', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.reviews (
        id uuid primary key,
        display_name text not null,
        rating smallint not null,
        review_text text not null,
        status text not null default 'pending'
      );
      insert into public.reviews (id, display_name, rating, review_text) values
        ('${randomUUID()}', 'Legacy 1', 5, 'Legacy review one'),
        ('${randomUUID()}', 'Legacy 2', 4, 'Legacy review two');
    `);
    const sql = await readFile(new URL('../supabase/migrations/20261106000000_review_submission_idempotency.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql);

    const subId = randomUUID();
    const hash = 'a'.repeat(64);
    await db.query(
      'insert into public.reviews (id, submission_id, request_hash, display_name, rating, review_text) values ($1, $2, $3, $4, $5, $6)',
      [randomUUID(), subId, hash, 'Reviewer', 5, 'Great siomai'],
    );
    await assert.rejects(
      db.query(
        'insert into public.reviews (id, submission_id, request_hash, display_name, rating, review_text) values ($1, $2, $3, $4, $5, $6)',
        [randomUUID(), subId, hash, 'Reviewer', 5, 'Great siomai'],
      ),
      /unique|duplicate/i,
    );
    await assert.rejects(
      db.query(
        'insert into public.reviews (id, submission_id, request_hash, display_name, rating, review_text) values ($1, $2, $3, $4, $5, $6)',
        [randomUUID(), randomUUID(), null, 'Reviewer', 5, 'Missing hash'],
      ),
      /reviews_submission_hash_pair_check/i,
    );
  } finally {
    await db.close();
  }
});
