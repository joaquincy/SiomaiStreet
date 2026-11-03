import { createHash } from 'node:crypto';
import { readContactJson } from './contact.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createHelpfulHandler({ json, rate, rpc, allowedOrigins = [], readJson = readContactJson }) {
  return async (req, res, reviewId) => {
    try {
      let sameOrigin = false;
      try { const origin = new URL(req.headers.origin); sameOrigin = ['http:', 'https:'].includes(origin.protocol) && origin.host === req.headers.host; } catch { /* reject malformed origins */ }
      if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && !sameOrigin && !allowedOrigins.includes(req.headers.origin))) return json(res, 403, { error: 'Vote from the Siomai Street website.' });
      if (!await rate(req)) { res.setHeader('Retry-After', '3600'); return json(res, 429, { error: 'Too many votes. Please try again in an hour.' }); }
      let body;
      try { body = await readJson(req); } catch (error) { return json(res, error.status || 400, { error: 'Could not read your vote. Refresh the page and retry.' }); }
      if (typeof body?.voterId !== 'string' || !uuid.test(body.voterId)) return json(res, 400, { error: 'Could not identify this vote. Refresh the page and retry.' });
      const voterHash = createHash('sha256').update(`review-helpful:${reviewId}:${body.voterId.toLowerCase()}`).digest('hex');
      const helpful = await rpc({ p_review_id: reviewId, p_voter_hash: voterHash });
      if (helpful === null) return json(res, 404, { error: 'This review is no longer available.' });
      if (!Number.isSafeInteger(helpful) || helpful < 0) throw new Error('Invalid count');
      return json(res, 200, { reviewId, helpful, voted: true });
    } catch {
      return json(res, 503, { error: 'Your vote could not be confirmed. Retry with this button; it will not be counted twice.' });
    }
  };
}
