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

const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
export function createTransactionalSender({ apiKey, from, replyTo, fetchImpl = fetch }) {
  return async ({ eventId, to, kind, reference }) => {
    if (!apiKey || !emailPattern.test(from || '') || (replyTo && !emailPattern.test(replyTo))) throw failure('Email delivery is not configured.');
    if (!emailPattern.test(to || '') || !/^[a-zA-Z0-9_-]{1,120}$/.test(eventId || '') || !/^[a-zA-Z0-9-]{1,100}$/.test(reference || '')) throw failure('Invalid notification.', 400);
    const templates = {
      inquiry_received: ['We received your inquiry', 'Your inquiry has been received. Keep this reference for follow-up.'],
      application_received: ['We received your franchise application', 'Your application has been received. This receipt is not franchise approval.'],
      application_updated: ['Your franchise application has an update', 'Use your existing secure tracking access to review the update.'],
    };
    if (!Object.hasOwn(templates, kind)) throw failure('Invalid notification type.', 400);
    const [subject, message] = templates[kind];
    let response;
    try {
      response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'Idempotency-Key': eventId },
        body: JSON.stringify({ from, to: [to], ...(replyTo ? { reply_to: replyTo } : {}), subject: `Siomai Street — ${subject}`, text: `${message}\n\nReference: ${reference}\n\nPlease do not email identity documents or financial records.` }),
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
