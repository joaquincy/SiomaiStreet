import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransactionalSender } from '../server/transactionalServices.js';
import { processContactNotification } from '../server/notificationWorker.js';

const inquiry = { name: 'Synthetic Customer', email: 'customer@example.test', channel: 'customer', topic: 'food', branch: 'Test branch', order_reference: '', message: 'Synthetic menu question <script>alert(1)</script>' };
const base = { eventId: 'staff-job', to: 'staff@example.test', kind: 'inquiry_staff', reference: 'SS-INQ-TEST', inquiry };

test('staff alert delivers message as plain text and routes replies to customer', async () => {
  let payload;
  const send = createTransactionalSender({ apiKey: 'test', from: 'Siomai Street <notifications@contact.example.test>', replyTo: 'support@example.test', fetchImpl: async (_, options) => {
    payload = JSON.parse(options.body); return { ok: true, json: async () => ({ id: 'mail' }) };
  } });
  await send(base);
  assert.deepEqual(payload.to, ['staff@example.test']);
  assert.equal(payload.reply_to, inquiry.email);
  assert.ok(payload.text.includes(inquiry.message));
  assert.ok(payload.text.includes(base.reference));
  assert.equal(payload.html, undefined);
  assert.equal(payload.subject, 'Siomai Street — New contact inquiry');
  await send({ ...base, kind: 'inquiry_received', to: inquiry.email });
  assert.equal(payload.reply_to, 'support@example.test');
  assert.ok(!payload.text.includes(inquiry.message));
});

test('invalid or oversized staff snapshot is rejected before sending', async () => {
  const send = createTransactionalSender({ apiKey: 'test', from: 'support@example.test', fetchImpl: () => assert.fail('Unexpected network request') });
  for (const data of [undefined, { ...inquiry, email: 'bad@example.test\r\nBcc:x@example.test' }, { ...inquiry, message: 'x'.repeat(2001) }]) {
    await assert.rejects(send({ ...base, inquiry: data }), { retryable: false });
  }
});

test('staff retry uses same idempotency key and snapshot; acknowledgement remains independent', async () => {
  const jobs = [
    { id: 'customer-job', kind: 'inquiry_received', recipient: inquiry.email },
    { id: 'staff-job', kind: 'inquiry_staff', recipient: 'staff@example.test', staff_payload: inquiry },
  ].map(job => ({ ...job, reference: base.reference, lease: 'test-lease', attempts: 1, state: 'pending' }));
  const deliveries = []; let failStaff = true;
  const send = createTransactionalSender({ apiKey: 'test', from: 'support@example.test', fetchImpl: async (_, options) => {
    const key = options.headers['Idempotency-Key'];
    deliveries.push({ key, body: options.body });
    if (key === 'staff-job' && failStaff) { failStaff = false; throw new Error('Network failure'); }
    return { ok: true, json: async () => ({ id: `provider-${key}` }) };
  } });
  const request = async (path, options) => {
    if (path.endsWith('claim_contact_notification')) { const job = jobs.find(job => job.state === 'pending'); return job ? [{ ...job }] : []; }
    if (path.includes('notification_events?')) return [];
    const job = jobs.find(job => path.includes(`id=eq.${job.id}&`));
    assert.ok(job); Object.assign(job, JSON.parse(options.body));
  };
  await processContactNotification({ request, send });
  await processContactNotification({ request, send });
  assert.equal(jobs[0].state, 'accepted'); assert.equal(jobs[1].state, 'pending');
  await processContactNotification({ request, send });
  assert.equal(jobs[1].state, 'accepted');
  assert.equal(await processContactNotification({ request, send }), false);
  assert.deepEqual(deliveries.map(item => item.key), ['customer-job', 'staff-job', 'staff-job']);
  assert.equal(deliveries[1].body, deliveries[2].body);
});
