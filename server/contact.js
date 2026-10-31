import { createHash, timingSafeEqual } from 'node:crypto';
import { validateContact, validEmail, validRequestId } from '../shared/contact.js';

const fail = (message, status = 503, errors) => Object.assign(new Error(message), { status, errors, contactError: true });
export function contactConfiguration(env) {
  const ready = env.CONTACT_INTAKE_ENABLED === 'true' && Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.APPLICATION_RATE_SECRET?.length >= 32);
  return Object.fromEntries(['customer', 'franchise'].map(channel => {
    const prefix = `CONTACT_${channel.toUpperCase()}_`;
    const queue = (env[`${prefix}QUEUE`] || '').trim();
    const email = (env[`${prefix}EMAIL`] || '').trim();
    const phone = (env[`${prefix}PHONE`] || '').trim();
    return [channel, {
      queue: /^[a-z0-9_-]{1,64}$/.test(queue) ? queue : '',
      enabled: ready && /^[a-z0-9_-]{1,64}$/.test(queue),
      email: validEmail(email) ? email : '',
      phone: /^\+?[\d ().-]{7,40}$/.test(phone) ? phone : '',
      hours: (env[`${prefix}HOURS`] || '').trim().slice(0, 200),
      responseNote: (env[`${prefix}RESPONSE_NOTE`] || '').trim().slice(0, 200),
    }];
  }));
}
export const publicContactConfiguration = config => Object.fromEntries(Object.entries(config).map(([channel, { enabled, email, phone, hours, responseNote }]) => [channel, { enabled, email, phone, hours, responseNote }]));

export async function readContactJson(req) {
  const length = req.headers['content-length'];
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > 12288)) throw fail('Your message is too large. Please shorten it.', 413);
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '') || req.headers['content-encoding']) throw fail('Send this form as plain JSON.', 415);
  let size = 0;
  const chunks = [];
  req.setTimeout?.(10000);
  try {
    // Leave the socket open long enough to return a useful 413 for chunked input.
    for await (const chunk of (req.iterator ? req.iterator({ destroyOnReturn: false }) : req)) {
      size += chunk.length;
      if (size > 12288) throw fail('Your message is too large. Please shorten it.', 413);
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw fail('The message format was invalid. Please try again.', 400); }
  } finally { req.setTimeout?.(0); }
}

export function createContactHandler({ configuration, rate, repository, json, allowedOrigins = [], readJson = readContactJson, verify = async () => {} }) {
  return async (req, res) => {
    let writing = false;
    res.setHeader('Connection', 'close');
    try {
      const origin = req.headers.origin;
      if (req.headers['sec-fetch-site'] === 'cross-site' && !allowedOrigins.includes(origin)) throw fail('Please send this message from the Siomai Street website.', 403);
      if (origin && !allowedOrigins.includes(origin)) {
        let matches = false;
        try { const url = new URL(origin); matches = ['https:', 'http:'].includes(url.protocol) && url.host === req.headers.host; } catch { /* reject malformed origin */ }
        if (!matches) throw fail('Please send this message from the Siomai Street website.', 403);
      }
      if (!Object.values(configuration).some(value => value.enabled)) throw fail('Online messages are not available yet. Please use a listed support contact when available.');
      // Abuse admission happens before any JSON body processing.
      if (!await rate(req, 'contact-ingress', 20)) throw fail('Too many attempts. Please wait before trying again.', 429);
      try { await verify(req); } catch (error) { throw fail(error.message, error.status || 503); }
      const body = await readJson(req);
      if (!validRequestId(body?.requestId)) throw fail('The message reference is invalid. Reload this page before sending.', 400);
      body.requestId = body.requestId.toLowerCase();
      const { data, errors } = validateContact(body);
      if (Object.keys(errors).length) throw fail('Please check the highlighted answers.', 422, errors);
      if (!configuration[data.channel].enabled) throw fail('This support channel is not accepting online messages yet.');
      const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
      const receipt = row => {
        if (row?.id !== body.requestId || !/^[a-f0-9]{64}$/.test(row?.request_hash || '')) throw fail('We could not confirm receipt. Retry the same message.');
        if (!timingSafeEqual(Buffer.from(row.request_hash, 'hex'), Buffer.from(hash, 'hex'))) throw fail('This reference belongs to different message details. Retry the original message.', 409);
        if (!Number.isFinite(Date.parse(row.received_at))) throw fail('We could not confirm receipt. Retry the same message.');
        return { id: row.id, reference: `SS-INQ-${row.id.toUpperCase()}`, channel: data.channel, status: 'received', receivedAt: row.received_at };
      };
      const existing = await repository.find(body.requestId);
      if (existing) { writing = true; return json(res, 200, receipt(existing)); }
      if (!await rate(req, 'contact-new', 5, data.email)) throw fail('Please wait before sending another inquiry from this email address.', 429);
      writing = true;
      let row;
      try {
        row = await repository.insert({ id: body.requestId, request_hash: hash, channel: data.channel, topic: data.topic, name: data.name, email: data.email, branch: data.branch, order_reference: data.orderReference, message: data.message, privacy_notice_version: '2026-10-31', assigned_queue: configuration[data.channel].queue });
      } catch (error) {
        // Recover unique-key races and a successful insert whose response was lost.
        row = await repository.find(body.requestId);
        if (!row) throw error;
      }
      return json(res, 200, receipt(row));
    } catch (error) {
      if (error.contactError && error.status === 429) res.setHeader('Retry-After', '3600');
      const status = error.contactError && [400, 403, 409, 413, 415, 422, 429].includes(error.status) ? error.status : 503;
      return json(res, status, {
        error: status === 503 ? (writing ? 'We could not confirm receipt. Keep this page open and retry the same message.' : 'Messages are temporarily unavailable. Please try again later.') : error.message,
        accepted: writing ? 'unknown' : false,
        ...(error.contactError && error.errors ? { errors: error.errors } : {}),
      });
    }
  };
}
