import { coordinates, distanceKm } from '../shared/storeLocations.js';
import { readContactJson } from './contact.js';

const fail = (message, status = 503) => Object.assign(new Error(message), {status, safeRoute:true});
export function normalizeRoute(body) {
  const feature = body?.features?.[0], props = feature?.properties;
  if (!feature) throw fail('No route was found between these points. Try Google Maps or another travel mode.',422);
  if (feature.geometry?.type !== 'MultiLineString') throw fail('The route could not be displayed. Try again.');
  const lines = feature.geometry.coordinates;
  if (!Array.isArray(lines) || !lines.length || lines.length > 20) throw fail('The route is too large to display.');
  let total = 0;
  const paths = lines.map(line => {
    if (!Array.isArray(line) || line.length < 2 || (total += line.length) > 20000) throw fail('The route is too large to display.');
    return line.map(pair => {
      if (!Array.isArray(pair) || typeof pair[0] !== 'number' || typeof pair[1] !== 'number' || !coordinates(pair[1],pair[0])) throw fail('The route could not be displayed.');
      return [pair[1],pair[0]];
    });
  });
  if (![props?.distance,props?.time].every(v=>typeof v==='number' && Number.isFinite(v) && v>=0)) throw fail('Route estimates are unavailable.');
  return {paths, distance:props.distance, seconds:props.time};
}
export function createStoreRoute({apiKey,rate,json,fetchImpl=fetch,allowedOrigins=[]}) {
  let active=0;
  return async(req,res)=>{
    let admitted=false;
    try {
      if (req.method !== 'POST') { res.setHeader('Allow','POST'); return json(res,405,{error:'Use POST for routes.'}); }
      if (req.headers['sec-fetch-site']==='cross-site') throw fail('Request directions from our website.',403);
      if(req.headers.origin) {
        let allowed=false;
        try { const origin=new URL(req.headers.origin); allowed=['http:','https:'].includes(origin.protocol) && origin.host===req.headers.host; } catch { /* reject */ }
        if(!allowed && !allowedOrigins.includes(req.headers.origin)) throw fail('Request directions from our website.',403);
      }
      if(!apiKey) throw fail('Route previews are unavailable. Open directions in Google Maps instead.');
      if(active>=3) throw fail('Route service is busy. Please retry shortly.');
      active++; admitted=true;
      if(!await rate(req,'route-client',20)) throw fail('Too many route requests. Please try again later.',429);
      let body;
      try { body=await readContactJson(req); } catch(error) { throw fail('Invalid route request.',error.status||400); }
      const start=coordinates(body?.start?.lat,body?.start?.lng), end=coordinates(body?.end?.lat,body?.end?.lng);
      if(!start || !end || !['drive','walk'].includes(body?.mode)) throw fail('Choose a starting point, destination and driving or walking.',400);
      if(distanceKm(start,end)>1500) throw fail('These points are too far apart for this local route preview. Open Google Maps instead.',422);
      // Shares the same global provider allowance as search.
      if(!await rate(null,'place-search-global',80)) throw fail('Map services have reached their temporary limit. Please try again later.',429);
      const url=new URL('https://api.geoapify.com/v1/routing');
      url.search=new URLSearchParams({waypoints:`${start.lat},${start.lng}|${end.lat},${end.lng}`,mode:body.mode,format:'geojson',units:'metric',apiKey});
      const response=await fetchImpl(url,{signal:AbortSignal.timeout(12000),redirect:'error'});
      if(!response.ok) { await response.body?.cancel(); throw fail('No route is available right now. Try another mode or open Google Maps.'); }
      const reader=response.body.getReader(), chunks=[]; let size=0;
      try { while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>1024*1024) { await reader.cancel(); throw fail('The route is too large to display.'); } chunks.push(Buffer.from(value)); } } finally { reader.releaseLock(); }
      return json(res,200,{route:normalizeRoute(JSON.parse(Buffer.concat(chunks).toString('utf8')))});
    } catch(error) { if(error.status===429) res.setHeader('Retry-After','3600'); return json(res,error.safeRoute?error.status:503,{error:error.safeRoute?error.message:'Route service is unavailable. Try Google Maps instead.'}); }
    finally { if(admitted) active--; }
  };
}
