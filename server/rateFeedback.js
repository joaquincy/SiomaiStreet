import { AsyncLocalStorage } from 'node:async_hooks';

const requests = new AsyncLocalStorage();
export const withRateFeedback = callback => requests.run(new Map(), callback);
export function recordRateFeedback(policy, observedAt = Date.now()) {
  requests.getStore()?.set(policy.scope, { ...policy, observedAt });
}
export function rateFeedbackResponse(res, status, body, now = Date.now()) {
  // Checking a document can take time. Report the remaining wait when sending
  // the response, not the longer wait when the request first entered the API.
  const policies = [...(requests.getStore()?.values() || [])].map(({ observedAt, ...policy }) => ({
    ...policy, resetAfter: Math.max(1, Math.ceil(policy.resetAfter - (now - observedAt) / 1000)),
  }));
  if (policies.length) res.setHeader('X-RateLimit-Policies', JSON.stringify(policies));
  const blocked = policies.filter(policy => !policy.allowed);
  if (status === 429 && blocked.length) {
    const retry = Math.max(...blocked.map(policy => policy.resetAfter));
    res.setHeader('Retry-After', String(retry));
    return { ...body, error: `Too many requests for this action. Try again in ${Math.max(1, Math.ceil(retry / 60))} minute(s). Keep your answers and retry the same request after the countdown.`, retryAfter: retry };
  }
  return body;
}
