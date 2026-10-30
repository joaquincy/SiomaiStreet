import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
export const MAX_APPLICATION_BYTES = 101 * 1024 * 1024;
const fail = (message, status) => Object.assign(new Error(message), { status });
const normalizeIP = ip => ip?.startsWith('::ffff:') ? ip.slice(7) : ip;

export function clientIP(req, trustedProxies = []) {
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

export function createApplicationAdmission({ checkRate, trustedProxies = [], maxConcurrent = 1 }) {
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
    } catch (error) { active--; throw error; }
    res.removeHeader?.('Retry-After');
    let released = false;
    return () => { if (!released) { released = true; active--; } };
  };
}

export function createSharedApplicationRateLimit({ secret, rpc }) {
  return async (ip, scope, limit) => {
    if (!secret || secret.length < 32) throw fail('Application abuse protection is not configured.', 503);
    const key = createHmac('sha256', secret).update(`${scope}:${ip}`).digest('hex');
    const allowed = await rpc({ key_hash: key, max_requests: limit });
    if (typeof allowed !== 'boolean') throw fail('Application abuse protection is unavailable.', 503);
    return allowed;
  };
}
