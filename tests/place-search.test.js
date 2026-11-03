import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createPlaceSearch } from '../server/placeSearch.js';
import { storeResults } from '../src/utils/storeFinder.js';

function setup(overrides = {}) {
  const calls = { provider:0, rates:[], reads:0 };
  const handler = createPlaceSearch({
    apiKey:'synthetic-secret', rate: async (_req,scope,limit) => { calls.rates.push({scope,limit}); return true; },
    fetchImpl: async url => { calls.provider++; calls.url=new URL(url); return Response.json({results:[{formatted:'Synthetic town',lat:14.1,lon:122.9,privateField:'hidden'}]}); },
    json: (res,status,body) => Object.assign(res,{status,body}), ...overrides,
  });
  const run = async (body = {query:'Synthetic town'}, options = {}) => {
    const req = Readable.from([Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
    req.method=options.method || 'POST'; req.headers={'content-type':'application/json',host:'www.siomaistreet.online',origin:'https://www.siomaistreet.online',...options.headers};
    const res={headers:{},setHeader(k,v){this.headers[k]=v;}};
    await handler(req,res); return res;
  };
  return {run,calls};
}

test('place search projects valid results, keeps key server-side and uses bounded cache with expiry', async () => {
  let clock=1000;
  const {run,calls}=setup({now:()=>clock});
  const first=await run();
  assert.deepEqual(first.body,{places:[{label:'Synthetic town',position:{lat:14.1,lng:122.9}}]});
  assert.equal(calls.url.origin,'https://api.geoapify.com');
  assert.equal(calls.url.searchParams.get('limit'),'5');
  assert.equal(calls.url.searchParams.has('filter'),false);
  await run({query:' SYNTHETIC   town '}); assert.equal(calls.provider,1);
  clock+=300001; await run(); assert.equal(calls.provider,2);
  assert.equal(calls.rates.filter(r=>r.scope==='place-search-global').length,2);
  assert.doesNotMatch(JSON.stringify(first.body),/secret|privateField/);
});

test('configuration and shared per-client/global limits fail closed before provider calls', async () => {
  const missing=setup({apiKey:''}); assert.equal((await missing.run()).status,503); assert.equal(missing.calls.provider,0);
  let reads=0;
  const denied=setup({rate:async()=>false,readJson:async()=>{reads++; return {};}});
  const response=await denied.run(); assert.equal(response.status,429); assert.equal(reads,0); assert.equal(response.headers['Retry-After'],'3600');
  const global=setup({rate:async(_req,scope)=>scope!=='place-search-global'});
  assert.equal((await global.run()).status,429); assert.equal(global.calls.provider,0);
  const unavailable=setup({rate:async()=>{throw new Error('private RPC error');}});
  assert.equal((await unavailable.run()).status,503);
});

test('method, origin, malformed input and bounded bodies are rejected with useful errors', async () => {
  const {run,calls}=setup();
  assert.equal((await run({}, {method:'GET'})).status,405);
  assert.equal((await run({}, {headers:{origin:'https://unrelated.example'}})).status,403);
  assert.equal((await run({}, {headers:{'sec-fetch-site':'cross-site'}})).status,403);
  for (const body of [{query:'ab'},{query:'x'.repeat(181)},null,'invalid json']) assert.equal((await run(body)).status,400);
  assert.equal((await run('x'.repeat(13000))).status,413);
  assert.equal((await run({}, {headers:{'content-type':'text/plain'}})).status,415);
  assert.equal(calls.provider,0);
});

test('malformed/oversized provider responses and failures never expose provider details', async () => {
  for (const fetchImpl of [
    async()=>new Response('private key info',{status:429}),
    async()=>new Response('x'.repeat(131073)),
    async()=>Response.json({unexpected:true}),
    async()=>{throw new Error('timeout private-key');},
  ]) {
    const response=await setup({fetchImpl}).run();
    assert.equal(response.status,503); assert.doesNotMatch(JSON.stringify(response.body),/private|unexpected/);
  }
  const sanitized=setup({fetchImpl:async()=>Response.json({results:[null,{formatted:'bad',lat:91,lon:0},{formatted:'good',lat:0,lon:0},{formatted:'good',lat:0,lon:0}]})});
  assert.deepEqual((await sanitized.run()).body.places,[{label:'good',position:{lat:0,lng:0}}]);
  assert.deepEqual((await setup({fetchImpl:async()=>Response.json({results:[]})}).run()).body,{places:[]});
});

test('simultaneous identical searches share one provider request and independent concurrency is capped', async () => {
  let release; const gate=new Promise(resolve=>{release=resolve;}); let count=0;
  const {run}=setup({fetchImpl:async()=>{count++; await gate; return Response.json({results:[]});}});
  const jobs=[run(),run(),run({query:'second town'}),run({query:'third town'}),run({query:'fourth town'})];
  // Let the streams parse and the provider requests reach the controlled gate.
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(count,4);
  assert.equal((await run({query:'fifth town'})).status,503);
  release(); assert.ok((await Promise.all(jobs)).every(result=>result.status===200));
});

test('chosen search point ranks real branch pins while preserving unpinned directory entries', () => {
  const stores=[{id:'a',name:'A distant',position:{lat:20,lng:120}},{id:'b',name:'B closest',position:{lat:14.1,lng:122.9}},{id:'c',name:'C no pin',position:null}];
  const sorted=storeResults(stores,{position:{lat:14.1,lng:122.9},sort:'nearest'});
  assert.deepEqual(sorted.map(s=>s.id),['b','a','c']);
  assert.equal(sorted[0].distance,0); assert.equal(sorted[2].distance,Infinity);
});

test('development proxy permits only explicitly configured local origins',async()=>{
  const local=setup({allowedOrigins:['http://localhost:3000']});
  assert.equal((await local.run({query:'Synthetic town'},{headers:{origin:'http://localhost:3000',host:'127.0.0.1:3001'}})).status,200);
  assert.equal((await setup().run({query:'Synthetic town'},{headers:{origin:'http://localhost:3000'}})).status,403);
});
