// Loopback-only preview of the production build. No Supabase access or writes.
// node tests/helpers/store-map-preview.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createPlaceSearch } from '../../server/placeSearch.js';
const search = createPlaceSearch({
  apiKey:'synthetic-only', rate:async()=>true,
  json:(res,status,body)=>res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(body)),
  fetchImpl:async url=>{
    const query=url.searchParams.get('text').toLowerCase();
    if (query.includes('error')) return new Response('',{status:503});
    return Response.json({results:query.includes('empty')?[]:[
      {formatted:'Synthetic Daet search point — not a real address',lat:14.113,lon:122.956},
      {formatted:'Synthetic overseas search point — not a real address',lat:51.5,lon:-0.12},
    ]});
  },
});
const root = resolve('dist');
const stores = [
  { id:'synthetic-a', name:'Synthetic Daet A', address:'Synthetic location — not a real store', city:'Daet', region:'Bicol', hours:'Test hours only', position:{lat:14.112,lng:122.955} },
  { id:'synthetic-b', name:'Synthetic Daet B', address:'Synthetic location — not a real store', city:'Daet', region:'Bicol', position:{lat:14.116,lng:122.96} },
  { id:'synthetic-no-pin', name:'Synthetic No Pin', address:'Synthetic directory entry', city:'Manila', region:'NCR', position:null },
];
const server = createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  if (path === '/api/place-search') return search(req,res);
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (path.startsWith('/api/')) {
    const data = path === '/api/store-locations' ? {stores} : path === '/api/reviews' ? [] : path === '/api/contact-options' ? {customer:{enabled:false},franchise:{enabled:false}} : {branches:[]};
    res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(data)); return;
  }
  let target;
  try { target=resolve(root,'.'+decodeURIComponent(path)); }
  catch { res.writeHead(400).end('Invalid path'); return; }
  if (!target.startsWith(root+sep) && target !== root) { res.writeHead(403).end(); return; }
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
  try { const bytes=await readFile(path==='/' ? resolve(root,'index.html') : target); res.writeHead(200,{'content-type':types[extname(target)] || (path==='/'?'text/html':'application/octet-stream')}).end(bytes); }
  catch { res.writeHead(404).end('Not found'); }
}).listen(0,'127.0.0.1',()=>console.log(`Synthetic production preview: http://127.0.0.1:${server.address().port}/#stores (no database writes)`));
