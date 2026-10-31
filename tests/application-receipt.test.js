import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { formatReceiptDate, privateReceiptText } from '../src/utils/applicationReceipt.js';

const receipt = {
  id: '00000000-0000-4000-8000-000000000031',
  submittedAt: '2026-10-31T10:00:00Z',
  accessCode: 'SYNTHETIC-ONLY-NOT-A-REAL-ACCESS-CODE',
  accessExpiresAt: '2027-01-29T10:00:00Z',
};

test('receipt dates use Philippine time and tolerate missing or malformed optional expiry', () => {
  for (const value of [undefined, null, {}, '', 'bad-date']) assert.equal(formatReceiptDate(value), null);
  assert.match(formatReceiptDate('2026-10-31T23:00:00Z'), /(?:1 Nov 2026|Nov 1, 2026)/);
  assert.match(formatReceiptDate(receipt.submittedAt, true), /6:00/);
});

test('explicit receipt export contains credentials as text, with a clean tracking URL and no approval promise', () => {
  const text = privateReceiptText(receipt, 'https://example.invalid/ignore?credential=not-for-export#test');
  assert.ok(text.includes(receipt.id));
  assert.ok(text.includes(receipt.accessCode));
  assert.ok(text.includes(receipt.submittedAt));
  assert.match(text, /Track status: https:\/\/example.invalid\/application\/status\n/);
  assert.doesNotMatch(text, /credential=|#test|undefined|Invalid Date/);
  assert.match(text, /not franchise approval/);
  assert.match(text, /Never send your private access code to support/);
});

test('receipt presentation keeps access private, preserves correction guidance and blocks restart until cleanup succeeds', async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
  t.after(() => vite.close());
  const { default: Receipt } = await vite.ssrLoadModule('/src/pages/Application/ApplicationReceipt.jsx');
  const render = overrides => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Receipt, {
    receipt, cleanupStatus: 'Local draft cleared from this device.', onRetryCleanup() {}, onNewApplication() {}, ...overrides,
  })));
  const normal = render();
  assert.match(normal, /<h1[^>]*id="receipt-title"[^>]*tabindex="-1"/);
  assert.match(normal, /Application<br\/>.*received\./);
  assert.match(normal, /Received does not mean approved/);
  assert.match(normal, /Copy application reference/);
  assert.match(normal, /Copy private access code/);
  assert.match(normal, /aria-controls="receipt-private-code" aria-expanded="false"/);
  assert.doesNotMatch(normal, new RegExp(receipt.accessCode), 'A hidden code must not be rendered into the DOM');
  assert.match(normal, /href="\/application\/status"/);
  assert.match(normal, /don’t need to apply again/);
  assert.match(normal, /role="status"/);
  assert.doesNotMatch(normal, /disabled=""[^>]*>Start a new application/);
  for (const cleanupStatus of ['', 'Clearing local draft…', 'Cleanup failed. Synthetic failure.']) {
    const markup = render({ cleanupStatus });
    assert.match(markup, /disabled=""[^>]*>Start a new application/);
    assert.equal(markup.includes('Retry local draft cleanup'), cleanupStatus.startsWith('Cleanup failed'));
  }
  assert.match(render({ busy: true }), /disabled=""[^>]*>Start a new application/);
  const legacy = render({ receipt: { id: receipt.id, submittedAt: receipt.submittedAt, accessExpiresAt: 'not-a-date' } });
  assert.match(legacy, /Tracking access was not included/);
  assert.match(legacy, /Save receipt/);
  assert.doesNotMatch(legacy, /Copy private access code|Invalid Date|undefined/);
  const malformedExpiry = render({ receipt: { ...receipt, accessExpiresAt: {} } });
  assert.match(malformedExpiry, /Access expiry was not included/);
  assert.doesNotMatch(malformedExpiry, /Invalid Date|object Object/);
});
