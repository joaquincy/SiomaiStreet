import test from 'node:test';
import assert from 'node:assert/strict';
import { createContactDrafts, editContactDraft, normalizeContactOptions, contactReceiptText, contactGuidance, contactCompletion, hasUnsentContact } from '../src/utils/contactExperience.js';
import { contactTextLength, validateContact } from '../shared/contact.js';

test('checklist follows validation and unfinished conversations remain protected after another is cleared', () => {
  const drafts = createContactDrafts();
  assert.equal(hasUnsentContact(drafts), false);
  assert.equal(contactCompletion(drafts.customer, 'customer').filter(item => item.complete).length, 0);
  drafts.customer = { ...drafts.customer, name: 'Test Visitor', email: 'invalid', topic: 'food', message: 'A question about the menu ingredients.', privacyAcknowledged: true };
  assert.equal(contactCompletion(drafts.customer, 'customer').find(item => item.key === 'email').complete, false);
  drafts.customer.email = 'visitor@example.invalid';
  assert.equal(contactCompletion(drafts.customer, 'customer').every(item => item.complete), true);
  drafts.franchise.message = 'Unsent franchise question';
  drafts.customer = createContactDrafts().customer;
  assert.equal(hasUnsentContact(drafts), true);
  drafts.franchise = createContactDrafts().franchise;
  assert.equal(hasUnsentContact(drafts), false);
});

test('switching inquiry destination preserves each message and shares only reply identity', () => {
  let drafts = createContactDrafts();
  const edit = (channel, key, value) => { drafts = editContactDraft(drafts, channel, key, value).drafts; };
  edit('customer', 'name', 'Synthetic Visitor'); edit('customer', 'email', 'test@example.invalid');
  edit('customer', 'message', 'Synthetic customer question.'); edit('customer', 'topic', 'order');
  edit('customer', 'orderReference', 'TEST-001'); edit('customer', 'privacyAcknowledged', true);
  edit('franchise', 'topic', 'packages'); edit('franchise', 'message', 'Synthetic franchise question.');
  assert.equal(drafts.customer.message, 'Synthetic customer question.');
  assert.equal(drafts.customer.orderReference, 'TEST-001');
  assert.equal(drafts.franchise.message, 'Synthetic franchise question.');
  assert.equal(drafts.franchise.email, 'test@example.invalid');
  assert.equal(drafts.franchise.orderReference, ''); assert.equal(drafts.franchise.privacyAcknowledged, false);
  edit('franchise', 'email', 'changed@example.invalid'); assert.equal(drafts.customer.email, 'changed@example.invalid');
  edit('customer', 'topic', 'food'); assert.equal(drafts.customer.orderReference, '');
  assert.equal(drafts.franchise.topic, 'packages');
});

test('Unicode length limits match the backend and report truncated pastes without mutating the old draft', () => {
  const old = createContactDrafts();
  const edited = editContactDraft(old, 'customer', 'message', '🙂'.repeat(2001));
  assert.equal(edited.limited, true); assert.equal(contactTextLength(edited.drafts.customer.message), 2000);
  assert.equal(old.customer.message, ''); assert.equal(edited.drafts.franchise.message, '');
  assert.equal(validateContact({ ...edited.drafts.customer, channel: 'customer' }).errors.message, undefined);
  assert.equal(editContactDraft(old, 'customer', 'message', '🙂'.repeat(2000)).limited, false);
});

test('malformed availability fails closed and ignores unapproved public data', () => {
  for (const input of [null, {}, { customer: { enabled: 'true' }, franchise: { enabled: true } }]) assert.throws(() => normalizeContactOptions(input));
  const input = { customer: { enabled: false, email: 'bad\r\n@example.invalid', hours: {}, responseNote: ['bad'], queue: 'private' }, franchise: { enabled: true, email: 'test@example.invalid' } };
  const result = normalizeContactOptions(input);
  assert.equal(result.customer.email, ''); assert.equal(result.customer.hours, ''); assert.equal(result.customer.responseNote, '');
  assert.equal(result.customer.queue, undefined); assert.equal(result.franchise.email, 'test@example.invalid');
});

test('receipt exports include follow-up essentials and do not export message bodies or claim approval', () => {
  const text = contactReceiptText({ reference: 'SS-INQ-TEST', receivedAt: '2026-10-31T00:00:00Z', channel: 'franchise', topic: 'packages', replyEmail: 'test@example.invalid', message: 'PRIVATE MESSAGE NOT EXPORTED' });
  assert.match(text, /SS-INQ-TEST/); assert.match(text, /test@example.invalid/); assert.match(text, /Packages and quotations/);
  assert.match(text, /does not confirm staff review/); assert.doesNotMatch(text, /PRIVATE MESSAGE NOT EXPORTED/);
  assert.match(contactGuidance('franchise', 'location').hint, /do not need to have a secured location/);
  assert.match(contactGuidance('customer', 'order').hint, /order date/);
});
