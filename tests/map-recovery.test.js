import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDevelopmentOrigins } from '../server/mapOrigins.js';
import { createPlaceSearch } from '../server/placeSearch.js';
import { createStoreRoute } from '../server/storeRoute.js';
import { mapRequest } from '../src/utils/mapRequests.js';

test('both map endpoints accept Vite fallback ports only in development', async () => {
  const origins = mapDevelopmentOrigins({ nodeEnv: 'development' });
  assert.ok(origins.includes('http://localhost:3002'));
  assert.ok(origins.includes('http://127.0.0.1:3010'));
  assert.ok(!origins.includes('http://localhost.evil.test:3002'));
  assert.deepEqual(mapDevelopmentOrigins({ nodeEnv: 'production' }), []);
  assert.deepEqual(mapDevelopmentOrigins({ nodeEnv: 'development', serverless: true }), []);
  for (const createHandler of [createPlaceSearch, createStoreRoute]) {
    for (const [allowedOrigins, origin, fetchSite, expected] of [
      [origins, 'http://localhost:3002', 'same-origin', 429],
      [[], 'http://localhost:3002', 'same-origin', 403],
      [origins, 'http://localhost.evil.test:3002', 'same-origin', 403],
      [origins, 'http://localhost:3002', 'cross-site', 403],
    ]) {
      let rateCalls = 0;
      const handler = createHandler({ allowedOrigins, apiKey: 'synthetic', rate: async () => { rateCalls++; return false; }, json: (res,status) => { res.status = status; } });
      const req = { method: 'POST', headers: { origin, host: '127.0.0.1:3001', 'sec-fetch-site': fetchSite } };
      const res = { setHeader() {} };
      await handler(req,res);
      assert.equal(res.status, expected);
      assert.equal(rateCalls, expected === 429 ? 1 : 0);
    }
  }
});

test('all search and route fields receive actionable failures without losing their payload', async () => {
  for (const [status, pattern] of [[403,/blocked/],[404,/latest deployment/],[429,/limit/],[503,/temporarily/]]) {
    await assert.rejects(mapRequest('/api/place-search', {query:'Synthetic'}, undefined,
      async () => Response.json({error:'Search temporarily unavailable.'},{status})), pattern);
  }
  await assert.rejects(mapRequest('/api/place-search', {}, undefined, async () => new Response('<html>broken proxy</html>')), /unreadable/);
  await assert.rejects(mapRequest('/api/place-search', {}, undefined, async () => { throw new Error('network'); }), /connection/);
  const payload = {query:'Synthetic town'};
  const result = await mapRequest('/api/place-search', payload, undefined, async (path, options) => {
    assert.equal(path, '/api/place-search'); assert.deepEqual(JSON.parse(options.body), payload);
    return Response.json({places:[]});
  });
  assert.deepEqual(result,{places:[]});
  assert.deepEqual(payload,{query:'Synthetic town'});
});
