import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { uploadDatabase } from './helpers/uploadDatabase.js';
import { createApplicationEmail } from '../server/applicationEmail.js';
import { validateUploadRequest } from '../server/directUploads.js';
import { idNumberIssue, repeatedFiller, DUPLICATE_ID_MESSAGE } from '../shared/applicationQuality.js';
import { REQUIRED_DOC_KEYS, validateStep, sanitizeApplication } from '../shared/application.js';
import { documentManifest } from '../src/api/directUploads.js';
import { stepFeedback } from '../src/utils/personalFeedback.js';

const applicant = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url)));

test('issuer-confirmed numbers preserve leading zeros and unknown editions have a review path', () => {
  const check = (govIdType, govIdNumber, govIdReviewReason) => idNumberIssue({ govIdType, govIdNumber, govIdReviewReason });
  assert.match(check('UMID','asdf'), /12-digit/);
  assert.equal(check('UMID','0000-1234567-8'),'');
  assert.equal(check('PhilID (National ID)','0001-2345-6789-0123'),'');
  assert.match(check('PhilID (National ID)','001234567890','Different edition supplied.'), /private/);
  assert.equal(check('UMID','OLD-A','Previous edition printed with letters.'),'');
  assert.equal(check('Other','Año - 021'),'');
  assert.equal(sanitizeApplication({...applicant, govIdReviewReason:'Old hidden explanation'}).govIdReviewReason,undefined);
  assert.ok(stepFeedback(1,{...applicant,govIdType:'UMID',govIdNumber:'asdf'}).some(item=>item.id==='pi-govIdNumber'));
});
test('obvious repetition maps to the right written question without judging the language', () => {
  for (const [field,target] of [['whyInterested','ba-whyInterested'],['personalValues','ba-personalValues'],['brandValuesExplanation','ba-explanation']]) {
    assert.ok(stepFeedback(4,{...applicant,[field]:'TeST! '.repeat(100)}).some(i=>i.id===target && i.message.includes('repeats')));
  }
  assert.equal(repeatedFiller('word test '.repeat(50)),true);
  assert.equal(repeatedFiller('Gusto kong magbukas ng cart malapit sa palengke. My family can help sa morning shift habang naghahanda ako ng pagkain para sa mga estudyante at suki namin.'),false);
});
test('renamed identical bytes highlight only the back on the server and different bytes pass', async () => {
  const files = Object.fromEntries(REQUIRED_DOC_KEYS.map(key=>[key,new File([key],key+'.jpg',{type:'image/jpeg'})]));
  const manifest = await documentManifest(files);
  const body = { version:1,requestId:randomUUID(),applicationData:applicant,manifest };
  assert.doesNotThrow(()=>validateUploadRequest(body));
  files.govIdBack = new File([files.govIdFront],'different-name.jpg',{type:'image/jpeg'});
  body.manifest = await documentManifest(files);
  assert.throws(()=>validateUploadRequest(body), e=>e.validationErrors.some(x=>x.step===6 && x.message===DUPLICATE_ID_MESSAGE));
  assert.ok(!validateStep(6,{...applicant,govIdType:'Passport',documents:{...files,govIdBack:undefined}}).includes(DUPLICATE_ID_MESSAGE));
});
test('email code binds to inbox and draft, survives only one verification, rejects stale proofs and enforces expiry, resend and attempt limits', async t => {
  const { db, request } = await uploadDatabase(); t.after(()=>db.close());
  await db.exec(await readFile(new URL('../supabase/migrations/20261105010000_application_email_confirmation.sql',import.meta.url),'utf8'));
  const sent = [], response = { setHeader() {} };
  const service = createApplicationEmail({ env:{APPLICATION_EMAIL_SECRET:'test-only'.repeat(6),EMAIL_FROM:'sender@example.invalid',RESEND_API_KEY:'synthetic'},request,
    send: async message=>{ sent.push(message); return {providerId:randomUUID()}; }, rate:async()=>true, verify:async()=>{}, json:(_res,_status,value)=>value });
  const email = 'example@example.invalid', draftId=randomUUID();
  const call = (action, extra={}) => service.handler(Object.assign(Readable.from([Buffer.from(JSON.stringify({email,draftId,action,...extra}))]),{method:'POST',headers:{'content-type':'application/json'}}),response);
  const first=await call('send');
  await assert.rejects(call('send'), e=>e.status===429);
  const wrong = sent[0].code === '000000' ? '111111':'000000';
  for(let i=0;i<5;i++) await assert.rejects(call('confirm',{challengeId:first.challengeId,code:wrong}), i===4?/5 attempts/:/incorrect/);
  await assert.rejects(call('confirm',{challengeId:first.challengeId,code:sent[0].code}),/5 attempts/);
  await db.query("update application_email_challenges set created_at=now()-interval '1 hour'");
  const second=await call('send'); const confirm={challengeId:second.challengeId,code:sent[1].code};
  await assert.rejects(call('confirm',{...confirm,email:'other@example.invalid'}), /incorrect/);
  const outcomes=await Promise.allSettled([call('confirm',confirm),call('confirm',confirm)]);
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
  const {proof}=outcomes.find(o=>o.status==='fulfilled').value;
  const check={requestId:draftId,email,proof};
  const stamp=await service.assertProof(check);
  await service.assertSaved(stamp,draftId,email);
  for(const changed of [{requestId:randomUUID()},{email:'wrong@example.invalid'},{proof:'forged'},{proof:undefined}]) await assert.rejects(service.assertProof({...check,...changed}));
  await db.query("update application_email_challenges set verified_until=now()-interval '1 second',expires_at=now()-interval '1 second'");
  await assert.rejects(service.assertProof(check),/expired/);
  await assert.rejects(service.assertSaved(stamp,draftId,email));
  assert.equal(await request('/rest/v1/rpc/cleanup_application_email_challenges',{method:'POST',body:'{}'}),1);
  await db.exec('set role authenticated'); await assert.rejects(db.query('select * from application_email_challenges'),/permission/);
});
