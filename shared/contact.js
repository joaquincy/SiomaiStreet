export const CONTACT_TOPICS = {
  customer: [{ value: 'food', label: 'Food or menu question' }, { value: 'order', label: 'Order concern' }, { value: 'feedback', label: 'Feedback or complaint' }, { value: 'other', label: 'Something else' }],
  franchise: [{ value: 'packages', label: 'Packages and quotations' }, { value: 'requirements', label: 'Application requirements' }, { value: 'location', label: 'Proposed location' }, { value: 'other', label: 'Other franchise question' }],
};
export const CONTACT_LIMITS = { name: 100, email: 254, branch: 150, orderReference: 80, message: 2000 };
export const contactTextLength = value => Array.from(value).length;
export const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[\r\n]/.test(value);
export const validRequestId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function validateContact(input) {
  const errors = {};
  const data = {};
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  for (const [key, max] of Object.entries(CONTACT_LIMITS)) {
    data[key] = typeof source[key] === 'string' ? source[key].trim() : '';
    const containsControl = Array.from(data[key]).some(char => char.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(char));
    if ((source[key] != null && typeof source[key] !== 'string') || contactTextLength(data[key]) > max || containsControl) errors[key] = `Use plain text, up to ${max} characters.`;
  }
  data.email = data.email.toLowerCase();
  data.channel = source.channel;
  data.topic = source.topic;
  data.privacyAcknowledged = source.privacyAcknowledged === true;
  if (!Object.hasOwn(CONTACT_TOPICS, data.channel || '')) errors.channel = 'Choose customer support or franchise inquiries.';
  else if (!CONTACT_TOPICS[data.channel].some(topic => topic.value === data.topic)) errors.topic = 'Choose what your message is about.';
  if (!data.name) errors.name = 'Enter your name so we know how to address you.';
  if (!validEmail(data.email)) errors.email = 'Enter a valid email address for our reply.';
  if (contactTextLength(data.message) < 20) errors.message = 'Add a little more detail (at least 20 characters).';
  if (!data.privacyAcknowledged) errors.privacyAcknowledged = 'Acknowledge how your message and contact details will be used.';
  if (source.website) errors.form = 'The message could not be accepted. Please try again.';
  if (data.channel !== 'customer') data.branch = '';
  if (data.channel !== 'customer' || data.topic !== 'order') data.orderReference = '';
  return { data, errors };
}

export function validContactReceipt(receipt, requestId, channel) {
  return receipt?.id === requestId && validRequestId(requestId) && receipt.channel === channel &&
    receipt.status === 'received' && receipt.reference === `SS-INQ-${requestId.toUpperCase()}` &&
    typeof receipt.receivedAt === 'string' && Number.isFinite(Date.parse(receipt.receivedAt));
}
