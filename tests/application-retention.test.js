import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { uploadDatabase } from './helpers/uploadDatabase.js';
import { processApplicationRetention, createApplicationRetentionMaintenance } from '../server/applicationRetention.js';
import { CLOSED_APPLICATION_RETENTION_DAYS, PRIVACY_NOTICE_VERSION } from '../shared/privacy.js';
import { updateApplicationAnswer } from '../shared/applicationAnswers.js';
import { loadApplicationDraft } from '../src/utils/applicationDraft.js';
import { createReviewerDocumentHandler } from '../server/directUploadServices.js';

let database, db, request, officer;
const rpc = (name, body = {}) => request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
before(async () => {
  database = await uploadDatabase(); ({ db, request } = database);
  await db.exec('alter table storage.objects add column name text;');
  for (const name of ['20261031010000_contact_inquiries.sql','20261101000000_transactional_outbox.sql','20261104020000_application_privacy_retention.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url),'utf8'));
  }
  officer = randomUUID();
  await db.query('insert into auth.users values ($1)',[officer]);
  await db.query('insert into franchise_privacy_officers values ($1,true)',[officer]);
});
after(async () => { await db?.close(); });

const app = async (status='submitted', due=false, documents={}) => {
  const id=randomUUID();
  await db.query(`insert into franchise_applications(id,applicant_name,applicant_email,status,submitted_at,document_paths)
    values ($1,'Synthetic applicant','synthetic@example.invalid',$2,now()-interval '400 days',$3)`,[id,status,JSON.stringify(documents)]);
  if (due) await rpc('review_franchise_retention',{p_application:id,p_officer:officer,p_closed_at:new Date(Date.now()-181*86400000).toISOString()});
  return id;
};
const selectApp = async id => (await db.query('select * from franchise_applications where id=$1',[id])).rows[0];
const removeStorage = async (bucket,paths) => {
  // Synthetic Storage API substitute only; production removes bytes via HTTP.
  await db.query('delete from storage.objects where bucket_id=$1 and name=any($2::text[])',[bucket,paths]);
};

test('180 days runs from actual closure, never submission; reopening clears schedule; holds persist past review date', async () => {
  assert.equal(CLOSED_APPLICATION_RETENTION_DAYS,180);
  const id=await app();
  await db.query("update franchise_applications set status='declined' where id=$1",[id]);
  let row=await selectApp(id);
  assert.equal((row.retention_due_at-row.retention_closed_at)/86400000,180);
  assert.ok(row.retention_closed_at.getTime()>Date.now()-5000);
  await assert.rejects(rpc('start_franchise_erasure',{p_application:id}),/not due/);
  await db.query("update franchise_applications set status='under_review' where id=$1",[id]);
  row=await selectApp(id); assert.equal(row.retention_due_at,null);
  await db.query("update franchise_applications set status='withdrawn' where id=$1",[id]);
  await rpc('review_franchise_retention',{p_application:id,p_officer:officer,p_closed_at:new Date(Date.now()-181*86400000).toISOString(),p_hold_reason:'Synthetic dispute hold',p_hold_review_at:new Date(Date.now()+86400000).toISOString()});
  await db.query("update franchise_applications set retention_hold_until=now()-interval '1 day' where id=$1",[id]);
  await assert.rejects(rpc('start_franchise_erasure',{p_application:id}),/on hold/);
  await assert.rejects(rpc('review_franchise_retention',{p_application:id,p_officer:randomUUID()}),/officer/);
  // Hold remains in place, so automatic selection must not touch this case.
});

test('legacy closed rows without closure date and active/approved records are not deletion candidates', async () => {
  const legacy=await app('declined');
  await db.query('update franchise_applications set retention_closed_at=null where id=$1',[legacy]);
  for (const id of [legacy,await app('approved'),await app('under_review')]) {
    await assert.rejects(rpc('start_franchise_erasure',{p_application:id}),/not due/);
  }
});

test('storage failure preserves records, retry removes originals/history/copies then waits for external confirmation', async () => {
  const session=randomUUID(), oldSession=randomUUID();
  const path=`direct/${session}/govIdFront`, oldPath=`direct/${oldSession}/govIdFront`;
  const id=await app('declined',true,{govIdFront:{path}});
  await db.query(`insert into franchise_corrections(application_id,document_key,reason,reviewer_id,status,replacement,previous_document)
    values($1,'govIdFront','Synthetic request','test','received',$2,$3)`,[id,JSON.stringify({path}),JSON.stringify({path:oldPath})]);
  await db.query(`insert into franchise_funding_verifications(application_id,reviewer_id,evidence_snapshot,funding_snapshot,notes)
    values($1,$2,$3,'{}','Synthetic verification')`,[id,officer,JSON.stringify({path:oldPath})]);
  await db.query(`insert into franchise_upload_sessions(id,application_id,request_hash,application_data,expires_at,cleanup_after)
    values($1,$2,$3,'{}',now()-interval '3 days',now()-interval '1 day')`,[session,id,'a'.repeat(64)]);
  await db.query('insert into franchise_document_access_log(user_id,application_id,document_key) values ($1,$2,\'govIdFront\')',[officer,id]);
  const orphan=`${id}/${randomUUID()}/proofOfFunds`;
  const otherId=await app('approved',false,{govIdFront:{path:`${randomUUID()}/attempt/govIdFront`}});
  for(const bucket of ['franchise-documents','franchise-quarantine']) for(const name of [path,oldPath,orphan]) await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',[bucket,name]);
  await db.query("update notification_outbox set provider_id='synthetic-provider' where reference=$1 and kind='application_received'",[id]);
  await rpc('record_notification_event',{event_id:'synthetic-event',email_id:'synthetic-provider',event_kind:'email.delivered',event_time:new Date().toISOString()});
  const job=await rpc('start_franchise_erasure',{p_application:id});
  assert.equal(await rpc('start_franchise_erasure',{p_application:id}),job,'start is idempotent');
  assert.equal((await selectApp(id)).portal_access_revoked,true);
  await assert.rejects(db.query("update franchise_applications set status='approved' where id=$1",[id]),/erasure/);
  await assert.rejects(db.query(`insert into franchise_upload_sessions(application_id,request_hash,application_data) values($1,$2,'{}')`,[id,'b'.repeat(64)]),/erased/);
  await assert.rejects(processApplicationRetention({request,remove:async()=>{throw new Error('synthetic storage unavailable');}}),/storage unavailable/);
  assert.ok(await selectApp(id));
  assert.ok((await db.query('select count(*)::int n from franchise_erasure_objects where job_id=$1',[job])).rows[0].n>0);
  await db.query('update franchise_erasure_jobs set next_attempt_at=now() where id=$1',[job]);
  const receipt=await processApplicationRetention({request,remove:removeStorage});
  assert.equal(receipt.siteDeleted,true); assert.equal(receipt.externalCleanupPending,true);
  assert.equal(await selectApp(id),undefined); assert.ok(await selectApp(otherId));
  for(const table of ['franchise_corrections','franchise_upload_sessions','franchise_document_access_log','franchise_funding_verifications']) assert.equal((await db.query(`select count(*)::int n from ${table} where application_id=$1`,[id])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from notification_outbox where reference=$1',[id])).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from notification_events where provider_id='synthetic-provider'")).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from storage.objects where name=any($1::text[])',[[path,oldPath,orphan]])).rows[0].n,0);
  await assert.rejects(rpc('confirm_franchise_external_erasure',{p_job:job,p_officer:randomUUID(),p_confirmed:true}),/officer/);
  await rpc('confirm_franchise_external_erasure',{p_job:job,p_officer:officer,p_confirmed:true});
  const done=(await db.query('select * from franchise_erasure_jobs where id=$1',[job])).rows[0];
  assert.equal(done.state,'complete'); assert.equal(done.application_id,null); assert.deepEqual(done.provider_ids,[]);
  await rpc('record_notification_event',{event_id:'synthetic-late-event',email_id:'synthetic-provider',event_kind:'email.delivered',event_time:new Date().toISOString()});
  assert.equal((await db.query("select count(*)::int n from notification_events where provider_id='synthetic-provider'")).rows[0].n,0,'late webhook cannot recreate erased history');
  await assert.rejects(db.query("insert into notification_outbox(recipient,kind,reference) values('synthetic@example.invalid','application_updated',$1)",[id]),/erased/);
  await assert.rejects(db.query("insert into franchise_document_access_log(user_id,application_id,document_key) values($1,$2,'govIdFront')",[officer,id]),/erased/);
  await assert.rejects(db.query(`insert into franchise_applications(id,applicant_name,applicant_email) values($1,'stale retry','test@example.invalid')`,[id]),/erasure/);
});

test('SQL leases prevent overlapping workers, refuse invalid acknowledgements and cannot finish before objects', async () => {
  const id=await app('withdrawn',true,{govIdFront:{path:`${randomUUID()}/badOwner/govIdFront`}});
  await assert.rejects(rpc('start_franchise_erasure',{p_application:id}),/Unrecognized/);
  await db.query('update franchise_applications set document_paths=$2 where id=$1',[id,JSON.stringify({govIdFront:{path:`${id}/attempt/govIdFront`}})]);
  const claimed=await rpc('claim_franchise_erasure'); assert.ok(claimed);
  assert.equal(await rpc('claim_franchise_erasure'),null);
  await assert.rejects(rpc('finish_franchise_erasure',{p_job:claimed.id,p_lease:randomUUID()}),/lease/);
  assert.equal(await rpc('finish_franchise_erasure',{p_job:claimed.id,p_lease:claimed.lease}),false);
  await rpc('release_franchise_erasure',{p_job:claimed.id,p_lease:claimed.lease});
  await processApplicationRetention({request,remove:removeStorage});
});

test('verified erasure request requires verification, decision and explicit privacy role; approved contracts remain excluded', async () => {
  const id=await app(); const requestId=randomUUID();
  await db.query("insert into franchise_privacy_requests(id,application_id,kind,handler_id) values($1,$2,'deletion',$3)",[requestId,id,officer]);
  await assert.rejects(rpc('start_franchise_erasure',{p_application:id,p_request:requestId}),/Verified deletion/);
  await db.query("update franchise_privacy_requests set verified_at=now(),state='verified',decision='Verified synthetic requester; deletion authorized, no hold.' where id=$1",[requestId]);
  const job=await rpc('start_franchise_erasure',{p_application:id,p_request:requestId});
  assert.ok(job); await processApplicationRetention({request,remove:removeStorage});
  assert.equal((await db.query('select state from franchise_privacy_requests where id=$1',[requestId])).rows[0].state,'in_progress');
  await rpc('confirm_franchise_external_erasure',{p_job:job,p_officer:officer,p_confirmed:true});
  assert.equal((await db.query('select count(*)::int n from franchise_privacy_requests where id=$1',[requestId])).rows[0].n,0);
  const approved=await app('approved');
  const approvedRequest=randomUUID();
  await db.query("insert into franchise_privacy_requests(id,application_id,kind,handler_id,verified_at,state,decision) values($1,$2,'deletion',$3,now(),'verified','Synthetic request reviewed')",[approvedRequest,approved,officer]);
  await assert.rejects(rpc('start_franchise_erasure',{p_application:approved,p_request:approvedRequest}),/separate retention/);
});

test('large deletion batches resume with a new lease and a lost finish response cannot repeat a completed erasure', async () => {
  const id=await app('declined',true);
  for(let i=0;i<61;i++) await db.query("insert into storage.objects(bucket_id,name) values('franchise-documents',$1)",[`${id}/attempt${i}/govIdFront`]);
  let count=0;
  const remove=async(bucket,paths)=>{count+=paths.length;assert.ok(paths.length<=50);await removeStorage(bucket,paths);};
  const first=await processApplicationRetention({request,remove});
  assert.equal(first.siteDeleted,false);assert.equal(first.objectsRemoved,50);assert.ok(await selectApp(id));
  let lost=true;
  await assert.rejects(processApplicationRetention({request:async(path,options)=>{
    const value=await request(path,options);
    if(path.endsWith('finish_franchise_erasure')&&lost){lost=false;throw new Error('synthetic lost response');}
    return value;
  },remove}),/lost response/);
  assert.equal(await selectApp(id),undefined);assert.equal(count,61);
  assert.equal((await processApplicationRetention({request,remove})).processed,0);
});

test('active signed-upload grace and unfamiliar shared-app dependencies block deletion before removing files', async () => {
  const id=await app('withdrawn',true);
  const sid=randomUUID();
  await db.query("insert into franchise_upload_sessions(id,application_id,request_hash,application_data) values($1,$2,$3,'{}')",[sid,id,'c'.repeat(64)]);
  await assert.rejects(rpc('start_franchise_erasure',{p_application:id}),/grace period/);
  await db.query('delete from franchise_upload_sessions where id=$1',[sid]);
  await db.exec('create table external_app_link(application uuid references franchise_applications(id));');
  await assert.rejects(rpc('start_franchise_erasure',{p_application:id}),/foreign keys/);
  await db.exec('drop table external_app_link;');
  assert.ok(await selectApp(id));
  await processApplicationRetention({request,remove:removeStorage});
});

test('private tables and erasure RPCs are inaccessible to public and ordinary authenticated roles', async () => {
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(db.query('select * from public.franchise_privacy_requests'),/permission denied/);
      await assert.rejects(db.query('select public.claim_franchise_erasure()'),/permission denied/);
    } finally { await db.exec('reset role'); }
  }
});

test('maintenance requires POST, enabled setting and separate secret; errors reveal no internal details', async () => {
  const secret='synthetic-privacy-secret-32-characters';
  const env={APPLICATION_RETENTION_SECRET:secret,APPLICATION_RETENTION_ENABLED:'true'};
  const json=(_,status,body)=>({status,body}); const res={setHeader(){}};
  const handler=createApplicationRetentionMaintenance({env,json,request:async()=>{throw new Error('PRIVATE_DB_DATA');},remove:()=>assert.fail()});
  for(const [method,authorization,status] of [['GET',`Bearer ${secret}`,405],['POST','',403],['POST','Bearer bad',403],['POST',`Bearer ${secret}`,503]]) {
    const result=await handler({method,headers:{authorization}},res);
    assert.equal(result.status,status); assert.doesNotMatch(JSON.stringify(result),/PRIVATE_DB_DATA/);
  }
  const disabled=createApplicationRetentionMaintenance({env:{...env,APPLICATION_RETENTION_ENABLED:'false'},json,request:()=>assert.fail('Disabled worker must not touch the database')});
  assert.equal((await disabled({method:'POST',headers:{authorization:`Bearer ${secret}`}},res)).status,503);
});

test('privacy notice acknowledgement is versioned; restoring an older draft clears only the obsolete privacy tick', () => {
  const answers=updateApplicationAnswer({firstName:'Synthetic'},'consent_privacy',true);
  assert.equal(answers.privacyNoticeVersion,PRIVACY_NOTICE_VERSION);
  const oldWindow=globalThis.window;
  try {
    globalThis.window={localStorage:{getItem:()=>JSON.stringify({requestId:randomUUID(),updatedAt:new Date().toISOString(),formData:{...answers,privacyNoticeVersion:'old-notice'}})}};
    const restored=loadApplicationDraft();
    assert.equal(restored.formData.firstName,'Synthetic'); assert.equal(restored.formData.consent_privacy,false);
  } finally { if(oldWindow===undefined) delete globalThis.window; else globalThis.window=oldWindow; }
});

test('a reviewer cannot obtain a new document link while erasure is pending', async () => {
  const handler=createReviewerDocumentHandler({url:'https://synthetic.invalid',serviceKey:'test',rate:async()=>true,
    fetcher:async()=>Response.json({id:randomUUID()}),json:()=>assert.fail(),
    request:async path=>{
      if(path.includes('franchise_document_reviewers'))return [{enabled:true}];
      if(path.includes('franchise_erasure_jobs'))return [{id:randomUUID()}];
      assert.fail('No document lookup or signing after erasure');
    }});
  await assert.rejects(handler({headers:{authorization:'Bearer synthetic-validated-access-token'}},{},randomUUID(),'govIdFront'),error=>error.status===410);
});
