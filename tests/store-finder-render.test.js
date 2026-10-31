import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('locator renders an accessible loading/fallback UI with Maps unconfigured, without third-party requests', async t => {
  const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},logLevel:'error'});
  t.after(()=>vite.close());
  const {default:StoreFinder}=await vite.ssrLoadModule('/src/pages/Home/components/StoreFinder.jsx');
  const html=renderToStaticMarkup(createElement(StoreFinder));
  assert.match(html,/id="stores"/);
  assert.match(html,/label for="store-search"/);
  assert.match(html,/Finding our stores/);
  assert.match(html,/Our interactive map is coming soon/);
  assert.doesNotMatch(html,/<script|<iframe|Verified|Open now|DEMO_MAP_ID/);
});
test('Maps loader deduplicates requests, uses only Google and recovers from network failures', async () => {
  const source=(await readFile(new URL('../src/utils/googleMaps.js',import.meta.url),'utf8')).replace('export function','function');
  const scripts=[];
  const context=vm.createContext({URLSearchParams,Promise,Error,setTimeout,clearTimeout,window:{},document:{createElement:()=>({remove(){this.removed=true;}}),head:{append:s=>scripts.push(s)}}});
  vm.runInContext(source,context);
  const first=context.loadGoogleMaps('synthetic-test-key');
  assert.equal(context.loadGoogleMaps('synthetic-test-key'),first);
  assert.equal(new URL(scripts[0].src).hostname,'maps.googleapis.com');
  const rejection=assert.rejects(first,/could not load/);
  scripts[0].onerror(); await rejection;
  const retry=context.loadGoogleMaps('synthetic-test-key');
  assert.equal(scripts.length,2);
  context.window.google={maps:{importLibrary(){}}};
  const callback=new URL(scripts[1].src).searchParams.get('callback');
  context.window[callback]();
  assert.equal(await retry,context.window.google.maps);
});
