import test from 'node:test';
import assert from 'node:assert/strict';
import { coordinates, publicStore, normalizeStore, matchesStore, distanceKm, directionsUrl, phoneUrl } from '../shared/storeLocations.js';
import { createStoreLocationsReader } from '../server/storeLocations.js';

const branch = { branch_id: 1, branch_name: 'Synthetic España Store', branch_address: 'Synthetic address only', branch_status: 'Active', internal_revenue: 999 };
const profile = { branch_id: 1, published: true, city: 'Manila', region: 'NCR', latitude: 14.6, longitude: 121, hours_note: 'Mon–Fri 10:00–18:00', private_notes: 'never publish' };

test('coordinates reject empty, malformed and out-of-range values without fabricating a zero pin', () => {
  for (const pair of [[null,null],['',''],[' ',121],['bad',121],[91,121],[14,181],[Infinity,1],[false,0]]) assert.equal(coordinates(...pair), null);
  assert.deepEqual(coordinates('14.6','121'), {lat:14.6,lng:121});
  assert.deepEqual(coordinates(0,0), {lat:0,lng:0});
});
test('public projection hides inactive branches, unpublished details and unrelated private columns', () => {
  assert.equal(publicStore({...branch,branch_status:'Inactive'},profile),null);
  const store = publicStore(branch,profile);
  assert.equal(store.city,'Manila');
  assert.equal(store.internal_revenue,undefined);
  assert.equal(store.private_notes,undefined);
  assert.equal(publicStore(branch,{...profile,published:false}).position,null);
  assert.equal(publicStore(branch).hours,'');
});
test('search supports accents, multiple terms, regions and a meaningful empty result', () => {
  const store = publicStore(branch,profile);
  assert.equal(matchesStore(store,'espana MANILA','NCR'),true);
  assert.equal(matchesStore(store,'españa','Other region'),false);
  assert.equal(matchesStore(store,'no matching branch'),false);
  assert.equal(matchesStore(store,'   '),true);
});
test('distance sorting is finite and geographically meaningful', () => {
  const origin = {lat:0,lng:0};
  assert.equal(distanceKm(origin,origin),0);
  assert.ok(Math.abs(distanceKm(origin,{lat:1,lng:0})-111.195)<.01);
  assert.equal(distanceKm(origin,null),Infinity);
  assert.ok(distanceKm(origin,{lat:0,lng:180})>20000);
});
test('directions are encoded Google URLs without device location; incomplete addresses have no invented target', () => {
  const store = publicStore(branch,{...profile,google_place_id:'place & test'});
  const url = new URL(directionsUrl(store));
  assert.equal(url.hostname,'www.google.com');
  assert.equal(url.searchParams.get('destination'),'14.6,121');
  assert.equal(url.searchParams.get('destination_place_id'),'place & test');
  assert.equal(url.searchParams.has('origin'),false);
  assert.equal(directionsUrl({...store,position:null,address:''}),null);
  assert.equal(new URL(directionsUrl({...store,position:null})).searchParams.get('destination'),`${store.name}, ${store.address}`);
});
test('phone and response normalization reject unsafe or malformed values', () => {
  assert.equal(phoneUrl('+63 912-345-6789'),'tel:+639123456789');
  assert.equal(phoneUrl('javascript:alert(1)'),null);
  for (const value of [null,{},'bad',{id:'1'}]) assert.equal(normalizeStore(value),null);
  assert.equal(normalizeStore({...publicStore(branch,profile),position:{lat:'',lng:''}}).position,null);
});
test('directory coalesces concurrent requests and expires its cache', async () => {
  let time=0, calls=0;
  const read = createStoreLocationsReader(async path => {calls++; return path.includes('/branches?')?[branch]:[profile];},()=>time);
  const [a,b]=await Promise.all([read(),read()]);
  assert.equal(a,b); assert.equal(calls,2);
  await read(); assert.equal(calls,2);
  time=60001; await read(); assert.equal(calls,4);
});
test('optional migration absence keeps branch directory usable, without hiding authorization/server errors', async () => {
  const request = code => async path => {
    if(path.includes('/branches?')) return [branch];
    throw Object.assign(new Error('database error'),{detail:JSON.stringify({code})});
  };
  const data = await createStoreLocationsReader(request('PGRST205'))();
  assert.equal(data.stores.length,1); assert.equal(data.stores[0].position,null);
  await assert.rejects(createStoreLocationsReader(request('42501'))(),/database error/);
});
test('failed reads can retry and active branches only receive their own approved metadata', async () => {
  let fail=true;
  const read=createStoreLocationsReader(async path=>{
    if(fail) throw new Error('offline');
    return path.includes('/branches?') ? [branch,{...branch,branch_id:2},{...branch,branch_id:3,branch_status:'Inactive'}] : [profile];
  });
  await assert.rejects(read(),/offline/); fail=false;
  const data=await read();
  assert.equal(data.stores.length,2);
  assert.equal(data.stores[1].position,null);
});
test('pagination does not silently drop branch 501', async () => {
  const read=createStoreLocationsReader(async path=>{
    if(!path.includes('/branches?')) return [];
    const offset=Number(new URL(path,'https://test.invalid').searchParams.get('offset'));
    return offset===0 ? Array.from({length:500},(_,i)=>({...branch,branch_id:i+1})) : [{...branch,branch_id:501}];
  });
  assert.equal((await read()).stores.length,501);
});
