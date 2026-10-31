import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { normalizeStore, directionsUrl } from '../shared/storeLocations.js';
import { beginLocationLookup, distanceLabel, linkedStoreId, locationErrorMessage, storeResults, storeShareUrl } from '../src/utils/storeFinder.js';

const stores = [
  normalizeStore({ id: 'missing-pin', name: 'A Synthetic Store', city: 'Daet', address: 'Synthetic address only' }),
  normalizeStore({ id: 'near', name: 'B Synthetic Store', city: 'Manila', region: 'NCR', position: { lat: 14.6, lng: 121 }, address: 'Synthetic España', phone: '+63 912 000 0000', hours: 'Synthetic hours', holidayNote: 'Synthetic holiday exception', landmark: 'Synthetic landmark' }),
  normalizeStore({ id: 'far', name: 'C Synthetic Store', city: 'Manila', region: 'NCR', position: { lat: 15.6, lng: 121 }, address: 'Synthetic distant address' }),
];

test('nearest sorting retains unpinned stores last, respects filters and never mutates the directory', () => {
  const original = structuredClone(stores);
  const results = storeResults(stores, { position: { lat: 14.6, lng: 121 }, sort: 'nearest' });
  assert.deepEqual(results.map(store => store.id), ['near', 'far', 'missing-pin']);
  assert.deepEqual(results.map(store => store.number), [1, 2, 3]);
  assert.deepEqual(storeResults(stores, { query: 'espana', region: 'NCR', position: { lat: 14.6, lng: 121 }, sort: 'nearest' }).map(store => store.id), ['near']);
  assert.deepEqual(storeResults(stores, { query: 'no-such-city' }), []);
  assert.deepEqual(storeResults(stores, { sort: 'nearest' }).map(store => store.id), original.map(store => store.id));
  assert.deepEqual(stores, original);
});

test('distance labels do not show Infinity or invent travel times', () => {
  for (const value of [Infinity, NaN, -1]) assert.equal(distanceLabel(value), '');
  assert.equal(distanceLabel(0), 'Less than 100 m');
  assert.equal(distanceLabel(.54), '500 m');
  assert.equal(distanceLabel(12.34), '12.3 km');
});

test('shared branch links round-trip while stripping unrelated query, path and location data', () => {
  const url = storeShareUrl({ id: 'branch & one' }, 'https://example.invalid/application?lat=1&accessCode=private#other');
  assert.equal(url, 'https://example.invalid/?branch=branch+%26+one#stores');
  assert.equal(linkedStoreId(url), 'branch & one');
  assert.equal(linkedStoreId('bad-url'), null);
  assert.equal(linkedStoreId(`https://example.invalid/?branch=${'x'.repeat(101)}`), null);
});

test('travel modes use Google Maps URLs without transmitting device coordinates', () => {
  for (const mode of ['driving', 'walking', 'transit']) {
    const url = new URL(directionsUrl(stores[1], mode));
    assert.equal(url.searchParams.get('travelmode'), mode);
    assert.equal(url.searchParams.has('origin'), false);
    assert.equal(url.searchParams.get('api'), '1');
  }
  assert.equal(new URL(directionsUrl(stores[1], 'unsafe&origin=1,1')).searchParams.has('travelmode'), false);
  assert.ok(directionsUrl(stores[0]));
});

function lookupHarness() {
  let success, failure, expiry, cleared = 0;
  const results = [], errors = [];
  const cancel = beginLocationLookup({ getCurrentPosition(a, b, options) { success = a; failure = b; assert.equal(options.enableHighAccuracy, false); } },
    { onSuccess: value => results.push(value), onError: value => errors.push(value) },
    { setTimeout(callback) { expiry = callback; return 1; }, clearTimeout() { cleared++; } });
  return { cancel, success, failure, expiry, results, errors, get cleared() { return cleared; } };
}

test('cancelled location requests ignore late success and failure callbacks', () => {
  const request = lookupHarness(); request.cancel();
  request.success({ coords: { latitude: 14.6, longitude: 121 } });
  request.failure({ code: 1 }); request.expiry();
  assert.deepEqual(request.results, []); assert.deepEqual(request.errors, []); assert.ok(request.cleared);
});

test('location lookup resolves once, clears its timer and times out unanswered prompts', () => {
  const success = lookupHarness(); success.success({ coords: {} }); success.expiry(); success.failure({ code: 2 });
  assert.equal(success.results.length, 1); assert.equal(success.errors.length, 0); assert.equal(success.cleared, 1);
  const timeout = lookupHarness(); timeout.expiry(); timeout.success({ coords: {} });
  assert.equal(timeout.results.length, 0); assert.deepEqual(timeout.errors, [{ code: 3 }]);
  assert.match(locationErrorMessage({ code: 1 }), /permission was not granted/);
  assert.match(locationErrorMessage({ code: 3 }), /too long/);
  assert.match(locationErrorMessage(), /Search by city/);
});

test('store UI renders real-data details and safe loading, missing-data and map-failure recovery states', async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
  t.after(() => vite.close());
  const { StoreFinderExperience, StoreDetails, MapInvitation } = await vite.ssrLoadModule('/src/pages/Home/components/StoreFinder.jsx');
  const render = (component, props) => renderToStaticMarkup(createElement(component, props));
  const ready = render(StoreFinderExperience, { data: { status: 'ready', stores }, onRetry() {}, mapsAvailable: true });
  assert.match(ready, /Browse by city/); assert.match(ready, /Narrow by region/);
  assert.match(ready, /aria-controls="store-details"/);
  assert.match(ready, /1 store has no published pin/);
  assert.match(ready, /Selected store: A Synthetic Store/);
  assert.match(ready, /aria-label="Previous store" disabled=""/);
  assert.match(ready, /aria-label="Next store"/);
  assert.match(ready, /<details class="store-finder__directory">/);
  assert.match(ready, /Browse all matching stores/);
  assert.match(ready, /Google privacy policy/);
  assert.doesNotMatch(ready, /<script|<iframe|Open now|Verified|store-finder__google-map/);
  const detailed = render(StoreDetails, { store: stores[1], onMap() {} });
  for (const label of ['Copy address', 'Copy store link', 'Share store', 'View pin', 'Synthetic landmark', 'Synthetic hours', 'Synthetic holiday exception', 'Drive', 'Walk', 'Transit']) assert.ok(detailed.includes(label), label);
  assert.match(detailed, /href="tel:\+639120000000"/);
  assert.match(detailed, /travelmode=driving/);
  assert.match(detailed, /aria-pressed="true"[^>]*>.*Drive/);
  assert.match(detailed, /role="status" aria-live="polite"/);
  assert.match(detailed, /<details class="store-finder__visit"><summary>/);
  const noDetails = render(StoreDetails, { store: normalizeStore({ id: 'empty', name: 'Synthetic empty store' }) });
  assert.match(noDetails, /Opening hours have not been published/);
  assert.doesNotMatch(noDetails, /href="tel:|maps\/dir|Copy address|View pin/);
  const failed = render(StoreFinderExperience, { data: { status: 'error', stores: [] }, onRetry() {}, mapsAvailable: false });
  assert.match(failed, /Try again/); assert.match(failed, /temporarily unavailable/);
  assert.match(failed, /<details class="store-finder__directory" open="">/);
  assert.doesNotMatch(failed, /id="store-details"/);
  const mapFailed = render(MapInvitation, { available: true, failed: true, count: 2, onLoad() {} });
  assert.match(mapFailed, /Retry Google Maps/); assert.match(mapFailed, /still use the store list/);
  const noPins = render(MapInvitation, { available: true, count: 0, onLoad() {} });
  assert.match(noPins, /No map pins/); assert.doesNotMatch(noPins, /<button/);
});
