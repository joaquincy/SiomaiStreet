import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { emptyContactDraft } from '../src/utils/contactExperience.js';
import { CONTACT_TOPICS, validateContact } from '../shared/contact.js';

test('contact section renders with labelled fields and disabled intake until availability is confirmed', async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
  t.after(() => vite.close());
  const { default: ContactSupport } = await vite.ssrLoadModule('/src/pages/Home/components/ContactSupport.jsx');
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ContactSupport)));
  assert.match(html, /id="contact"/); assert.match(html, /Food &amp; store support/); assert.match(html, /Franchise inquiries/);
  for (const key of ['name', 'email', 'branch', 'message', 'privacyAcknowledged']) assert.ok(html.includes(`for="contact-${key}"`));
  assert.match(html, /<legend>Choose a topic/);
  assert.match(html, /type="submit" disabled=""/);
  assert.match(html, /Checking message availability/); assert.match(html, /href="\/privacy#support-inquiries"/);
  assert.doesNotMatch(html, /mailto:|tel:|within 24 hours|Message received|<iframe/);
  assert.doesNotMatch(html, /Back to top|href="#hero"|<dialog/);
  assert.match(html, /aria-haspopup="dialog" aria-expanded="false"/);
  assert.match(html, /Prefer a direct conversation/);

  const { ContactComposer, ContactReceipt } = await vite.ssrLoadModule('/src/pages/Home/components/ContactSupport.jsx');
  const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component, props)));
  const noop = () => {};
  const props = { enabled: true, configStatus: 'ready', onUpdate: noop, onBlur: noop, onSubmit: noop, onReload: noop };
  // Exercise every public topic, including conditional fields and native radio state.
  for (const channel of ['customer', 'franchise']) for (const { value: topic } of CONTACT_TOPICS[channel]) {
    const form = { ...emptyContactDraft(), topic };
    const markup = render(ContactComposer, { ...props, channel, form });
    assert.match(markup, new RegExp(`id="contact-topic-${topic}"[^>]*checked=""`));
    assert.equal(markup.includes('id="contact-branch"'), channel === 'customer');
    assert.equal(markup.includes('id="contact-orderReference"'), channel === 'customer' && topic === 'order');
    assert.doesNotMatch(markup, /type="submit" disabled=""/);
  }
  const form = emptyContactDraft(), errors = validateContact({ ...form, channel: 'customer' }).errors;
  const invalid = render(ContactComposer, { ...props, channel: 'customer', form, errors, tried: true });
  for (const key of Object.keys(errors)) assert.ok(invalid.includes(`id="contact-${key}-error"`), key);
  assert.match(invalid, /aria-describedby="contact-privacy-help contact-privacyAcknowledged-error"/);
  assert.match(invalid, /role="alert"/);
  const retry = render(ContactComposer, { ...props, channel: 'customer', form, uncertain: true, failure: 'Synthetic lost response' });
  assert.match(retry, /<fieldset disabled=""/); assert.match(retry, /Retry safely/); assert.doesNotMatch(retry, /type="submit" disabled=""/);
  const sending = render(ContactComposer, { ...props, channel: 'customer', form, sending: true });
  assert.match(sending, /type="submit" disabled=""/); assert.match(sending, /aria-busy="true"/);
  const unavailable = render(ContactComposer, { ...props, channel: 'customer', form, enabled: false });
  assert.match(unavailable, /Online messaging isn’t open yet/); assert.match(unavailable, /<fieldset disabled=""/);
  const received = render(ContactReceipt, { receipt: { id: 'synthetic', reference: 'SS-INQ-SYNTHETIC', channel: 'franchise', receivedAt: '2026-10-31T00:00:00Z', replyEmail: 'test@example.invalid' }, onCopy: noop, onDownload: noop, onNew: noop });
  assert.match(received, /Save receipt/); assert.match(received, /Copy reference/); assert.match(received, /not a franchise application/); assert.match(received, /delayed or cannot be delivered/);
});

test('direct contact dialog renders safe configured, unconfigured and recovery states without submission controls', async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
  t.after(() => vite.close());
  const { default: DirectContactModal, DirectContactDetails } = await vite.ssrLoadModule('/src/pages/Home/components/DirectContactModal.jsx');
  const noop = () => {};
  const customer = { enabled: true, email: 'customer@example.invalid', phone: '+63 912 000 0000', hours: 'Synthetic hours only', responseNote: 'Synthetic service note' };
  const franchise = { enabled: false, email: 'franchise@example.invalid' };
  for (const channel of ['customer', 'franchise']) {
    const html = renderToStaticMarkup(createElement(DirectContactModal, { initialChannel: channel, options: { customer, franchise }, configStatus: 'ready', onReload: noop, onClose: noop }));
    assert.match(html, /<dialog[^>]*aria-labelledby="contact-direct-title"[^>]*aria-describedby="contact-direct-description"/);
    assert.match(html, /aria-label="Close direct contacts"/);
    assert.match(html, /role="group" aria-label="Direct contact team"/);
    assert.match(html, new RegExp(`href="mailto:${channel}@example.invalid"`));
    assert.doesNotMatch(html, new RegExp(`href="mailto:${channel === 'customer' ? 'franchise' : 'customer'}@example.invalid"`));
    assert.match(html, /Return to contact section/); assert.doesNotMatch(html, /<form|type="submit"/);
    if (channel === 'customer') { assert.match(html, /href="tel:\+639120000000"/); assert.match(html, /Synthetic hours only/); }
  }
  const renderDetails = extra => renderToStaticMarkup(createElement(DirectContactDetails, { channel: 'customer', configStatus: 'ready', onReload: noop, onCopy: noop, ...extra }));
  const missing = renderDetails({});
  assert.match(missing, /haven’t been confirmed yet/); assert.doesNotMatch(missing, /mailto:|tel:/);
  assert.match(renderDetails({ contact: { enabled: true } }), /use the message form/);
  const loading = renderDetails({ configStatus: 'loading', contact: customer });
  assert.match(loading, /role="status"/); assert.doesNotMatch(loading, /mailto:/);
  const failed = renderDetails({ configStatus: 'error', contact: customer });
  assert.match(failed, /Try again/); assert.doesNotMatch(failed, /mailto:/);
  assert.doesNotMatch(renderDetails({ contact: { email: 'bad\r\naddress', phone: 'javascript:alert(1)', hours: {} } }), /mailto:|tel:/);
  assert.match(renderDetails({ contact: customer, copyNote: 'Email address copied.', copied: true }), /role="status">Email address copied/);
});
