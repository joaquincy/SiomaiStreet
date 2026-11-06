import test from 'node:test';
import assert from 'node:assert/strict';
import { submitReview } from '../src/api/reviewSubmission.js';

const review = { name: 'Synthetic reviewer', text: 'Synthetic feedback only.', rating: 5, branchId: '1' };
const receipt = { id: 'synthetic-review', status: 'pending' };

test('review waits for verification, sends the header token and requests a fresh token for retries', async () => {
  const order = []; let checks = 0;
  const verify = async action => { assert.equal(action, 'review'); order.push('verify'); return `fresh-${++checks}`; };
  const photo = new File(['synthetic'], 'test.png', { type: 'image/png' });
  const fetcher = async (url, options) => {
    order.push('post'); assert.equal(url, '/api/reviews');
    assert.equal(options.headers['x-turnstile-token'], `fresh-${checks}`);
    assert.equal(options.body.get('photo').name, 'test.png');
    assert.equal(options.body.get('displayName'), review.name);
    if (checks === 1) return Response.json({ error: 'Check expired; retry.' }, { status: 400 });
    return Response.json(receipt, { status: 201 });
  };
  await assert.rejects(submitReview({ ...review, photo, verify, fetcher }), /expired/);
  assert.deepEqual(await submitReview({ ...review, photo, verify, fetcher }), receipt);
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

test('invalid review photos fail before challenging and invalid receipts are not success', async () => {
  let checks = 0;
  await assert.rejects(submitReview({ ...review, photo: new File(['test'], 'test.svg', { type: 'image/svg+xml' }), verify: async () => { checks++; } }), /JPG, PNG or WebP/);
  assert.equal(checks, 0);
  await assert.rejects(submitReview({ ...review, verify: async () => 'token', fetcher: async () => Response.json({}) }), /receipt could not be confirmed/);
});

test('production review endpoint checks rate then Turnstile before multipart reads or writes', async t => {
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
    if (url.includes('/rest/v1/branches?')) { events.push('branch'); return Response.json([{ branch_id: 1 }]); }
    if (url.includes('/storage/v1/object/review-photos/')) { events.push('upload'); return Response.json({}); }
    if (url.endsWith('/rest/v1/reviews')) { events.push('insert'); return Response.json([receipt]); }
    throw new Error('Unexpected network request');
  };
  const { handleRequest } = await import('../server/index.js');
  const form = new FormData();
  form.set('displayName', review.name); form.set('text', review.text); form.set('rating', '5'); form.set('branchId', '1');
  form.set('photo', new File([new Uint8Array([255, 216, 255, 0])], 'synthetic.jpg', { type: 'image/jpeg' }));
  const wire = new Request('http://example.invalid', { method: 'POST', body: form });
  const bytes = Buffer.from(await wire.arrayBuffer());
  async function attempt(token) {
    events = []; let status, result;
    const headers = new Map();
    await handleRequest({ url: '/api/reviews', method: 'POST', socket: { remoteAddress: '127.0.0.1' },
      headers: { 'content-type': wire.headers.get('content-type'), ...(token ? { 'x-turnstile-token': token } : {}) },
      async *[Symbol.asyncIterator]() { events.push('parse'); yield bytes; },
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
  assert.equal((await attempt('synthetic-token')).status, 201);
  assert.deepEqual(events, ['rate', 'verify', 'parse', 'branch', 'upload', 'insert']);
});
