const syntheticPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAMklEQVRIie3QMQ0AAAjAMPxrQxQSdvG1BpZs9tkIFIuSRcmiZFGyKFmULEoWJYvS+6IDceSQiMhl3nAAAAAASUVORK5CYII=','base64');
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplicationHandler } from '../server/applications.js';
import { readMultipart } from '../server/multipart.js';
import { validateApplication, validateStep, sanitizeApplication, parseAmount, validDate, REQUIRED_DOC_KEYS } from '../shared/application.js';
import { submitFranchiseApplication } from '../src/api/index.js';
import { loadApplicationDraft, saveApplicationDraft } from '../src/utils/applicationDraft.js';
import { personalFeedback, stepFeedback } from '../src/utils/personalFeedback.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url), 'utf8'));
const valid = () => ({...structuredClone(fixture), documents: Object.fromEntries(REQUIRED_DOC_KEYS.map(key => [key,new File([key==='idPhoto'?syntheticPng:'%PDF-1.4\nSYNTHETIC TEST ONLY\n%%EOF'], `${key}.${key==='idPhoto'?'png':'pdf'}`, {type:key==='idPhoto'?'image/png':'application/pdf'})]))});
const json = (res,status,body) => {res.writeHead(status, {'content-type':'application/json'});res.end(JSON.stringify(body));};

test('shared validation accepts complete solo and conditional co-applicant/employment paths', () => {
  assert.deepEqual(validateApplication(valid()), []);
  const data=valid(); data.email=' SOLO@example.invalid '; data.confirmEmail='solo@example.invalid';
  data.hasCoApplicant='yes'; data.coApplicant={firstName:'Synthetic',lastName:'Partner',email:'partner@example.invalid',phone:'00000000000'};
  data.currentEmployment=true;data.jobEndDate='';
  data.additionalPositions=[{id:'test',jobTitle:'Operator',company:'Test',startDate:'2020-01-01',current:true}];
  assert.deepEqual(validateApplication(data), []);
  data.coApplicant={}; assert.equal(validateStep(1,data).length,4);
  data.additionalPositions[0].endDate='2022-01-01';assert.ok(validateStep(2,data).some(e=>e.includes('current employment')));
});

test('invalid numbers, dates, consent types and earlier steps are rejected without throwing', () => {
  for(const amount of ['-100','1e6','Infinity','1,00','12.345','abc100','0']) assert.ok(validateStep(3,{...valid(),totalLiquidCapital:amount}).length, amount);
  assert.equal(parseAmount('350,000.25'),350000.25);
  for(const date of ['2025-02-29','2024-02-30','1995-13-01','not-date']) assert.equal(validDate(date),false);
  assert.equal(validDate('2024-02-29'),true);
  for(const patch of [{firstName:42},{additionalPositions:[null]},{investmentSources:'savings'},{consent_privacy:'true'},{jobStartDate:'2099-01-01'},{jobStartDate:'2024-01-01',jobEndDate:'2023-01-01'},{brandValues:['Integrity','Integrity','Integrity']}]) assert.ok(validateApplication({...valid(),...patch}).length);
  assert.ok(validateApplication({checklist_accurate:true,checklist_nda:true,checklist_documents:true,checklist_noGuarantee:true}).length);
  for(const malformed of [null,[],42,{firstName:{},additionalPositions:[null,42],brandValues:'bad',documents:{govIdFront:{}}}]) assert.doesNotThrow(()=>validateApplication(sanitizeApplication(malformed)));
});

test('exploratory applicants need no invented employment, package or secured site', () => {
  const data = valid();
  Object.assign(data, {employmentHistory:'none', jobTitle:'', company:'', jobStartDate:'', jobEndDate:'', currentEmployment:false, industry:'', keyResponsibilities:'', additionalPositions:[], selectedPackage:'not-sure', hasSpecificLocation:'no', siteTypes:[]});
  assert.deepEqual(validateApplication(data), []);
  assert.equal(sanitizeApplication(data).employmentHistory, 'none');
  assert.ok(validateStep(2, {...data, company:'Contradictory entry'}).length);
  assert.ok(validateStep(2, {...data, employmentHistory:'invented'}).length);
  assert.ok(validateStep(2, {...data, employmentHistory:'provided'}).length);
  assert.ok(validateStep(5, {...data, selectedPackage:'free-franchise'}).length);
  assert.ok(validateStep(5, {...data, hasSpecificLocation:'yes'}).length);
  assert.ok(validateStep(6, {...data, documents:{}}).some(message => message.includes('Proof of Funds')));
});

test('receipt contract rejects successful HTTP without the matching server receipt', async () => {
  const requestId=randomUUID();
  for(const receipt of [{},{id:requestId},{version:1,id:randomUUID(),status:'submitted',submittedAt:new Date().toISOString()}]) {
    await assert.rejects(submitFranchiseApplication({formData:valid(),requestId,fetcher:async()=>Response.json(receipt)}), /valid receipt/);
  }
  await assert.rejects(submitFranchiseApplication({formData:valid(),requestId,fetcher:async()=>{throw new Error('offline');}}),/retry/);
});

test('saved drafts sanitize malformed JSON/types and retain the retry ID', () => {
  const previousWindow=globalThis.window;
  let stored='not-json';
  globalThis.window={localStorage:{getItem:()=>stored,setItem:(_key,value)=>{stored=value;}}};
  try {
    assert.deepEqual(loadApplicationDraft().formData,{});
    stored=JSON.stringify({currentStep:'bad',formData:{firstName:42,additionalPositions:[null],brandValues:'bad'}});
    const draft=loadApplicationDraft();assert.equal(draft.currentStep,0);assert.equal(draft.formData.firstName,undefined);
    assert.equal(saveApplicationDraft(8,valid(),draft.requestId),true);
    assert.equal(loadApplicationDraft().requestId,draft.requestId);
    assert.deepEqual(loadApplicationDraft().formData.documents,{});
  } finally {if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});

test('stepFeedback maps validation issues across all nine steps to concrete control IDs', () => {
  assert.deepEqual(personalFeedback(valid()), []);
  for (let step = 0; step <= 8; step++) {
    assert.deepEqual(stepFeedback(step, valid()), []);
    const emptyIssues = stepFeedback(step, {});
    assert.ok(emptyIssues.length > 0, `Step ${step} should report issues when empty`);
    assert.ok(emptyIssues.every(issue => issue.id && !issue.id.endsWith('step-title')), `Step ${step} issues should map to field IDs`);
  }
});

test('real HTTP multipart: durable unique receipt, validation, concurrency, lost response and restart', async t => {
  const dir=await mkdtemp(join(tmpdir(),'siomai-phase1-'));
  t.after(()=>rm(dir,{recursive:true,force:true})); // Only this test-created directory.
  const objects=new Set(); let loseInsertResponse=false; let insertCalls=0;
  const repository={
    find:async id=>{try{return JSON.parse(await readFile(join(dir,id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}},
    insert:async row=>{
      insertCalls++;
      const saved={...row,submitted_at:new Date().toISOString()};
      await writeFile(join(dir,row.id+'.json'),JSON.stringify(saved),{flag:'wx'});
      if(loseInsertResponse){loseInsertResponse=false;throw new Error('COMMIT response lost');}
      return saved;
    },
  };
  const start=async()=>{
    const handler=createApplicationHandler({readMultipart,repository,json,rateLimit:()=>true,
      admit:async()=>()=>{}, verifyStorage:async()=>{}, scanDocument:async()=>({status:'clean',engine:'ClamAV',scannedAt:new Date().toISOString()}),
      uploadFile:async(bucket,path)=>{objects.add(`${bucket}/${path}`);},deleteStorageObjects:async(bucket,paths)=>paths.forEach(p=>objects.delete(`${bucket}/${p}`))});
    const server=createServer(async(req,res)=>{try{await handler(req,res);}catch(error){json(res,error.status||503,{error:error.message,validationErrors:error.validationErrors});}});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}`;
    return {server, fetcher:(path,options)=>fetch(url+path,options)};
  };
  let runtime=await start();t.after(()=>new Promise(resolve=>runtime.server.close(resolve)));
  const requestId=randomUUID();
  const send=(data=valid(),id=requestId)=>submitFranchiseApplication({formData:data,requestId:id,fetcher:runtime.fetcher});
  const first=await send();assert.equal(first.id,requestId);assert.equal(insertCalls,1);assert.equal(objects.size,5);
  assert.deepEqual(await send(),first);assert.equal(insertCalls,1);
  await assert.rejects(send({...valid(),targetCity:'changed'}),/different answers/);
  await assert.rejects(send({...valid(),totalLiquidCapital:'-1'},randomUUID()),e=>e.validationErrors.some(v=>v.step===3));
  await assert.rejects(send({...valid(),consent_privacy:'true'},randomUUID()),e=>e.validationErrors.some(v=>v.step===7));
  const invalidFile=valid();invalidFile.documents.govIdFront=new File(['not a pdf'],'fake.pdf',{type:'application/pdf'});
  await assert.rejects(send(invalidFile,randomUUID()),/does not match/);
  const missingFile=valid();delete missingFile.documents.govIdFront;
  await assert.rejects(send(missingFile,randomUUID()),e=>e.validationErrors.some(v=>v.step===6));
  const concurrentId=randomUUID();const concurrent=await Promise.all([send(valid(),concurrentId),send(valid(),concurrentId)]);
  assert.deepEqual(concurrent[0],concurrent[1]);assert.equal(objects.size,10);
  loseInsertResponse=true;const lostId=randomUUID();const recovered=await send(valid(),lostId);assert.equal(recovered.id,lostId);assert.equal(objects.size,15);
  await new Promise(resolve=>runtime.server.close(resolve));runtime=await start();
  assert.deepEqual(await send(valid(),lostId),recovered);
  assert.equal((await readdir(dir)).length,3);
  const row=await repository.find(requestId);assert.equal(row.application_data.confirmEmail,undefined);
  assert.equal(row.applicant_email,'solo@example.invalid');
  const exploratory = valid();
  Object.assign(exploratory, {employmentHistory:'none', jobTitle:'', company:'', jobStartDate:'', jobEndDate:'', currentEmployment:false, industry:'', keyResponsibilities:'', additionalPositions:[], selectedPackage:'not-sure', hasSpecificLocation:'no', siteTypes:[]});
  const exploratoryId = randomUUID();
  const exploratoryReceipt = await send(exploratory, exploratoryId);
  assert.deepEqual(await send(exploratory, exploratoryId), exploratoryReceipt);
  assert.equal((await repository.find(exploratoryId)).application_data.employmentHistory, 'none');
  await assert.rejects(send({...exploratory, company:'Contradictory history'}, randomUUID()), e => e.validationErrors.some(v => v.step === 2));
});
