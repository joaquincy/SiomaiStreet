import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { UUID_PATTERN } from '../shared/application.js';
import { readUploadJson } from './directUploads.js';
import { validEmailSender } from './transactionalServices.js';

const fail = (message, status = 422) => Object.assign(new Error(message), { status, validationErrors: [{ step: 1, message }] });
const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const emailPattern = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
export function createApplicationEmail({ env, request, send, rate, verify, json, now = Date.now }) {
  const secret = env.APPLICATION_EMAIL_SECRET || env.APPLICATION_PORTAL_SECRET;
  const enabled = Boolean(secret?.length >= 32 && env.RESEND_API_KEY && validEmailSender(env.EMAIL_FROM));
  const hmac = text => createHmac('sha256', secret).update(text).digest('hex');
  const emailHash = email => hmac(`application-email-address:v1:${normalize(email)}`);
  const rpc = (name, args) => request('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(args) });
  const lookup = async id => (await request(`/rest/v1/application_email_challenges?id=eq.${id}&select=id,draft_id,email_hash,verified_until&limit=1`))?.[0];
  const claim = row => ({ id: row.id, draft: row.draft_id, emailHash: row.email_hash, expiresAt: row.verified_until });
  const sign = row => {
    const value = Buffer.from(JSON.stringify(claim(row))).toString('base64url');
    return `${value}.${hmac('application-email-proof:v1:' + value)}`;
  };
  const checkRow = (row, draft, email) => row && row.draft_id === draft && row.email_hash === emailHash(email) && Date.parse(row.verified_until) > now();
  const assertProof = async ({ requestId, email, proof }) => {
    if (!enabled) throw fail('Email confirmation is temporarily unavailable. Your draft is kept. Please try again later.', 503);
    if (typeof proof !== 'string' || proof.length > 2000) throw fail('Confirm your email address in Step 2 before submitting.');
    const [value, signature, extra] = proof.split('.');
    if (extra || !/^[a-f0-9]{64}$/.test(signature || '') || !timingSafeEqual(Buffer.from(signature), Buffer.from(hmac('application-email-proof:v1:' + value)))) throw fail('Confirm your email address in Step 2 before submitting.');
    let details;
    try { details = JSON.parse(Buffer.from(value, 'base64url').toString()); } catch { throw fail('Confirm your email address again.'); }
    if (!UUID_PATTERN.test(details?.id || '') || details.draft !== requestId || details.emailHash !== emailHash(email) || Date.parse(details.expiresAt) <= now()) throw fail('Your email confirmation expired or the address changed. Confirm it again in Step 2.');
    const row = await lookup(details.id);
    if (!checkRow(row, requestId, email)) throw fail('Your email confirmation expired. Confirm it again in Step 2.');
    return { challengeId: row.id, email: normalize(email), method: 'email_code', expiresAt: row.verified_until };
  };
  const assertSaved = async (stamp, draft, email) => {
    if (!enabled || !UUID_PATTERN.test(stamp?.challengeId || '') || !checkRow(await lookup(stamp.challengeId), draft, email)) throw fail('Confirm your email again in Step 2, then retry this application.');
  };
  const handler = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') return json(res, 200, { enabled });
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST to confirm your email.' });
    if (!enabled) throw fail('Email confirmation is temporarily unavailable. Keep your draft and try again later.', 503);
    if (!await rate(req, 'email-ingress', 20)) throw fail('Too many email confirmation attempts. Wait before retrying.', 429);
    const body = await readUploadJson(req, 2048);
    const email = normalize(body.email), draft = body.draftId;
    if (!UUID_PATTERN.test(draft || '') || email.length > 254 || !emailPattern.test(email)) throw fail('Enter a valid email address first.');
    if (body.action === 'send') {
      if (!await rate(req, 'email-send', 5) || !await rate(req, 'email-recipient', 5, email)) throw fail('Too many confirmation emails. Try again later; your draft is kept.', 429);
      await verify(req);
      const id = randomUUID(), code = String(randomInt(0, 1000000)).padStart(6, '0');
      const result = await rpc('start_application_email', { p_draft: draft, p_id: id, p_email_hash: emailHash(email), p_code_hash: hmac(`application-email-code:v1:${id}:${code}`) });
      if (!result?.started) {
        res.setHeader('Retry-After', String(result?.retryAfter || 60));
        throw fail('Wait one minute before requesting another email code.', 429);
      }
      // Await one bounded provider call. Codes never enter the ordinary inquiry queue.
      // A failed/ambiguous send leaves a usable challenge until expiry, not a verified inbox.
      const sent = await send({ eventId: `application-code-${id}`, kind: 'email_code', to: email, reference: id, code });
      await request(`/rest/v1/application_email_challenges?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ provider_id: sent.providerId }) });
      return json(res, 200, { challengeId: id, expiresAt: result.expiresAt, resendAfter: 60, status: 'sent' });
    }
    if (body.action !== 'confirm' || !UUID_PATTERN.test(body.challengeId || '') || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw fail('Enter the six-digit email code.');
    const result = await rpc('confirm_application_email', { p_draft: draft, p_id: body.challengeId, p_email_hash: emailHash(email), p_code_hash: hmac(`application-email-code:v1:${body.challengeId}:${body.code}`) });
    if (!result?.confirmed) throw fail(result?.locked ? 'This code has reached 5 attempts. Request a new email code.' : 'The email code is incorrect or expired. Check the latest email or request a new code.');
    const row = await lookup(body.challengeId);
    if (!checkRow(row, draft, email)) throw fail('Email confirmation could not be confirmed. Please retry.');
    return json(res, 200, { status: 'confirmed', email, expiresAt: row.verified_until, proof: sign(row) });
  };
  return { handler, assertProof, assertSaved };
}
