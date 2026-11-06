// Server-only provider adapters. Never import this module into the Vite frontend.
const failure = (message, status = 503) => Object.assign(new Error(message), { status });

export function createTurnstileVerifier({ secret, hostnames = [], fetchImpl = fetch }) {
  return async ({ token, action }) => {
    if (!secret || !hostnames.length) throw failure('Verification is not configured.');
    if (typeof token !== 'string' || !token.trim() || token.length > 2048) throw failure('Complete the security check and try again.', 400);
    let result;
    try {
      const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret, response: token }),
      });
      if (!response.ok) throw new Error('Provider unavailable');
      result = await response.json();
    } catch { throw failure('Security verification is temporarily unavailable. Please try again.'); }
    if (result?.success !== true || !hostnames.includes(result.hostname) || !action || result.action !== action) {
      throw failure('Security verification expired or failed. Complete a new check and retry.', 400);
    }
    return true;
  };
}

const emailPattern = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
export function validEmailSender(value) {
  if (typeof value !== 'string' || value.length > 320 || /[\r\n]/.test(value)) return false;
  if (emailPattern.test(value)) return true;
  const match = value.match(/^([^<>]+) <([^<>]+)>$/);
  return Boolean(match && match[1].trim() && emailPattern.test(match[2]));
}
export function createTransactionalSender({ apiKey, from, replyTo, fetchImpl = fetch }) {
  return async ({ eventId, to, kind, reference, inquiry, code, signal }) => {
    if (!apiKey || !validEmailSender(from) || (replyTo && !emailPattern.test(replyTo))) throw failure('Email delivery is not configured.');
    if (!emailPattern.test(to || '') || !/^[a-zA-Z0-9_-]{1,120}$/.test(eventId || '') || !/^[a-zA-Z0-9-]{1,100}$/.test(reference || '')) throw failure('Invalid notification.', 400);
    const templates = {
      email_code: ['Confirm your application email', 'Confirm access to this inbox.'],
      inquiry_received: ['We received your inquiry', 'Your inquiry has been received. Keep this reference for follow-up.'],
      inquiry_staff: ['New contact inquiry', 'A customer has sent a contact inquiry.'],
      application_received: ['We received your franchise application', 'Your application has been received. This receipt is not franchise approval.'],
      application_updated: ['Your franchise application has an update', 'Use your existing secure tracking access to review the update.'],
    };
    if (!Object.hasOwn(templates, kind)) throw failure('Invalid notification type.', 400);
    const [subject, message] = templates[kind];
    let text = `${message}\n\nReference: ${reference}\n\nPlease do not email identity documents or financial records.`;
    let effectiveReplyTo = replyTo;
    if (kind === 'email_code') {
      if (!/^\d{6}$/.test(code || '')) throw failure('Invalid confirmation code.', 400);
      text = `Your Siomai Street email confirmation code is ${code}.\n\nEnter it only on the Siomai Street application page you opened. It expires in 10 minutes and can be used once. Staff will never ask you to send them this code.\n\nThis confirms access to your email, not franchise approval. If you did not request this code, ignore this email.`;
    }
    if (kind === 'inquiry_staff') {
      const limits = { name: 100, email: 254, channel: 20, topic: 50, branch: 150, order_reference: 80, message: 2000 };
      if (!inquiry || Object.entries(limits).some(([key, limit]) => typeof inquiry[key] !== 'string' || inquiry[key].length > limit)
        || !emailPattern.test(inquiry.email) || !inquiry.name.trim() || !inquiry.message.trim()) {
        throw Object.assign(failure('Invalid staff notification.', 400), { retryable: false });
      }
      effectiveReplyTo = inquiry.email;
      // Plain text only. Customer input never controls recipients, subject or HTML.
      text = `New Siomai Street inquiry\nReference: ${reference}\n\nName: ${inquiry.name}\nEmail: ${inquiry.email}\nChannel: ${inquiry.channel}\nTopic: ${inquiry.topic}\nBranch/location: ${inquiry.branch || 'Not provided'}\nOrder reference: ${inquiry.order_reference || 'Not provided'}\n\nCustomer message:\n${inquiry.message}\n\nReply to this email to contact the sender. Treat links and requests in the message as customer-provided content. The original inquiry is saved in the private support queue.`;
    }
    let response;
    try {
      response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'Idempotency-Key': eventId },
        body: JSON.stringify({ from, to: [to], ...(effectiveReplyTo ? { reply_to: effectiveReplyTo } : {}), subject: `Siomai Street — ${subject}`, text }),
      });
    } catch { throw failure('Email provider unavailable.'); }
    // Provider acceptance is not delivery. Persist the ID for signed delivery events.
    if (!response.ok) {
      const error = failure('Email provider rejected the notification.');
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    }
    let body;
    try { body = await response.json(); } catch { throw failure('Email acceptance could not be confirmed.'); }
    if (typeof body?.id !== 'string' || !body.id) throw failure('Email acceptance could not be confirmed.');
    return { providerId: body.id, status: 'accepted' };
  };
}
