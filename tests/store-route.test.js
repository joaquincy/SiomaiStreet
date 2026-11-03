import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createStoreRoute, normalizeRoute } from '../server/storeRoute.js';
const route={features:[{geometry:{type:'MultiLineString',coordinates:[[[122.95,14.11],[122.96,14.12]]]},properties:{distance:813,time:731}}]};
const input={start:{lat:14.11,lng:122.95},end:{lat:14.12,lng:122.96},mode:'walk'};
function harness(options={}) {
  let calls=0;const handler=createStoreRoute({apiKey:'synthetic',rate:async()=>true,json:(res,status,body)=>Object.assign(res,{status,body}),fetchImpl:async url=>{calls++;assert.equal(url.origin,'https://api.geoapify.com');return Response.json(route);},...options});
  return {get calls(){return calls;},run:async(body=input,headers={},method='POST')=>{const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={host:'example.test','content-type':'application/json',...headers};const res={setHeader(){}};await handler(req,res);return res;}};
}
test('route projection switches lon/lat safely and returns bounded numeric estimates',()=>{
  assert.deepEqual(normalizeRoute(route),{paths:[[[14.11,122.95],[14.12,122.96]]],distance:813,seconds:731});
  for(const value of [{features:[]},{features:[{geometry:{type:'LineString'}}]},{features:[{...route.features[0],properties:{distance:-1,time:4}}]},{features:[{...route.features[0],geometry:{type:'MultiLineString',coordinates:[[[200,95],[0,0]]]}}]}]) assert.throws(()=>normalizeRoute(value));
});
test('route endpoint validates mode, range, coordinates, method and origin before provider',async()=>{
  const h=harness();
  assert.equal((await h.run(input,{},'GET')).status,405);
  assert.equal((await h.run(input,{origin:'https://other.test'})).status,403);
  for(const value of [{...input,mode:'transit'},{...input,start:{lat:91,lng:0}},null]) assert.equal((await h.run(value)).status,400);
  assert.equal((await h.run({...input,end:{lat:51,lng:0}})).status,422);
  assert.equal(h.calls,0);
  assert.equal((await h.run()).status,200);
});
test('route key/limits/provider failures fail closed and do not leak errors',async()=>{
  assert.equal((await harness({apiKey:''}).run()).status,503);
  const denied=harness({rate:async()=>false}); assert.equal((await denied.run()).status,429);assert.equal(denied.calls,0);
  const global=harness({rate:async(_req,scope)=>scope!=='place-search-global'});assert.equal((await global.run()).status,429);assert.equal(global.calls,0);
  for(const fetchImpl of [async()=>{throw new Error('private credential');},async()=>new Response('x'.repeat(1048577)),async()=>new Response('private info',{status:403})]) {const r=await harness({fetchImpl}).run();assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(r.body),/private/);}
});
test('explicit local origins work through proxy but cross-site headers remain rejected',async()=>{
  const h=harness({allowedOrigins:['http://localhost:3000']});
  assert.equal((await h.run(input,{origin:'http://localhost:3000'})).status,200);
  assert.equal((await h.run(input,{origin:'http://localhost:3000','sec-fetch-site':'cross-site'})).status,403);
});
