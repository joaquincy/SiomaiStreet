import { CONTACT_LIMITS, CONTACT_TOPICS, validEmail, validateContact } from '../../shared/contact.js';

export function contactCompletion(form, channel) {
  const { errors } = validateContact({ ...form, channel });
  return [
    { key: 'topic', label: 'Topic' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Reply email' },
    { key: 'message', label: 'Message' },
    { key: 'privacyAcknowledged', label: 'Permission' },
  ].map(item => ({ ...item, complete: !errors[item.key] }));
}

export const hasUnsentContact = drafts => Object.values(drafts).some(draft =>
  ['topic', 'message', 'branch', 'orderReference'].some(key => Boolean(draft[key]?.trim()))
);

export const emptyContactDraft = () => ({ name: '', email: '', topic: '', branch: '', orderReference: '', message: '', privacyAcknowledged: false, website: '' });
export const createContactDrafts = () => ({ customer: emptyContactDraft(), franchise: emptyContactDraft() });

// Keep messages separate; only reply details travel between destinations. No storage.
export function editContactDraft(drafts, channel, key, value) {
  const limit = CONTACT_LIMITS[key];
  const characters = typeof value === 'string' ? Array.from(value) : null;
  const limited = Boolean(limit && characters && characters.length > limit);
  const nextValue = limited ? characters.slice(0, limit).join('') : value;
  const next = { ...drafts, [channel]: { ...drafts[channel], [key]: nextValue } };
  if (key === 'name' || key === 'email') {
    const other = channel === 'customer' ? 'franchise' : 'customer';
    next[other] = { ...next[other], [key]: nextValue };
  }
  if (key === 'topic' && value !== 'order') next[channel].orderReference = '';
  return { drafts: next, limited };
}

export function normalizeContactOptions(payload) {
  const result = {};
  for (const channel of ['customer', 'franchise']) {
    const source = payload?.[channel];
    if (!source || typeof source.enabled !== 'boolean') throw new Error('Invalid contact availability');
    const text = key => typeof source[key] === 'string' ? source[key].trim().slice(0, 200) : '';
    result[channel] = { enabled: source.enabled, email: validEmail(source.email) ? source.email : '', phone: text('phone'), hours: text('hours'), responseNote: text('responseNote') };
  }
  return result;
}

const guidance = {
  customer: {
    food: { hint: 'Mention the menu item and branch, if known. For ingredients or dietary questions, ask about the exact item before ordering.', link: '/menu', action: 'Explore the menu' },
    order: { hint: 'Include the branch, order date, items and what went wrong. An order reference helps if you have one. Leave out payment or bank details.', link: '/#stores', action: 'Find your branch' },
    feedback: { hint: 'Tell us which branch you visited, when, and what you would like us to know. Please avoid sharing another person’s private details.', link: '/#stores', action: 'Find a store' },
    other: { hint: 'Tell us your question and the details that would help us understand it. Keep sensitive documents and passwords out of your message.' },
  },
  franchise: {
    packages: { hint: 'Tell us which format interests you and the city you have in mind. Current prices and inclusions are available by quotation.', link: '/#packages', action: 'Explore franchise formats' },
    requirements: { hint: 'Mention the application step or requirement you need help with. Do not include your private application access code.', link: '/#faq', action: 'Read franchise FAQs' },
    location: { hint: 'Share the city or general area you are considering. You do not need to have a secured location to ask a question.' },
    other: { hint: 'Tell us what you would like to know. If you already applied, use application tracking for your current status.', link: '/application/status', action: 'Track an application' },
  },
};
export const contactGuidance = (channel, topic) => guidance[channel]?.[topic] || { hint: 'Choose a topic so we can help you include the right details.' };

export function contactReceiptText(receipt) {
  const topic = CONTACT_TOPICS[receipt.channel]?.find(item => item.value === receipt.topic)?.label || '';
  return [
    'SIOMAI STREET — INQUIRY RECEIPT', '',
    `Reference: ${receipt.reference}`, `Received (UTC): ${receipt.receivedAt}`,
    `Destination: ${receipt.channel === 'customer' ? 'Customer support' : 'Franchise inquiries'}`,
    `Topic: ${topic}`, `Reply email: ${receipt.replyEmail}`, '',
    'Your inquiry was received. This does not confirm staff review, a refund or franchise approval.',
    'Keep this reference for follow-up. Keep this reference even if the confirmation email is delayed or cannot be delivered.',
  ].join('\n');
}
