import { createHash } from 'node:crypto';
import { coordinates } from '../shared/storeLocations.js';
import { readContactJson } from './contact.js';

const failure = (message, status = 503) => Object.assign(new Error(message), { status, publicSearch: true });
const unavailable = () => failure('Place search is temporarily unavailable. You can still search our branch directory.');

// Fixed provider URL, bounded responses/concurrency/cache, no query or provider-error logging.
export function createPlaceSearch({ apiKey, rate, json, fetchImpl = fetch, readJson = readContactJson, now = Date.now, allowedOrigins = [] }) {
  const cache = new Map(), pending = new Map();
  const lookup = async query => {
    const key = createHash('sha256').update(query.toLowerCase()).digest('hex');
    for (const [id, entry] of cache) if (entry.expires <= now()) cache.delete(id);
    if (cache.has(key)) return cache.get(key).places;
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 4) throw failure('Place search is busy. Please try again shortly.');
    const work = (async () => {
      // Shared RPC budget across Vercel instances, separate from applicant scopes.
      if (!await rate(null, 'place-search-global', 80)) throw failure('Place search has reached its temporary limit. Please try again later.', 429);
      const url = new URL('https://api.geoapify.com/v1/geocode/search');
      url.search = new URLSearchParams({ text: query, format: 'json', limit: '5', lang: 'en', apiKey });
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (!response.ok) { await response.body?.cancel(); throw unavailable(); }
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 128 * 1024) { await reader.cancel(); throw unavailable(); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!Array.isArray(body.results)) throw unavailable();
      const seen = new Set();
      const places = body.results.slice(0, 5).flatMap(item => {
        const position = coordinates(item?.lat, item?.lon);
        const label = typeof item?.formatted === 'string' ? item.formatted.trim().slice(0, 300) : '';
        const id = position ? `${position.lat},${position.lng}:${label}` : '';
        if (!position || !label || seen.has(id)) return [];
        seen.add(id); return [{ label, position }];
      });
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { places, expires: now() + 300000 });
      return places;
    })();
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  };
  return async (req, res) => {
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, {error:'Use POST for place search.'}); }
      if (req.headers['sec-fetch-site'] === 'cross-site') throw failure('Use place search from the Siomai Street website.', 403);
      if (req.headers.origin) {
        let allowed = false;
        try { const origin = new URL(req.headers.origin); allowed = ['http:', 'https:'].includes(origin.protocol) && origin.host === req.headers.host; } catch { /* reject */ }
        if (!allowed && !allowedOrigins.includes(req.headers.origin)) throw failure('Use place search from the Siomai Street website.', 403);
      }
      if (!apiKey) throw unavailable();
      if (!await rate(req, 'place-search-client', 20)) throw failure('Too many searches. Please try again later or use the branch directory.', 429);
      let body;
      try { body = await readJson(req); } catch (error) { throw failure('Enter a shorter search and try again.', error.status || 400); }
      const query = typeof body?.query === 'string' ? body.query.trim().replace(/\s+/g, ' ') : '';
      if (query.length < 3 || query.length > 180 || Array.from(query).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw failure('Enter 3–180 characters, including a city or country for better results.', 400);
      const places = await lookup(query);
      return json(res, 200, { places });
    } catch (error) {
      const safe = error.publicSearch ? error : unavailable();
      if (safe.status === 429) res.setHeader('Retry-After', '3600');
      return json(res, safe.status, { error: safe.message });
    }
  };
}
