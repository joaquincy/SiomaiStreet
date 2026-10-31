import test from 'node:test';
import assert from 'node:assert/strict';
import { createTurnstileVerifier, createTransactionalSender } from '../server/transactionalServices.js';

test('Turnstile rejects missing tokens before networking and binds success to hostname and action', async () => {
  let calls = 0;
  const make = result => createTurnstileVerifier({ secret: 'test-secret', hostnames: ['example.test'], fetchImpl: async () => { calls++; return { ok: true, json: async () => result }; } });
  await assert.rejects(make({})({ token: '', action: 'inquiry' }), { status: 400 });
  assert.equal(calls, 0);
  for (const result of [{ success: false }, { success: true, hostname: 'evil.test', action: 'inquiry' }, { success: true, hostname: 'example.test', action: 'other' }]) {
    await assert.rejects(make(result)({ token: 'token', action: 'inquiry' }), { status: 400 });
  }
  assert.equal(await make({ success: true, hostname: 'example.test', action: 'inquiry' })({ token: 'token', action: 'inquiry' }), true);
});

test('Email uses stable idempotency and fixed minimal content, reporting acceptance only', async () => {
  let sent;
  const send = createTransactionalSender({ apiKey: 'test', from: 'updates@example.test', fetchImpl: async (_, options) => { sent = options; return { ok: true, json: async () => ({ id: 'provider-id' }) }; } });
  assert.deepEqual(await send({ eventId: 'event-1', to: 'synthetic@example.test', kind: 'application_received', reference: 'SS-TEST-1', documents: ['private'] }), { providerId: 'provider-id', status: 'accepted' });
  assert.equal(sent.headers['Idempotency-Key'], 'event-1');
  assert.match(JSON.parse(sent.body).text, /not franchise approval/);
  assert.doesNotMatch(sent.body, /private/);
  await assert.rejects(send({ eventId: 'event-1', to: 'synthetic@example.test', kind: 'unknown', reference: 'SS-TEST-1' }), { status: 400 });
});

test('Provider outages fail closed without exposing provider responses', async () => {
  const fetchImpl = async () => { throw new Error('sensitive provider detail'); };
  await assert.rejects(createTurnstileVerifier({ secret: 'test', hostnames: ['example.test'], fetchImpl })({ token: 'token', action: 'inquiry' }), /temporarily unavailable/);
  await assert.rejects(createTransactionalSender({ apiKey: 'test', from: 'updates@example.test', fetchImpl })({ eventId: 'event', to: 'synthetic@example.test', kind: 'inquiry_received', reference: 'TEST' }), /provider unavailable/);
});
