import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createSharedApplicationRateLimit } from '../server/applicationSecurity.js';
import { withRateFeedback, recordRateFeedback, rateFeedbackResponse } from '../server/rateFeedback.js';
import { createRateFeedbackClient, formatRateWait } from '../src/utils/rateLimits.js';
import { RATE_POLICIES } from '../shared/ratePolicies.js';

const policy = (changes = {}) => {
  const scope = changes.scope || 'upload-start', rule = Object.hasOwn(RATE_POLICIES, scope) ? RATE_POLICIES[scope] : RATE_POLICIES['upload-start'];
  return { scope, ...rule, remaining: 2, resetAfter: Math.min(360, rule.windowSeconds), allowed: true, ...changes };
};
const response = (p, status = 200) => Response.json({ ok: status === 200 }, { status, headers: { 'X-RateLimit-Policies': JSON.stringify(Array.isArray(p) ? p : [p]) } });

test('SQL retains existing counters, expires from first request, denies excess and restricts RPC access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table application_rate_windows(key_hash text primary key, requests integer not null, expires_at timestamptz not null);
      alter table application_rate_windows enable row level security;
      revoke all on application_rate_windows from public, anon, authenticated;`);
    const key = 'a'.repeat(64);
    await db.query("insert into application_rate_windows values ($1,3,now()+interval '6 minutes')", [key]);
    const initialExpiry = (await db.query('select expires_at from application_rate_windows')).rows[0].expires_at;
    const sql = await readFile(new URL('../supabase/migrations/20261103010000_rate_limit_feedback.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql); // Safe to apply twice; counters survive.
    const consume = async (id = key, max = 4) => (await db.query('select consume_application_rate_status($1,$2) as p', [id, max])).rows[0].p;
    const last = await consume();
    assert.equal(last.allowed, true); assert.equal(last.remaining, 0); assert.ok(last.resetAfter <= 360);
    for (let i = 0; i < 3; i++) { const denied = await consume(); assert.equal(denied.allowed, false); assert.equal(denied.remaining, 0); }
    assert.equal((await db.query('select expires_at from application_rate_windows')).rows[0].expires_at.getTime(), initialExpiry.getTime());
    await db.query("update application_rate_windows set expires_at=now()-interval '1 second' where key_hash=$1", [key]);
    const reset = await consume(); assert.equal(reset.remaining, 3); assert.equal(reset.resetAfter, 3600);
    const parallel = await Promise.all(Array.from({ length: 8 }, () => consume('b'.repeat(64))));
    assert.equal(parallel.filter(p => p.allowed).length, 4);
    await assert.rejects(consume('invalid'), /Invalid rate policy/);
    await assert.rejects(consume(key, 101), /Invalid rate policy/);
    await db.exec('set role anon'); await assert.rejects(consume(), /permission denied/);
    await assert.rejects(db.query('select * from application_rate_windows'), /permission denied/);
    await db.exec('reset role; set role service_role'); assert.equal((await consume('c'.repeat(64))).remaining, 3);
  } finally { await db.close(); }
});

test('server feedback is isolated per concurrent request, ages correctly and replaces inaccurate Retry-After', async () => {
  const run = (scope, wait, time) => withRateFeedback(async () => {
    recordRateFeedback(policy({ scope, allowed: false, remaining: 0, resetAfter: wait }), 1000);
    await new Promise(resolve => setTimeout(resolve, time));
    const headers = new Map([['Retry-After', '3600']]);
    const body = rateFeedbackResponse({ setHeader: (key, value) => headers.set(key, value) }, 429, { error: 'old', accepted: false }, 21000);
    return { headers, body };
  });
  const [a, b] = await Promise.all([run('upload-start', 360, 8), run('portal', 100, 1)]);
  assert.equal(a.headers.get('Retry-After'), '340'); assert.equal(b.headers.get('Retry-After'), '80');
  assert.equal(a.body.accepted, false); assert.equal(a.body.retryAfter, 340);
  const policies = JSON.parse(a.headers.get('X-RateLimit-Policies'));
  assert.deepEqual(policies, [policy({ allowed: false, remaining: 0, resetAfter: 340 })]);
  let leaked = false; rateFeedbackResponse({ setHeader: () => { leaked = true; } }, 200, {}); assert.equal(leaked, false);
});

test('shared limiter validates feedback and never exposes scoped HMAC or raw identity', async () => {
  const received = []; let result; let hash;
  const limit = createSharedApplicationRateLimit({ secret: 'synthetic-secret'.repeat(3),
    rpc: async ({ p_policies }) => { hash = p_policies[0].key_hash; return result === undefined ? { allowed: true, policies: [{ ...policy({ scope: 'portal' }), key_hash: hash }] } : result; }, onResult: p => received.push(p) });
  assert.equal(await limit('192.0.2.1', 'portal', 60), true);
  assert.match(hash, /^[a-f0-9]{64}$/); assert.deepEqual(received, [policy({ scope: 'portal' })]);
  for (const invalid of [null, {}, true, { unavailable: true }, ...[policy({ resetAfter: 3601 }), policy({ remaining: -1 }), policy({ allowed: false, remaining: 1 })].map(p => ({ allowed: true, policies: [{ ...p, key_hash: hash }] }))]) {
    result = invalid; await assert.rejects(limit('192.0.2.1', 'portal', 60), { status: 503 });
  }
});

test('browser warns before the limit, deduplicates warnings, and blocks clicks without extending countdown', async () => {
  let time = 0, calls = 0;
  const client = createRateFeedbackClient({ now: () => time, fetcher: async () => { calls++; return response(policy({ remaining: 0, allowed: false, resetAfter: 359 }), 429); } });
  client.observe(response(policy())); assert.equal(client.getSnapshot().remaining, 2);
  client.dismiss(); time = 1000;
  client.observe(response(policy({ resetAfter: 359 }))); assert.equal(client.getSnapshot(), null);
  assert.equal((await client.fetch('/api/franchise-applications/uploads', { method: 'POST' })).status, 429);
  assert.equal(calls, 1); const expiry = client.getSnapshot().expiresAt;
  client.dismiss(); time = 60000;
  const blocked = await client.fetch('/api/franchise-applications/uploads', { method: 'POST' });
  assert.equal(calls, 1); assert.equal(blocked.headers.get('Retry-After'), '300');
  assert.equal(client.getSnapshot().expiresAt, expiry);
  assert.throws(() => client.assertReady('/api/franchise-applications/uploads', { method: 'POST' }), { status: 429 });
  time = expiry + 1; await client.fetch('/api/franchise-applications/uploads', { method: 'POST' }); assert.equal(calls, 2);
  assert.equal(formatRateWait(3600), '60:00'); assert.equal(formatRateWait(-2), '0:00');
});

test('conditional quotas never prevent existing-session or receipt retries, nor cached map queries', async () => {
  let calls = 0;
  const client = createRateFeedbackClient({ fetcher: async () => { calls++; return Response.json({ receipt: 'synthetic' }); } });
  for (const scope of ['new-application', 'new-correction', 'contact-new', 'place-search-global']) client.observe(response(policy({ scope, remaining: 0, allowed: false }), 429));
  for (const path of ['/api/franchise-applications/uploads', '/api/application-status/a/corrections/b/uploads', '/api/contact-inquiries', '/api/place-search']) {
    assert.doesNotThrow(() => client.assertReady(path, { method: 'POST' }));
    assert.equal((await client.fetch(path, { method: 'POST' })).status, 200);
  }
  assert.equal(calls, 4);
});

test('bounded parsing rejects malformed feedback, resists out-of-order responses and respects abort', async () => {
  let calls = 0; const client = createRateFeedbackClient({ now: () => 0, fetcher: async () => { calls++; return Response.json({}); } });
  for (const raw of ['{bad', '{}', '[null]', 'x'.repeat(10001), JSON.stringify([policy({ scope: '__proto__' })]), JSON.stringify([policy({ resetAfter: -1 })])]) {
    client.observe(new Response('{}', { headers: { 'X-RateLimit-Policies': raw } })); assert.equal(client.getSnapshot(), null);
  }
  client.observe(response(policy({ remaining: 0 })));
  client.observe(response(policy({ remaining: 1, resetAfter: 361 })));
  assert.equal(client.getSnapshot().remaining, 0); assert.equal(client.getSnapshot().expiresAt, 360000);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(client.fetch('/api/franchise-applications/uploads', { method: 'POST', signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('multi-document feedback waits until the operation finishes and unsubscribes safely', () => {
  const client = createRateFeedbackClient(); let notifications = 0;
  const unsubscribe = client.subscribe(() => notifications++), finish = client.beginBatch();
  client.observe(response(policy())); client.observe(response(policy({ scope: 'upload-control', limit: 100, remaining: 9 })));
  assert.equal(client.getSnapshot(), null);
  const before = notifications;
  finish(); finish(); assert.equal(notifications, before + 1); assert.equal(client.getSnapshot().scope, 'upload-control');
  unsubscribe(); client.dismiss(); assert.equal(notifications, before + 1); client.dispose();
});

test('every public rate-limited action has a local cooldown, other actions remain available', async () => {
  const cases = [ ['upload-start', 'POST', '/api/application-status/a/corrections/b/uploads'],
    ['upload-control', 'POST', '/api/franchise-applications/uploads/a/check/govIdFront'], ['portal', 'GET', '/api/application-status/a'],
    ['contact-ingress', 'POST', '/api/contact-inquiries'], ['review-submit', 'POST', '/api/reviews'],
    ['review-helpful', 'POST', '/api/reviews/a/helpful'], ['place-search-client', 'POST', '/api/place-search'], ['route-client', 'POST', '/api/store-route'] ];
  for (const [scope, method, path] of cases) {
    let calls = 0; const client = createRateFeedbackClient({ fetcher: async () => { calls++; return Response.json({}); } });
    client.observe(response(policy({ scope, remaining: 0, allowed: false }), 429));
    assert.equal((await client.fetch(path, { method })).status, 429); assert.equal(calls, 0);
    assert.equal((await client.fetch('/api/branches')).status, 200); assert.equal(calls, 1);
  }
});
