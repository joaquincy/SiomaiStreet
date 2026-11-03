import { maintenanceAuthorized } from './directUploadServices.js';
import { processContactNotification } from './notificationWorker.js';
import { createTransactionalSender, validEmailSender } from './transactionalServices.js';

export function createContactEmailMaintenance({ env, request, json, send }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Use POST.' });
    }
    if (!maintenanceAuthorized(req.headers.authorization, env.EMAIL_WORKER_SECRET)) {
      return json(res, 403, { error: 'Not authorized.' });
    }
    if (!env.RESEND_API_KEY || !validEmailSender(env.EMAIL_FROM) || !env.RESEND_WEBHOOK_SECRET) {
      return json(res, 503, { error: 'Email delivery configuration is incomplete.' });
    }
    try {
      const signal = AbortSignal.timeout(25000);
      // One job per call: bounded runtime, no timers surviving the HTTP response.
      const processed = await processContactNotification({ signal,
        request: (path, options = {}) => request(path, { ...options, signal }),
        send: send || createTransactionalSender({
        apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO,
      }) });
      return json(res, 200, { processed: Number(processed) });
    } catch {
      return json(res, 503, { error: 'Email queue unavailable; retry later.' });
    }
  };
}
