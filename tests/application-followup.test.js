import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { uploadDatabase } from './helpers/uploadDatabase.js';
import { prepareApplicationChange } from '../shared/applicationFollowup.js';
import { createApplicationFollowup } from '../server/applicationFollowup.js';
import { portalAccess } from '../server/applicationPortal.js';
import { Readable } from 'node:stream';

test('follow-up migration, permissions, revisions, onboarding, retries and erasure integration',async()=>{
 const {db,request}=await uploadDatabase();
 const rpc=(name,body)=>request('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body)});
 try {
  await db.exec('alter table storage.objects add column name text;');
  for(const file of ['20261031010000_contact_inquiries.sql','20261101000000_transactional_outbox.sql','20261104020000_application_privacy_retention.sql','20261104030000_application_followup.sql','20261105000000_followup_evidence_and_staff_access.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  const staff=randomUUID(),id=randomUUID();await db.query('insert into auth.users values($1)',[staff]);await db.query('insert into franchise_document_reviewers values($1,true)',[staff]);
  await db.query("insert into franchise_applications(id,applicant_name,applicant_email,status,application_data) values($1,'Test','test@example.invalid','approved',$2)",[id,JSON.stringify({primaryPhone:'09123456789'})]);
  const change={p_application:id,p_id:randomUUID(),p_hash:'a'.repeat(64),p_revision:1,p_category:'contact',p_before:{primaryPhone:'09123456789'},p_proposed:{primaryPhone:'09987654321'},p_reason:'Correcting my telephone number'};
  assert.equal((await rpc('submit_franchise_answer_change',change)).state,'accepted');
  assert.equal((await rpc('submit_franchise_answer_change',change)).state,'accepted');
  await assert.rejects(rpc('submit_franchise_answer_change',{...change,p_id:randomUUID()}),/changed/);
  const item=randomUUID();await rpc('assign_franchise_onboarding',{p_application:id,p_id:item,p_reviewer:staff,p_details:{title:'Training readiness',instructions:'Confirm readiness with staff.',purpose:'Arrange training',evidenceMode:'ready',responsible:'Applicant',contactName:'Reviewer',contactEmail:'test@example.invalid'}});
  const action={p_application:id,p_item:item,p_id:randomUUID(),p_hash:'b'.repeat(64),p_revision:1,p_action:'submit',p_note:''};
  assert.equal((await rpc('act_franchise_onboarding',action)).state,'submitted');assert.equal((await rpc('act_franchise_onboarding',action)).state,'submitted');
  await assert.rejects(rpc('act_franchise_onboarding',{...action,p_id:randomUUID(),p_revision:2,p_action:'complete'}),/clarification/);
  assert.equal((await rpc('act_franchise_onboarding',{...action,p_id:randomUUID(),p_revision:2,p_action:'complete',p_note:'Staff confirmed readiness',p_reviewer:staff})).state,'complete');
  const fileItem=randomUUID(),retryId=randomUUID();
  await rpc('assign_franchise_onboarding',{p_application:id,p_id:fileItem,p_reviewer:staff,p_details:{title:'Synthetic permit',instructions:'Send the agreed permit page.',purpose:'Confirm permission',evidenceMode:'file',responsible:'Applicant',contactName:'Reviewer',contactEmail:'test@example.invalid'}});
  const upload=await rpc('prepare_franchise_onboarding_upload',{p_application:id,p_item:fileItem,p_revision:1,p_retry:retryId,p_hash:'c'.repeat(64),p_manifest:[{key:'onboardingEvidence',name:'test.pdf',type:'application/pdf',size:12,sha256:'d'.repeat(64)}]});
  await assert.rejects(rpc('finalize_franchise_onboarding_upload',{p_session:upload.id}),/checks/);
  const evidence={path:`direct/${upload.id}/onboardingEvidence`,name:'test.pdf',size:12,contentType:'application/pdf',scan:{status:'clean',engine:'ClamAV'}};
  await db.query("update franchise_upload_items set state='ready',verified_document=$2 where session_id=$1",[upload.id,JSON.stringify(evidence)]);
  assert.equal((await rpc('finalize_franchise_onboarding_upload',{p_session:upload.id})).status,'received');
  assert.equal((await rpc('finalize_franchise_onboarding_upload',{p_session:upload.id})).requestId,retryId);
  const plan={...change,p_id:randomUUID(),p_revision:2,p_category:'plan',p_before:{targetCity:'Old town'},p_proposed:{targetCity:'New town'}};
  assert.equal((await rpc('submit_franchise_answer_change',plan)).state,'pending');
  assert.equal((await db.query('select reassessment_required from franchise_applications where id=$1',[id])).rows[0].reassessment_required,true);
  await assert.rejects(rpc('act_franchise_onboarding',{...action,p_id:randomUUID(),p_action:'clarification',p_note:'Can we arrange a new date?'}),/approval/);
  await rpc('review_franchise_answer_change',{p_application:id,p_change:plan.p_id,p_reviewer:staff,p_revision:2,p_decision:'changes_needed',p_note:'Confirm the complete address.',p_verification:{},p_answers:{}});
  assert.equal((await db.query('select reassessment_required from franchise_applications where id=$1',[id])).rows[0].reassessment_required,false);
  await db.exec('set role anon');await assert.rejects(db.query('select * from franchise_answer_changes'),/permission/);await db.exec('reset role');
  await db.query("update franchise_applications set status='declined' where id=$1",[id]);await db.query('insert into franchise_privacy_officers values($1,true)',[staff]);
  await rpc('review_franchise_retention',{p_application:id,p_officer:staff,p_closed_at:new Date(Date.now()-181*86400000).toISOString()}).catch(()=>{});
  // An accurately recorded old closure is not possible for this new synthetic application.
  await db.query("update franchise_applications set submitted_at=now()-interval '300 days' where id=$1",[id]);
  await db.query("update franchise_upload_sessions set cleanup_after=now()-interval '1 hour' where application_id=$1",[id]);
  await rpc('review_franchise_retention',{p_application:id,p_officer:staff,p_closed_at:new Date(Date.now()-181*86400000).toISOString()});
  const job=await rpc('start_franchise_erasure',{p_application:id});assert.ok(job);
  assert.ok((await db.query('select path from franchise_erasure_objects where job_id=$1',[job])).rows.some(row=>row.path===evidence.path));
 } finally {await db.close();}
});
test('follow-up HTTP auth precedes reads, protects staff actions and keeps private paths out of projection',async()=>{
 const id=randomUUID(),access=portalAccess('s'.repeat(40));let reads=0,output;
 const row={id,status:'submitted',submitted_at:new Date().toISOString(),answer_revision:1,application_data:{primaryPhone:'09123456789',govIdNumber:'secret-1234'},document_paths:{govIdFront:{path:'private/path'}},staff_notes:'private staff note'};
 const request=async path=>{reads++;if(path.includes('franchise_applications?'))return [row];return [];};
 const {handler}=createApplicationFollowup({request,access,rate:async()=>true,json:(_r,_s,data)=>{output=data;}});
 const res={setHeader(){}};
 await assert.rejects(handler({method:'GET',headers:{}},res,id),/invalid/);assert.equal(reads,0);
 const code=access.receipt(row).accessCode;
 await handler({method:'GET',headers:{authorization:`Bearer ${code}`}},res,id);
 assert.equal(output.groups.identity.govIdNumber,'Ending 1234');assert.ok(!JSON.stringify(output).includes('private/path'));assert.ok(!JSON.stringify(output).includes('private staff'));
 const req=Readable.from([Buffer.from(JSON.stringify({action:'complete'}))]);req.method='POST';req.headers={authorization:`Bearer ${code}`,'content-type':'application/json'};
 await assert.rejects(handler(req,res,id,'onboarding',randomUUID()),/approval/);
});
test('contact edits reject protected fields and invalid numbers',()=>{
 assert.throws(()=>prepareApplicationChange({primaryPhone:'09123456789'},'contact',{status:'approved'}));
 assert.throws(()=>prepareApplicationChange({},'contact',{primaryPhone:'x'}));
 assert.equal(prepareApplicationChange({},'contact',{primaryPhone:'09123456789'}).primaryPhone,'09123456789');
});
