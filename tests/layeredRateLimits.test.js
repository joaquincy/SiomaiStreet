import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createSharedApplicationRateLimit, rateNetwork, clientIP } from '../server/applicationSecurity.js';
import { RATE_POLICIES } from '../shared/ratePolicies.js';
import { createRateFeedbackClient } from '../src/utils/rateLimits.js';
import { withRateFeedback, recordRateFeedback, rateFeedbackResponse } from '../server/rateFeedback.js';

const secret = 'synthetic-layered-rate-secret'.repeat(2);
const hash = scope => createHmac('sha256', secret).update(`${scope}:192.0.2.1`).digest('hex');
const burst = { key_hash: hash('upload-start-burst'), max_requests: 5, window_seconds: 300 };
const hour = { key_hash: hash('upload-start'), max_requests: 20, window_seconds: 3600 };
const sqlFile = new URL('../supabase/migrations/20261103020000_layered_rate_limits.sql', import.meta.url);
const feedback = (scope, remaining = 0, resetAfter) => ({ scope, ...RATE_POLICIES[scope], remaining, allowed: remaining > 0, resetAfter: resetAfter || RATE_POLICIES[scope].windowSeconds });
const response = policies => Response.json({}, { status: 429, headers: { 'X-RateLimit-Policies': JSON.stringify(policies) } });

test('layered SQL is atomic, keeps hourly counters, never extends denied windows and resets independently', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table application_rate_windows(key_hash text primary key, requests integer not null, expires_at timestamptz not null);
      alter table application_rate_windows enable row level security;
      revoke all on application_rate_windows from public,anon,authenticated;`);
    await db.query("insert into application_rate_windows values ($1,10,clock_timestamp()+interval '30 minutes')", [hour.key_hash]);
    const sql = await readFile(sqlFile, 'utf8'); await db.exec(sql); await db.exec(sql);
    const consume = async (policies = [burst, hour]) => (await db.query('select consume_rate_policies($1) as result', [JSON.stringify(policies)])).rows[0].result;
    const states = async () => (await db.query('select * from application_rate_windows order by key_hash')).rows;
    const admitted = await Promise.all(Array.from({ length: 12 }, () => consume()));
    assert.equal(admitted.filter(r => r.allowed).length, 5);
    assert.equal(admitted.at(-1).policies.find(p => p.key_hash === hour.key_hash).remaining, 5);
    const before = await states();
    for (let i = 0; i < 4; i++) assert.equal((await consume()).allowed, false);
    assert.deepEqual(await states(), before, 'denials neither increment nor extend either window');
    await db.query("update application_rate_windows set expires_at=clock_timestamp()-interval '1 second' where key_hash=$1", [burst.key_hash]);
    assert.equal((await consume()).allowed, true); // No browser reload or scheduled reset job.
    await db.query('update application_rate_windows set requests=20 where key_hash=$1', [hour.key_hash]);
    const bCount = (await states()).find(p => p.key_hash === burst.key_hash).requests;
    assert.equal((await consume()).allowed, false);
    assert.equal((await states()).find(p => p.key_hash === burst.key_hash).requests, bCount);
    await db.query("update application_rate_windows set expires_at=clock_timestamp()-interval '1 second'");
    const reset = await consume(); assert.equal(reset.allowed, true);
    assert.deepEqual(reset.policies.map(p => p.remaining), [4, 19]);
    for (const bad of [null, {}, [], [burst, burst], [{ ...burst, window_seconds: 0 }], [{ ...burst, max_requests: 101 }], [{ ...burst, key_hash: 'client-ip' }]]) {
      await assert.rejects(consume(bad), /Invalid|Duplicate/);
    }
    await db.exec('set role anon'); await assert.rejects(consume(), /permission denied/);
    await db.exec('reset role; set role authenticated'); await assert.rejects(consume(), /permission denied/);
    await db.exec('reset role; set role service_role'); assert.equal((await consume()).allowed, true);
    await db.exec('reset role; truncate application_rate_windows;');
    await db.exec("insert into application_rate_windows select lpad(i::text,64,'0'),1,clock_timestamp()+interval '1 hour' from generate_series(1,9999) i");
    assert.deepEqual(await consume(), { unavailable: true });
    assert.equal((await db.query('select count(*)::int as n from application_rate_windows')).rows[0].n, 9999);
  } finally { await db.close(); }
});

test('server checks both windows before emitting metadata, rejects spoofed/malformed policies and fails closed', async () => {
  let calls = 0, variant = 'valid'; const captured = [];
  const limit = createSharedApplicationRateLimit({ secret, onResult: p => captured.push(p), rpc: async ({ p_policies }) => {
    calls++; assert.deepEqual(p_policies, [burst, hour]);
    if (variant === 'outage') throw new Error('private provider details');
    const policies = p_policies.map(p => ({ key_hash: p.key_hash, limit: p.max_requests, windowSeconds: p.window_seconds, remaining: p.max_requests - 1, resetAfter: p.window_seconds, allowed: true }));
    if (variant === 'missing') policies.pop();
    if (variant === 'duplicate') policies[1] = policies[0];
    if (variant === 'window') policies[0].windowSeconds = 3600;
    if (variant === 'count') policies[0].remaining = -1;
    if (variant === 'uncounted') policies[0].remaining = policies[0].limit;
    if (variant === 'deadline') policies[0].resetAfter = 301;
    return { allowed: variant !== 'contradiction', policies };
  } });
  assert.equal(await limit('192.0.2.1', 'upload-start', 20), true); assert.equal(calls, 1);
  assert.deepEqual(captured.map(p => [p.scope, p.windowSeconds]), [['upload-start-burst', 300], ['upload-start', 3600]]);
  assert.ok(!JSON.stringify(captured).includes('key_hash'));
  for (variant of ['missing', 'duplicate', 'window', 'count', 'uncounted', 'deadline', 'contradiction', 'outage']) {
    captured.length = 0;
    await assert.rejects(limit('192.0.2.1', 'upload-start', 20), e => e.status === 503 && !e.message.includes('private provider'));
    assert.equal(captured.length, 0);
  }
  await assert.rejects(limit('192.0.2.1', 'upload-start', 100), { status: 503 });
  await assert.rejects(limit({}, 'upload-start', 20), { status: 503 });
});

test('IPv6 rotations share a /64 allowance while IPv4 spelling cannot mint a separate quota', () => {
  assert.equal(rateNetwork('2001:db8:abcd:1234::1'), '2001:db8:abcd:1234::/64');
  assert.equal(rateNetwork('2001:0DB8:ABCD:1234:ffff:abcd:2222:3333'), rateNetwork('2001:db8:abcd:1234::1'));
  assert.notEqual(rateNetwork('2001:db8:abcd:1235::1'), rateNetwork('2001:db8:abcd:1234::1'));
  assert.equal(rateNetwork('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(rateNetwork('::ffff:c000:201'), '192.0.2.1');
  for (const remoteAddress of ['::ffff:c000:201', '::FFFF:192.0.2.1', '192.0.2.1']) {
    assert.equal(rateNetwork(clientIP({ socket: { remoteAddress }, headers: {} })), '192.0.2.1');
  }
  assert.equal(rateNetwork('192.0.2.1'), '192.0.2.1');
  assert.equal(rateNetwork('fe80::1%eth0'), 'fe80:0:0:0::/64');
  assert.equal(rateNetwork('synthetic@example.invalid'), 'synthetic@example.invalid');
});

test('longest blocking window governs both server Retry-After and modal, regardless of order', () => {
  for (const items of [[feedback('upload-start-burst'), feedback('upload-start', 0, 1200)], [feedback('upload-start', 0, 1200), feedback('upload-start-burst')]]) {
    withRateFeedback(() => {
      items.forEach(p => recordRateFeedback(p, 1000));
      const headers = new Map(); rateFeedbackResponse({ setHeader: (k, v) => headers.set(k, v) }, 429, {}, 1000);
      assert.equal(headers.get('Retry-After'), '1200');
    });
    const client = createRateFeedbackClient({ now: () => 0 });
    client.observe(response(items)); assert.equal(client.getSnapshot().scope, 'upload-start');
    assert.equal(client.getCooldown('/api/franchise-applications/uploads', { method: 'POST' }).expiresAt, 1200000);
    client.observe(response([feedback('upload-start-burst')]));
    assert.equal(client.getSnapshot().scope, 'upload-start'); client.dispose();
  }
});

test('cooldown expires on its own timer without refresh or automatic submission, and timers are released', async () => {
  let clock = 0, next = 0, calls = 0, changes = 0;
  const timers = new Map();
  const client = createRateFeedbackClient({ now: () => clock, setTimer: (fn, delay) => { const id = ++next; timers.set(id, { fn, delay }); return id; }, clearTimer: id => timers.delete(id),
    fetcher: async () => { calls++; return Response.json({ receipt: 'synthetic' }); } });
  const unsubscribe = client.subscribe(() => changes++);
  client.observe(response([feedback('upload-start-burst', 0, 3)]));
  assert.equal(timers.size, 1); assert.ok(client.getCooldown('/api/franchise-applications/uploads', { method: 'POST' }));
  await client.fetch('/api/franchise-applications/uploads', { method: 'POST' }); assert.equal(calls, 0);
  const before = changes, timer = [...timers.values()][0];
  clock = 3001; timer.fn();
  assert.equal(client.getCooldown('/api/franchise-applications/uploads', { method: 'POST' }), null);
  assert.ok(changes > before); assert.equal(calls, 0); assert.equal(timers.size, 0);
  await client.fetch('/api/franchise-applications/uploads', { method: 'POST' }); assert.equal(calls, 1);
  client.observe(response([feedback('upload-start-burst', 0, 300)])); assert.equal(timers.size, 1);
  unsubscribe(); client.dispose(); assert.equal(timers.size, 0);
});

test('modal deferral preserves the longer pending wait during concurrent document work', () => {
  const client = createRateFeedbackClient({ now: () => 0 }), finish = client.beginBatch();
  client.observe(response([feedback('upload-start', 0, 1000)]));
  client.observe(response([feedback('upload-start-burst', 0, 300)]));
  assert.equal(client.getSnapshot(), null); finish();
  assert.equal(client.getSnapshot().scope, 'upload-start'); client.dispose();
});
