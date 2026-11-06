import test from 'node:test';
import assert from 'node:assert/strict';
import { createOcrReader, normalizeOcrResult, extractIdFields } from '../src/utils/documentOcr.js';

const image = new Blob(['synthetic'], { type: 'image/jpeg' });
function harness(timeoutMs = 1000) {
  const hosts = [];
  const reader = createOcrReader({ timeoutMs, createWorker: () => {
    const host = { stopped: 0, postMessage() {}, terminate() { this.stopped++; } };
    hosts.push(host); return host;
  } });
  return { reader, hosts };
}

test('v6 text-only result produces lines and handles empty output', () => {
  assert.deepEqual(normalizeOcrResult({text:' SURNAME: DELA CRUZ\r\n\nFIRST NAME: JUAN\n',confidence:85}).lines, ['SURNAME: DELA CRUZ','FIRST NAME: JUAN']);
  assert.deepEqual(normalizeOcrResult(null), {text:'',lines:[],confidence:0});
});
test('completion releases worker and returns text', async () => {
  const {reader,hosts}=harness(); const pending=reader.recognizeText(image);
  hosts[0].onmessage({data:{ok:true,result:{text:'ID No: P1234567'}}});
  assert.equal((await pending).lines[0],'ID No: P1234567');
  assert.equal(hosts[0].stopped,1); assert.equal(hosts[0].onmessage,null);
});
test('abort while initializing or recognizing immediately terminates host',async()=>{
  for(const phase of ['initializing','recognizing']){
    const {reader,hosts}=harness();const c=new AbortController();const pending=reader.recognizeText(image,c.signal);
    hosts[0].phase=phase;c.abort();assert.equal(await pending,null);assert.equal(hosts[0].stopped,1);
    reader.cancel();assert.equal(hosts[0].stopped,1);
  }
});
test('deadline terminates silent worker',async()=>{
  const {reader,hosts}=harness(10);assert.equal(await reader.recognizeText(image),null);assert.equal(hosts[0].stopped,1);
});
test('replacement cancels prior job and ignores stale message',async()=>{
  const {reader,hosts}=harness();const first=reader.recognizeText(image);const stale=hosts[0].onmessage;
  const second=reader.recognizeText(image);stale({data:{ok:true,result:{text:'OLD'}}});
  assert.equal(await first,null);assert.equal(hosts[1].stopped,0);
  hosts[1].onmessage({data:{ok:true,result:{text:'NEW'}}});assert.equal((await second).text,'NEW');
});
test('PDF and pre-aborted input start no worker',async()=>{
  const {reader,hosts}=harness();const c=new AbortController();c.abort();
  assert.equal(await reader.recognizeText(image,c.signal),null);
  assert.equal(await reader.recognizeText(new Blob(['PDF'],{type:'application/pdf'})),null);assert.equal(hosts.length,0);
});
test('worker failure leaves a retry path',async()=>{
  const {reader,hosts}=harness();const first=reader.recognizeText(image);hosts[0].onerror({preventDefault(){}});
  assert.equal(await first,null);assert.equal(hosts[0].stopped,1);
  const second=reader.recognizeText(image);hosts[1].onmessage({data:{ok:true,result:{text:''}}});assert.deepEqual((await second).lines,[]);
});
test('labels preserve multi-part names and Filipino characters',()=>{
  assert.deepEqual(extractIdFields(['Surname:','DELA CRUZ','Given Names: JUAN MIGUEL','Middle Name: PEÑA','Passport No: P1234567']),{firstName:'JUAN MIGUEL',lastName:'DELA CRUZ',middleName:'PEÑA',idNumber:'P1234567'});
  assert.equal(extractIdFields(['DELA CRUZ, JUAN MIGUEL']).firstName,'JUAN MIGUEL');
  assert.equal(extractIdFields(['DELA CRUZ, JUAN MIGUEL']).middleName,'');
});
test('headings, dates, unlabelled numbers and private PSNs are not ID suggestions',()=>{
  assert.deepEqual(extractIdFields(['REPUBLIC OF THE PHILIPPINES','PASSPORT','NATIONAL IDENTIFICATION','2026-11-06','123456789012','PSN: 123456789012']),{firstName:'',lastName:'',middleName:'',idNumber:''});
  assert.equal(extractIdFields(['PCN: 1234-5678-9012-3456']).idNumber,'1234-5678-9012-3456');
  assert.equal(extractIdFields(['FIRST NAME','MIDDLE NAME','SURNAME']).firstName,'');
});
test('real installed engine recognizes synthetic text using local model',async()=>{
  const {createWorker}=await import('tesseract.js');const {default:sharp}=await import('sharp');const {resolve}=await import('node:path');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="280"><rect width="100%" height="100%" fill="white"/><text x="35" y="100" font-family="Arial" font-size="52" fill="black">SURNAME: DELA CRUZ</text><text x="35" y="190" font-family="Arial" font-size="52" fill="black">FIRST NAME: JUAN MIGUEL</text></svg>';
  const bytes=await sharp(Buffer.from(svg)).png().toBuffer();let worker;
  try{
    worker=await createWorker('eng',1,{langPath:resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int'),cacheMethod:'none'});
    const {data}=await worker.recognize(bytes,{}, {text:true});assert.equal(data.lines,undefined);
    const result=normalizeOcrResult(data);assert.ok(result.lines.length);
    assert.equal(extractIdFields(result.lines).lastName,'DELA CRUZ');assert.equal(extractIdFields(result.lines).firstName,'JUAN MIGUEL');
  }finally{await worker?.terminate();}
});
