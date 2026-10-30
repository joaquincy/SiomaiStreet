// Local acceptance harness. Never loads .env or connects to Supabase.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createApplicationHandler } from '../server/applications.js';
import { readMultipart } from '../server/multipart.js';
const root=resolve('.phase1-local-test/dist');
const store=resolve('.phase1-local-test');
await mkdir(store,{recursive:true});
const fixture=await readFile(new URL('../tests/fixtures/applicant.json',import.meta.url),'utf8');
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
let invalidReceipt=false;
const handler=createApplicationHandler({readMultipart,rateLimit:()=>true,json:(res,status,body)=>json(res,status,invalidReceipt?{}:body),
  admit:async()=>()=>{}, verifyStorage:async()=>{}, scanDocument:async()=>({status:'clean',engine:'ClamAV',scannedAt:new Date().toISOString()}),
  repository:{
    find:async id=>{try{return JSON.parse(await readFile(resolve(store,id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}},
    insert:async row=>{const saved={...row,submitted_at:new Date().toISOString()};await writeFile(resolve(store,row.id+'.json'),JSON.stringify(saved),{flag:'wx'});return saved;},
  },
  uploadFile:async()=>{},deleteStorageObjects:async()=>{},
});
const harnessScript=`const fixture=${fixture};
for(let step=0;step<9;step++){const button=document.createElement('button');button.dataset.step=step;button.textContent='Prepare step '+(step+1);document.body.append(button);}
const inspectButton=document.createElement('button');inspectButton.textContent='Inspect local draft storage';document.body.append(inspectButton);
const inspectResult=document.createElement('pre');inspectResult.id='draft-inspection';document.body.append(inspectResult);
inspectButton.onclick=async()=>{
  const raw=localStorage.getItem('siomai-street-franchise-draft-v1');
  let draft=null;try{draft=JSON.parse(raw);}catch{}
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('siomai-street-franchise-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'key'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const count=await new Promise((resolve,reject)=>{const request=db.transaction('documents','readonly').objectStore('documents').count();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.close();
  inspectResult.textContent=JSON.stringify({draftPresent:!!raw,currentStep:draft?.currentStep,answerKeys:Object.keys(draft?.formData||{}).filter(key=>key!=='documents'),documentCount:count},null,2);
};
document.querySelectorAll('[data-step]').forEach(button=>button.onclick=async()=>{
  const data=structuredClone(fixture); data.hasCoApplicant='yes'; data.coApplicant={firstName:'Synthetic',lastName:'Partner',email:'partner@example.invalid',phone:'00000000000'};
  localStorage.setItem('siomai-street-franchise-draft-v1',JSON.stringify({currentStep:Number(button.dataset.step),requestId:crypto.randomUUID(),formData:data,updatedAt:new Date().toISOString()}));
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('siomai-street-franchise-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'key'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  await new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');const store=tx.objectStore('documents');store.clear();for(const key of ['govIdFront','govIdBack','proofOfBilling','proofOfFunds','idPhoto']) store.put({key,file:new File([key==='idPhoto'?Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAMklEQVRIie3QMQ0AAAjAMPxrQxQSdvG1BpZs9tkIFIuSRcmiZFGyKFmULEoWJYvS+6IDceSQiMhl3nAAAAAASUVORK5CYII='),c=>c.charCodeAt(0)):'%PDF-1.4\\nSYNTHETIC TEST ONLY\\n%%EOF'],key+(key==='idPhoto'?'.png':'.pdf'),{type:key==='idPhoto'?'image/png':'application/pdf'})});tx.oncomplete=resolve;tx.onerror=reject;});db.close();location.href='/application';
});
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=async()=>{await fetch('/__test/mode',{method:'POST',body:button.dataset.mode});document.querySelector('#mode').textContent=button.dataset.mode;});`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
createServer(async(req,res)=>{
  try{
    if (!['127.0.0.1:4187','localhost:4187'].includes(req.headers.host) || (req.headers.origin && !['http://127.0.0.1:4187','http://localhost:4187'].includes(req.headers.origin))) return json(res,403,{error:'Local harness only.'});
    const pathname=new URL(req.url,'http://127.0.0.1').pathname;
    res.setHeader('Cache-Control','no-store');
    if(pathname==='/__test/mode'&&req.method==='POST'){let text='';for await(const c of req)text+=c;invalidReceipt=text==='invalid';return json(res,200,{invalidReceipt});}
    if(pathname==='/__test/script.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end(harnessScript);}
    if(pathname==='/__test/storage-faults.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end(await readFile(new URL('./browser-storage-faults.js',import.meta.url)));}
    if(pathname==='/__test') {res.writeHead(200,{'content-type':'text/html'});return res.end('<!doctype html><html><head><title>Isolated Phase 1 test harness</title></head><body><h1>Local synthetic application tests</h1><p>Local files only. No Supabase, email, real identities or legal agreements. Documents are simulated.</p><button data-step="1">Prepare co-applicant test</button><button data-step="2">Prepare employment test</button><button data-step="8">Prepare final submission test</button><p>Receipt mode: <span id="mode">'+(invalidReceipt?'invalid':'valid')+'</span></p><button data-mode="invalid">Return invalid receipts</button><button data-mode="valid">Return valid receipts</button><script src="/__test/script.js"></script></body></html>');}
    if(pathname==='/api/franchise-applications'&&req.method==='POST')return await handler(req,res);
    if(pathname.startsWith('/api/'))return json(res,404,{error:'Disabled in local test harness.'});
    let file=resolve(root,'.'+decodeURIComponent(pathname));
    if(file!==root&&!file.startsWith(root+sep))return json(res,403,{error:'Forbidden'});
    if(!extname(file))file=resolve(root,'index.html');
    if(!types[extname(file)])return json(res,404,{error:'Unsupported asset'});
    let bytes=await readFile(file);
    if (extname(file)==='.html' && new URL(req.url,'http://127.0.0.1').searchParams.get('storageTest')==='1') {
      bytes=bytes.toString().replace('<head>','<head><script src="/__test/storage-faults.js"></script>');
    }
    res.writeHead(200,{'content-type':types[extname(file)]});res.end(bytes);
  }catch(error){json(res,error.status||500,{error:error.message,validationErrors:error.validationErrors});}
}).listen(4187,'127.0.0.1',()=>console.log('Local-only acceptance harness: http://127.0.0.1:4187/__test'));
