import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { createServer } from 'vite';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { getSrcSet } from '../src/utils/responsiveImage.js';

test('complete homepage renders without undefined references and keeps both featured stories',async t=>{
  const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},logLevel:'error'});
  t.after(()=>vite.close());
  const {default:Home}=await vite.ssrLoadModule('/src/pages/Home/Home.jsx');
  const html=renderToStaticMarkup(createElement(HelmetProvider,null,createElement(MemoryRouter,null,createElement(Home))));
  assert.match(html,/Classic Pork/);
  assert.match(html,/Bilao Platters/);
  assert.match(html,/fm-story--first reveal/);
  assert.match(html,/fm-story--second reveal/);
  for(const [,value] of html.matchAll(/srcSet="([^"]+)"/gi)) {
    for(const candidate of value.split(',')) assert.match(candidate.trim(),/^\S+ \d+w$/);
  }
});

test('responsive image helper encodes filename spaces and reserved delimiters',()=>{
  assert.equal(getSrcSet('/images/siomai street logo.png',[100,200]),'/images/responsive/siomai%20street%20logo-100w.png 100w, /images/responsive/siomai%20street%20logo-200w.png 200w');
  assert.equal(getSrcSet('/images/a,b #1.png',[200]),'/images/responsive/a%2Cb%20%231-200w.png 200w');
  assert.equal(getSrcSet('/images/menu-pork.png',[]),'');
});

test('literal srcsets contain valid width descriptors and resolve to existing image files',async()=>{
  async function scan(dir) {
    for(const entry of await readdir(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if(entry.isDirectory()){await scan(path);continue;}
      if(!path.endsWith('.jsx'))continue;
      const source=await readFile(path,'utf8');
      for(const [,value] of source.matchAll(/srcSet="([^"]+)"/g)) {
        for(const candidate of value.split(',')) {
          const match=candidate.trim().match(/^(\S+) (\d+)w$/);
          assert.ok(match,`${path}: invalid srcset candidate ${candidate.trim()}`);
          if(match[1].startsWith('/images/')) await access(join('public',decodeURIComponent(match[1])));
        }
      }
    }
  }
  await scan('src');
});
