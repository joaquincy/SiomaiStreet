import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { initialRoutePoints, latestMapRequest, routePoint, routeProblem } from '../src/utils/routePlanner.js';
import { beginLocationLookup } from '../src/utils/storeFinder.js';

test('default timers retain the global receiver required by browser timers', () => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  let cleared = 0;
  try {
    globalThis.setTimeout = function () { assert.equal(this, globalThis); return 123; };
    globalThis.clearTimeout = function () { assert.equal(this, globalThis); cleared++; };
    const work = latestMapRequest();
    work.start(100); work.cancel();
    const cancel = beginLocationLookup({ getCurrentPosition() {} }, { onSuccess() {}, onError() {} });
    cancel();
    assert.equal(cleared, 2);
  } finally {
    globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear;
  }
});

const origin = { label: 'Synthetic starting address', position: { lat: 14.11, lng: 122.95 } };
const destination = { label: 'Synthetic destination', position: { lat: 14.12, lng: 122.96 } };
const branch = { name: 'Synthetic branch', position: destination.position };

test('unpinned branches never become route destinations; manually selected addresses work without geolocation', () => {
  assert.deepEqual(initialRoutePoints({ name: 'Unpinned', address: 'Daet' }, null), { start: null, destination: null });
  assert.deepEqual(initialRoutePoints({ name: 'Unpinned' }, destination), { start: null, destination });
  assert.deepEqual(initialRoutePoints(branch, origin), { start: origin, destination: { label: branch.name, position: branch.position } });
  assert.equal(routeProblem(origin, destination), '');
  assert.match(routeProblem(null, destination), /starting point/);
  assert.match(routeProblem(origin, null), /destination/);
  assert.match(routeProblem(origin, origin), /same/);
  assert.match(routeProblem(origin, { label: 'Overseas', position: { lat: 51, lng: 0 } }), /too far apart/);
  assert.equal(routePoint({ label: '   ', position: origin.position }), null);
  assert.equal(routePoint({ label: 'Bad', position: { lat: 91, lng: 1 } }), null);
  assert.equal(routePoint({ label: 'Missing', position: { lat: null, lng: 1 } }), null);
  assert.deepEqual(routePoint({ label: 'Equator', position: { lat: 0, lng: 0 } }), { label: 'Equator', position: { lat: 0, lng: 0 } });
});

function requests() {
  let sequence = 0;
  const pending = new Map();
  const work = latestMapRequest({
    setTimeout(fn) { pending.set(++sequence, fn); return sequence; },
    clearTimeout(id) { pending.delete(id); },
  });
  return { work, pending };
}

test('edits, swaps and unmount cancellation abort old requests and immediately release timers', () => {
  const { work, pending } = requests();
  const first = work.start(12000);
  assert.equal(pending.size, 1);
  const second = work.start(12000);
  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(first.isLatest(), false);
  assert.equal(pending.size, 1);
  first.finish(); // A late response cannot finish a newer request.
  assert.equal(second.isCurrent(), true);
  assert.equal(pending.size, 1);
  work.cancel(); work.cancel();
  assert.equal(second.signal.aborted, true);
  assert.equal(second.isLatest(), false);
  assert.equal(pending.size, 0);
});

test('timeouts cannot publish a late route but remain identifiable for useful errors and retries', () => {
  const { work, pending } = requests();
  const first = work.start(18000);
  [...pending.values()][0]();
  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(first.isLatest(), true);
  first.finish();
  assert.equal(pending.size, 0);
  const retry = work.start(18000);
  assert.equal(retry.isCurrent(), true);
  retry.finish();
  assert.equal(pending.size, 0);
});

test('planner renders two labeled address searches, honest pin guidance and usable radio controls', async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null, ws: false }, logLevel: 'error' });
  t.after(() => vite.close());
  const { default: RoutePlanner } = await vite.ssrLoadModule('/src/pages/Home/components/RoutePlanner.jsx');
  const render = props => renderToStaticMarkup(createElement(RoutePlanner, { onRoute() {}, onExplore() {}, ...props }));
  const empty = render({ store: { name: 'Unpinned branch' } });
  assert.match(empty, /label for="store-route-from"/);
  assert.match(empty, /label for="store-route-to"/);
  assert.doesNotMatch(empty, /no published map pin|Search results are not confirmed branch locations/);
  assert.match(empty, /Choose your start and destination/);
  assert.equal((empty.match(/type="submit"/g) || []).length, 2);
  assert.doesNotMatch(empty, /aria-describedby="store-route-readiness" disabled/);
  assert.match(empty, /Search for a starting point and a destination/);
  assert.match(empty, /<legend>Travel mode<\/legend>/);
  assert.equal((empty.match(/type="radio"/g) || []).length, 2);
  assert.doesNotMatch(empty, /<select|<iframe|<script/);
  const ready = render({ store: branch, searchPoint: origin });
  assert.match(ready, /value="Synthetic starting address"/);
  assert.match(ready, /value="Synthetic branch"/);
  assert.match(ready, /Ready. Show route/);
  assert.doesNotMatch(ready, /aria-describedby="store-route-readiness" disabled/);
  const hidden = render({ store: branch, searchPoint: origin, active: false });
  assert.match(hidden, /aria-labelledby="store-route-title" hidden/);
});
