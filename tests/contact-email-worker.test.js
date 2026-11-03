import test from 'node:test';
import assert from 'node:assert/strict';
import { createContactEmailMaintenance } from '../server/contactEmailMaintenance.js';
import { processContactNotification } from '../server/notificationWorker.js';
import { createTransactionalSender, validEmailSender } from '../server/transactionalServices.js';

const secret = 'synthetic-maintenance-secret-123456789';
const env = { EMAIL_WORKER_SECRET: secret, RESEND_API_KEY: 'test', EMAIL_FROM: 'Siomai Street <notifications@contact.example.test>', RESEND_WEBHOOK_SECRET: 'test' };
const job = { id: 'test-job', lease: 'lease', recipient: 'synthetic@example.test', kind: 'inquiry_received', reference: 'TEST', attempts: 1 };
const json = (_, status, body) => ({ status, body });
const res = { setHeader() {} };

test('maintenance refuses wrong method, missing/incorrect secret before accessing database', async () => {
  const handler = createContactEmailMaintenance({ env, json, request: () => assert.fail('Database must not be accessed') });
  for (const [method, authorization, status] of [['GET', `Bearer ${secret}`, 405], ['POST', '', 403], ['POST', 'Bearer wrong', 403]]) {
    assert.equal((await handler({ method, headers: { authorization } }, res)).status, status);
  }
});

test('authenticated maintenance awaits one contact delivery and stores acceptance', async () => {
  const writes = []; let sent = 0;
  const handler = createContactEmailMaintenance({ env, json, send: async value => {
    assert.equal(value.kind, 'inquiry_received'); assert.equal(value.eventId, job.id); sent++;
    return { providerId: 'provider-1' };
  }, request: async (path, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    if (path.endsWith('claim_contact_notification')) return [job];
    if (path.includes('notification_events?')) return [];
    writes.push(JSON.parse(options.body));
  } });
  assert.deepEqual(await handler({ method: 'POST', headers: { authorization: `Bearer ${secret}` } }, res), { status: 200, body: { processed: 1 } });
  assert.equal(sent, 1);
  assert.deepEqual(writes, [{ state: 'accepted', provider_id: 'provider-1' }]);
});

test('empty contact queue returns without sending', async () => {
  assert.equal(await processContactNotification({ request: async () => [], send: () => assert.fail('No email expected') }), false);
});

test('defense in depth refuses application jobs', async () => {
  await assert.rejects(processContactNotification({ request: async () => [{ ...job, kind: 'application_updated' }], send: () => assert.fail('Must not email application updates') }), /Unexpected notification kind/);
});

test('retryable failure retains stable job id and schedules backoff; permanent failure needs review', async () => {
  for (const retryable of [true, false]) {
    let patch;
    await processContactNotification({ request: async (path, options) => {
      if (path.endsWith('claim_contact_notification')) return [job];
      assert.ok(path.includes('lease=eq.lease'));
      patch = JSON.parse(options.body);
    }, send: async value => { assert.equal(value.eventId, job.id); throw Object.assign(new Error('provider'), { retryable }); } });
    assert.equal(patch.state, retryable ? 'pending' : 'needs_review');
    assert.ok(Date.parse(patch.next_attempt_at) > Date.now());
  }
});

test('database failure returns sanitized failure instead of false success', async () => {
  const handler = createContactEmailMaintenance({ env, json, request: async () => { throw new Error('private database detail'); } });
  const result = await handler({ method: 'POST', headers: { authorization: `Bearer ${secret}` } }, res);
  assert.equal(result.status, 503); assert.doesNotMatch(JSON.stringify(result), /private database detail/);
});

test('display-name sender works; header injection and multiple sender addresses fail', async () => {
  for (const from of ['A\r\nB <test@example.test>', 'A <a@example.test>, B <b@example.test>', 'A <invalid>']) assert.equal(validEmailSender(from), false);
  let payload;
  const send = createTransactionalSender({ apiKey: 'test', from: env.EMAIL_FROM, fetchImpl: async (_, options) => {
    payload = JSON.parse(options.body); return { ok: true, json: async () => ({ id: 'mail' }) };
  } });
  await send({ eventId: job.id, to: job.recipient, kind: job.kind, reference: job.reference });
  assert.equal(payload.from, env.EMAIL_FROM);
});
