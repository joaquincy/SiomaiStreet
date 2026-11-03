import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { clientIP } from '../server/applicationSecurity.js';
import { MAX_REVIEW_PHOTO_BYTES, MAX_REVIEW_REQUEST_BYTES } from '../shared/reviewUpload.js';

test('Vercel entry serves the raw Node API without opening its local port or loading local secrets', async t => {
  const { default: handler, config } = await import('../api/index.js');
  assert.equal(config.helpers, false);
  const server = createServer(handler);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  const body = await health.json(); assert.equal(body.runtime, 'serverless');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
  const placeSearch = await fetch(`${base}/api/place-search`);
  assert.equal(placeSearch.status,405);
  assert.equal(placeSearch.headers.get('allow'),'POST');
  assert.equal(placeSearch.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(`${base}/api/store-route`)).status,405);
  // An API miss must never return the React app as a successful JSON request.
  assert.match((await (await fetch(`${base}/api/unknown`)).json()).error, /API route/);
  assert.equal((await fetch(`${base}/application`)).status, 404);
});

test('Vercel IP handling trusts only its platform header in the Vercel environment', () => {
  const previous = process.env.VERCEL;
  const req = { headers: { 'x-vercel-forwarded-for': '203.0.113.8', 'x-forwarded-for': '198.51.100.9' }, socket: { remoteAddress: '127.0.0.1' } };
  try {
    delete process.env.VERCEL; assert.equal(clientIP(req), '127.0.0.1');
    process.env.VERCEL = '1'; assert.equal(clientIP(req), '203.0.113.8');
    req.headers['x-vercel-forwarded-for'] = 'invalid'; assert.equal(clientIP(req), 'unknown-vercel-client');
  } finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
});

test('review photo and multipart caps leave room below the platform body ceiling', () => {
  assert.ok(MAX_REVIEW_PHOTO_BYTES + 100000 < MAX_REVIEW_REQUEST_BYTES);
  assert.ok(MAX_REVIEW_REQUEST_BYTES < 4500000);
});

test('production honors explicit scan-off but otherwise requires scanning', async () => {
 const {spawnSync}=await import('node:child_process');
 const code=`const {handleRequest}=await import('./server/index.js'); await handleRequest({url:'/api/health',method:'GET',headers:{},socket:{}},{setHeader(){},writeHead(){},end(body){process.stdout.write(body)}});`;
 for(const [setting,expected] of [['off','disabled'],['on','required'],['','required']]) {
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,SIOMAI_SERVERLESS:'true',NODE_ENV:'production',VERCEL_ENV:'production',DOCUMENT_SCAN:setting}});
  assert.equal(result.status,0,result.stderr); assert.equal(JSON.parse(result.stdout).documentScanning,expected);
 }
});
