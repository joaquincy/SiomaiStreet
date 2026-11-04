import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { cropRectangle } from '../src/utils/documentImage.js';
import { normalizeDocumentImage } from '../server/documentImages.js';
import { validateStep, documentTypes } from '../shared/application.js';
import { uploadWithProgress } from '../src/api/uploadTransport.js';

test('crop calculations stay within image boundaries and reject malformed values',()=>{
  assert.deepEqual(cropRectangle(1000,800,{left:10,right:20,top:5,bottom:10}),{x:100,y:40,width:700,height:680});
  for(const value of [-1,41,NaN,'bad',Infinity])assert.throws(()=>cropRectangle(1000,800,{left:value,top:0,right:0,bottom:0}));
  assert.equal(cropRectangle(1,1,{left:40,right:40,top:40,bottom:40}).width,1);
});
test('ID photos reject PDFs consistently while document slots still permit them',()=>{
  assert.deepEqual(documentTypes('idPhoto'),['image/jpeg','image/png']);
  assert.ok(documentTypes('proofOfFunds').includes('application/pdf'));
  assert.ok(validateStep(6,{documents:{idPhoto:new File(['%PDF-1.4'],'id.pdf',{type:'application/pdf'})}}).some(e=>e.includes('Invalid document: idPhoto')));
});
test('server image re-encoding removes EXIF and preserves image dimensions',async()=>{
  const input=await sharp({create:{width:80,height:60,channels:3,background:'#f6f6f6'}}).jpeg().withExif({IFD0:{Artist:'SYNTHETIC PRIVATE METADATA'}}).toBuffer();
  assert.ok((await sharp(input).metadata()).exif);
  const result=await normalizeDocumentImage(new File([input],'synthetic.jpg',{type:'image/jpeg'}));
  const metadata=await sharp(Buffer.from(await result.arrayBuffer())).metadata();
  assert.equal(metadata.exif,undefined);assert.equal(metadata.xmp,undefined);assert.equal(metadata.width,80);assert.equal(metadata.height,60);assert.equal(result.type,'image/jpeg');
});

test('JPEG orientation is applied to pixels and PNG text scans stay lossless', async () => {
  const input = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#777777' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const rotated = await normalizeDocumentImage(new File([input], 'rotated.jpg', { type: 'image/jpeg' }));
  const metadata = await sharp(Buffer.from(await rotated.arrayBuffer())).metadata();
  assert.equal(metadata.width, 60); assert.equal(metadata.height, 80); assert.equal(metadata.orientation, undefined);
  const pixels = Buffer.alloc(80 * 60 * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 17) % 256;
  const png = await sharp(pixels, { raw: { width: 80, height: 60, channels: 3 } }).png().toBuffer();
  const normalized = await normalizeDocumentImage(new File([png], 'scan.png', { type: 'image/png' }));
  assert.equal(normalized.type, 'image/png');
  assert.deepEqual(await sharp(Buffer.from(await normalized.arrayBuffer())).removeAlpha().raw().toBuffer(), pixels);
});

test('oversized decoded images are rejected even when compressed bytes are small', async () => {
  const input = await sharp({ create: { width: 6000, height: 4001, channels: 3, background: '#eeeeee' } }).png().toBuffer();
  await assert.rejects(normalizeDocumentImage(new File([input], 'oversized.png', { type: 'image/png' })), { status: 422 });
});
test('server rejects invalid image bytes; PDF evidence is not silently rasterized',async()=>{
  await assert.rejects(normalizeDocumentImage(new File(['fake'],'fake.png',{type:'image/png'})),{status:422});
  const pdf=new File(['%PDF-1.4 test'],'test.pdf',{type:'application/pdf'});assert.equal(await normalizeDocumentImage(pdf),pdf);
});
test('upload feedback distinguishes actual transfer from waiting for a server receipt',async t=>{
  const old=globalThis.XMLHttpRequest;let xhr;
  globalThis.XMLHttpRequest=class {constructor(){xhr=this;this.upload={};}open(){}setRequestHeader(){}send(){}};
  t.after(()=>{if(old===undefined)delete globalThis.XMLHttpRequest;else globalThis.XMLHttpRequest=old;});
  const statuses=[];const result=uploadWithProgress('/synthetic',new FormData(),s=>statuses.push(s));
  xhr.upload.onprogress({lengthComputable:true,loaded:50,total:100});assert.match(statuses.at(-1),/50% transferred/);
  xhr.upload.onload();assert.match(statuses.at(-1),/waiting for server checks/);
  xhr.status=201;xhr.responseText='{"id":"synthetic"}';xhr.onload();assert.equal((await result).ok,true);
});
