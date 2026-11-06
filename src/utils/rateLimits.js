// Feedback is advisory. The database remains authoritative after reloads,
// across tabs, and when visitors share an IP. No answers or identifiers are kept.
import { RATE_POLICIES } from '../../shared/ratePolicies.js';
export const RATE_ACTIONS = Object.freeze({
  'email-ingress': { label: 'Confirming your email', unit: 'requests', shared: 'network' },
  'email-send': { label: 'Requesting email codes', unit: 'emails', shared: 'network', conditional: true },
  'email-recipient': { label: 'Codes to this email', unit: 'emails', shared: 'email address', conditional: true },
  'upload-start-burst': { label: 'Submission attempts', unit: 'attempts', shared: 'network' },
  'upload-start': { label: 'Starting or resuming an application', unit: 'requests', shared: 'network' },
  'new-application': { label: 'New application upload sessions', unit: 'new sessions', shared: 'network', conditional: true },
  'new-correction': { label: 'New document replacement sessions', unit: 'new sessions', shared: 'network', conditional: true },
  'upload-control': { label: 'Uploading and checking documents', unit: 'document requests', shared: 'network' },
  portal: { label: 'Checking application status', unit: 'requests', shared: 'network' },
  'portal-write': { label: 'Updating application details', unit: 'updates', shared: 'network' },
  'staff-documents': { label: 'Opening private documents', unit: 'requests', shared: 'network' },
  'contact-ingress': { label: 'Sending or retrying messages', unit: 'requests', shared: 'network' },
  'contact-new': { label: 'New support messages', unit: 'new messages', shared: 'reply email', conditional: true },
  'review-submit': { label: 'Submitting reviews', unit: 'requests', shared: 'network' },
  'review-helpful': { label: 'Marking reviews helpful', unit: 'requests', shared: 'network' },
  'place-search-client': { label: 'Searching places', unit: 'requests', shared: 'network' },
  'route-client': { label: 'Planning map routes', unit: 'requests', shared: 'network' },
  'place-search-global': { label: 'Shared map service', unit: 'provider requests', shared: 'all visitors' },
});

function validPolicy(p) {
  return p && Object.hasOwn(RATE_ACTIONS, p.scope) && typeof p.allowed === 'boolean'
    && p.limit === RATE_POLICIES[p.scope].limit
    && Number.isInteger(p.remaining) && p.remaining >= 0 && p.remaining <= p.limit
    && (p.allowed || p.remaining === 0) && p.windowSeconds === RATE_POLICIES[p.scope].windowSeconds
    && Number.isInteger(p.resetAfter) && p.resetAfter > 0 && p.resetAfter <= p.windowSeconds;
}

export function formatRateWait(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function scopesFor(path, method) {
  const clean = String(path).split('?')[0];
  if (method === 'GET' && /^\/api\/application-status\/[^/]+$/.test(clean)) return ['portal'];
  if (/^\/api\/application-status\/[^/]+\/followup(?:\/|$)/.test(clean)) return method === 'GET' ? ['portal'] : ['portal', 'portal-write'];
  if (method === 'POST' && /^\/api\/application-status\/[^/]+\/(?:onboarding|changes)\/[^/]+\/uploads$/.test(clean)) return ['upload-start-burst','upload-start','portal'];
  if (method !== 'POST') return [];
  if (clean === '/api/application-email') return ['email-ingress'];
  if (clean === '/api/franchise-applications/uploads' || /^\/api\/application-status\/[^/]+\/corrections\/[^/]+\/uploads$/.test(clean)) return ['upload-start-burst', 'upload-start'];
  if (/^\/api\/franchise-applications\/uploads\/[^/]+\/(authorize|check|finalize)(\/[^/]+)?$/.test(clean)) return ['upload-control'];
  if (clean === '/api/contact-inquiries') return ['contact-ingress'];
  if (clean === '/api/reviews') return ['review-submit'];
  if (/^\/api\/reviews\/[^/]+\/helpful$/.test(clean)) return ['review-helpful'];
  if (clean === '/api/place-search') return ['place-search-client'];
  if (clean === '/api/store-route') return ['route-client'];
  return [];
}

export function createRateFeedbackClient({ now = Date.now, fetcher = (...args) => globalThis.fetch(...args),
  setTimer = (...args) => globalThis.setTimeout(...args), clearTimer = id => globalThis.clearTimeout(id) } = {}) {
  const policies = new Map(), listeners = new Set();
  let notice = null, batch = 0, pending = null, expiryTimer;
  const changed = () => listeners.forEach(listener => listener());
  const emit = value => { notice = value; changed(); };
  const moreUrgent = (a, b) => !b || (a.remaining === 0 && b.remaining !== 0)
    || (a.remaining === 0 && b.remaining === 0 && a.expiresAt > b.expiresAt)
    || (a.remaining > 0 && b.remaining > 0 && a.remaining / a.limit < b.remaining / b.limit);
  const notify = value => {
    if (batch) {
      if (moreUrgent(value, pending)) pending = value;
    } else emit(value);
  };
  const prune = () => {
    let removed = false;
    for (const [scope, p] of policies) if (p.expiresAt <= now()) { policies.delete(scope); removed = true; }
    return removed;
  };
  const scheduleExpiry = () => {
    clearTimer(expiryTimer); expiryTimer = undefined;
    if (!policies.size) return;
    const next = Math.min(...[...policies.values()].map(p => p.expiresAt));
    expiryTimer = setTimer(() => { prune(); changed(); scheduleExpiry(); }, Math.max(1, next - now()));
    expiryTimer?.unref?.(); // Node test consumers must not keep the process alive.
  };
  const message = p => `The limit for ${RATE_ACTIONS[p.scope].label.toLowerCase()} has been reached. Try again in ${formatRateWait((p.expiresAt - now()) / 1000)}. Keep your entries; nothing will be sent automatically.`;
  const blocked = (path, options = {}) => {
    return scopesFor(path, (options.method || 'GET').toUpperCase()).map(scope => policies.get(scope))
      .filter(p => p?.remaining === 0 && p.expiresAt > now()).sort((a, b) => b.expiresAt - a.expiresAt)[0] || null;
  };
  const observe = response => {
    prune();
    const header = response.headers.get('X-RateLimit-Policies');
    if (!header || header.length > 10000) return;
    let items;
    try { items = JSON.parse(header); } catch { return; }
    if (!Array.isArray(items) || items.length > Object.keys(RATE_ACTIONS).length) return;
    let candidate;
    for (const raw of items) {
      if (!validPolicy(raw)) continue;
      const previous = policies.get(raw.scope), expiresAt = now() + raw.resetAfter * 1000;
      // Concurrent document responses may arrive out of order. Do not restore
      // spent allowance or extend the window. Conditional scopes may change identity.
      const sameWindow = previous && !RATE_ACTIONS[raw.scope].conditional && Math.abs(previous.expiresAt - expiresAt) < 3000;
      const p = { ...raw, expiresAt: sameWindow ? Math.min(previous.expiresAt, expiresAt) : expiresAt,
        remaining: sameWindow ? Math.min(previous.remaining, raw.remaining) : raw.remaining };
      const level = p.remaining === 0 ? 2 : p.remaining <= Math.max(1, Math.floor(p.limit / 10)) ? 1 : 0;
      // Conditional quotas are never used to stop retries locally: a receipt
      // replay or existing upload session does not consume a new-item allowance.
      const warned = previous && Math.abs(previous.expiresAt - expiresAt) < 3000 ? previous.warned : 0;
      p.warned = Math.max(warned || 0, level);
      policies.set(p.scope, p);
      if (level && (level > (warned || 0) || !raw.allowed)) {
        if (moreUrgent(p, candidate)) candidate = p;
      }
      if (notice?.scope === p.scope) notice = p;
    }
    // Never replace a longer active cooldown with a shorter window's warning.
    if (candidate) notify(notice?.remaining === 0 && notice.expiresAt > now() && !moreUrgent(candidate, notice) ? notice : candidate);
    changed(); scheduleExpiry();
  };
  return {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => notice,
    getCooldown: blocked,
    refresh: () => { if (prune()) changed(); scheduleExpiry(); },
    dispose: () => { clearTimer(expiryTimer); listeners.clear(); policies.clear(); notice = null; pending = null; },
    dismiss: () => emit(null),
    observe,
    beginBatch: () => {
      batch++; let ended = false;
      return () => { if (ended) return; ended = true; batch--; if (!batch && pending) { const value = pending; pending = null; notify(value); } };
    },
    assertReady: (path, options) => {
      const p = blocked(path, options);
      if (p) { notify(p); throw Object.assign(new Error(message(p)), { status: 429 }); }
    },
    fetch: async (path, options = {}) => {
      options.signal?.throwIfAborted();
      const p = blocked(path, options);
      if (p) {
        notify(p);
        return new Response(JSON.stringify({ error: message(p), accepted: false }), { status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.max(1, Math.ceil((p.expiresAt - now()) / 1000))) } });
      }
      const response = await fetcher(path, options);
      observe(response);
      return response;
    },
  };
}

export const rateFeedback = createRateFeedbackClient();
export const rateAwareFetch = rateFeedback.fetch;
export const assertRateLimitReady = rateFeedback.assertReady;
