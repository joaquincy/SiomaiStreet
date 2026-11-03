import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { RATE_POLICIES, policyScopes } from '../shared/ratePolicies.js';
export const MAX_APPLICATION_BYTES = 101 * 1024 * 1024;
const fail = (message, status) => Object.assign(new Error(message), { status });
const normalizeIP = ip => ip?.toLowerCase().startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;

export function clientIP(req, trustedProxies = []) {
  // Vercel overwrites this header at its edge. Trust it only inside Vercel.
  if (process.env.VERCEL === '1') {
    const forwarded = req.headers['x-vercel-forwarded-for'];
    const candidate = typeof forwarded === 'string' ? normalizeIP(forwarded.split(',')[0].trim()) : null;
    if (candidate && isIP(candidate)) return candidate;
    return 'unknown-vercel-client';
  }
  let ip = normalizeIP(req.socket.remoteAddress) || 'unknown';
  const chain = String(req.headers['x-forwarded-for'] || '').split(',').map(value => normalizeIP(value.trim()));
  // Ignore forwarded headers unless each intervening hop is explicitly trusted.
  while (trustedProxies.includes(ip) && chain.length) {
    const candidate = chain.pop();
    if (!isIP(candidate)) break;
    ip = candidate;
  }
  return ip;
}

export function createApplicationAdmission({ checkRate, trustedProxies = [], maxConcurrent = 1, verify = async () => {} }) {
  let active = 0;
  return async (req, res) => {
    res.setHeader('Connection', 'close'); // Rejections must not drain an untrusted upload.
    res.setHeader('Retry-After', '60');
    const size = req.headers['content-length'];
    if (size !== undefined && (!/^\d+$/.test(size) || Number(size) > MAX_APPLICATION_BYTES)) {
      throw fail('Application upload is too large.', 413);
    }
    if (!req.headers['content-type']?.toLowerCase().startsWith('multipart/form-data;')) {
      throw fail('Expected a multipart form submission.', 400);
    }
    if (active >= maxConcurrent) throw fail('The upload service is busy. Keep your draft and retry shortly.', 503);
    active++;
    try {
      if (!await checkRate(clientIP(req, trustedProxies), 'ingress', 20)) {
        res.setHeader('Retry-After', '3600');
        throw fail('Too many upload attempts. Keep your draft and try again later.', 429);
      }
      await verify(req);
    } catch (error) { active--; throw error; }
    res.removeHeader?.('Retry-After');
    let released = false;
    return () => { if (!released) { released = true; active--; } };
  };
}

export function rateNetwork(identity) {
  if (isIP(identity) !== 6) return identity;
  const normalized = new URL(`http://[${identity.split('%')[0]}]`).hostname.slice(1, -1);
  // IPv4-mapped IPv6 uses the same key as IPv4, including hexadecimal spelling.
  const mapped = normalized.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/);
  if (mapped) return mapped.slice(1).flatMap(word => { const n = parseInt(word, 16); return [n >> 8, n & 255]; }).join('.');
  const [left, right] = normalized.split('::');
  const head = left ? left.split(':') : [], tail = right ? right.split(':') : [];
  const words = normalized.includes('::') ? [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail] : head;
  // Rotating IPv6 privacy addresses within the same /64 must not mint quotas.
  return `${words.slice(0, 4).map(word => parseInt(word, 16).toString(16)).join(':')}::/64`;
}

export function createSharedApplicationRateLimit({ secret, rpc, onResult = () => {} }) {
  return async (identity, scope, limit) => {
    if (!secret || secret.length < 32) throw fail('Application abuse protection is not configured.', 503);
    if (typeof identity !== 'string' || !identity || identity.length > 512) throw fail('Invalid rate identity.', 503);
    if (!Object.hasOwn(RATE_POLICIES, scope) || RATE_POLICIES[scope].limit !== limit) throw fail('Invalid server rate policy.', 503);
    const scopes = policyScopes(scope), subject = rateNetwork(identity);
    const requested = scopes.map(name => ({ key_hash: createHmac('sha256', secret).update(`${name}:${subject}`).digest('hex'),
      max_requests: RATE_POLICIES[name].limit, window_seconds: RATE_POLICIES[name].windowSeconds }));
    let result;
    try { result = await rpc({ p_policies: requested }); }
    catch { throw fail('Application abuse protection is unavailable.', 503); }
    const invalid = () => { throw fail('Application abuse protection is unavailable.', 503); };
    if (!result || typeof result.allowed !== 'boolean' || !Array.isArray(result.policies) || result.policies.length !== requested.length) invalid();
    const records = requested.map((expected, i) => {
      const matches = result.policies.filter(p => p?.key_hash === expected.key_hash);
      if (matches.length !== 1) invalid();
      const p = matches[0];
      if (typeof p.allowed !== 'boolean' || p.limit !== expected.max_requests || p.windowSeconds !== expected.window_seconds
        || !Number.isInteger(p.remaining) || p.remaining < 0 || p.remaining > p.limit || (result.allowed && p.remaining === p.limit) || (!p.allowed && p.remaining !== 0)
        || !Number.isInteger(p.resetAfter) || p.resetAfter < 1 || p.resetAfter > p.windowSeconds) invalid();
      return { scope: scopes[i], limit: p.limit, allowed: p.allowed, remaining: p.remaining, resetAfter: p.resetAfter, windowSeconds: p.windowSeconds };
    });
    if (result.allowed !== records.every(p => p.allowed)) invalid();
    for (const record of records) {
      onResult(record);
    }
    return result.allowed;
  };
}
