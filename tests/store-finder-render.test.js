import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';



test('locator renders an accessible loading/fallback UI before map activation, without third-party requests', async t => {
  const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},logLevel:'error'});
  t.after(()=>vite.close());
  const {default:StoreFinder}=await vite.ssrLoadModule('/src/pages/Home/components/StoreFinder.jsx');
  const html=renderToStaticMarkup(createElement(StoreFinder));
  assert.match(html,/id="stores"/);
  assert.match(html,/label for="store-search"/);
  assert.match(html,/label for="store-place-query"/);
  assert.match(html,/Search an address or business worldwide/);
  assert.match(html,/Search sent to/);
  assert.match(html,/Finding our stores/);
  assert.match(html,/Finding the stores to show on your map/);
  assert.doesNotMatch(html,/<script|<iframe|Verified|Open now|DEMO_MAP_ID/);
});
