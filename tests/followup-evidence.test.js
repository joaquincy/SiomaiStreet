import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { uploadDatabase } from './helpers/uploadDatabase.js';
import { createApplicationFollowup } from '../server/applicationFollowup.js';
import { portalAccess } from '../server/applicationPortal.js';
import { createUploadRepository } from '../server/directUploadServices.js';
import { createDirectUploadHandler, uploadSessionAccess } from '../server/directUploads.js';
import { submitFranchiseApplication } from '../src/api/directUploads.js';
import { prepareApplicationChange, requiredChangeDocuments } from '../shared/applicationFollowup.js';
import { REQUIRED_DOC_KEYS } from '../shared/application.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url)));
const migrationFiles = ['20261031010000_contact_inquiries.sql','20261101000000_transactional_outbox.sql','20261104020000_application_privacy_retention.sql','20261104030000_application_followup.sql','20261105000000_followup_evidence_and_staff_access.sql'];
async function setup(t) {
 const env=await uploadDatabase();t.after(()=>env.db.close());
 await env.db.exec('alter table storage.objects add column name text');
 for(const file of migrationFiles) await env.db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 env.rpc=(name,body)=>env.request('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body)});
 return env;
}
const stream=(body,token)=>Object.assign(Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []),{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},setTimeout(){}});
const response=()=>({setHeader(){}});
const clean={status:'clean',engine:'ClamAV',scannedAt:new Date().toISOString()};

test('document-dependent changes retain current records until checked evidence and staff acceptance; retries and erasure',async t=>{
 const {db,request,rpc}=await setup(t),staff=randomUUID();
 await db.query('insert into auth.users values($1)',[staff]); await db.query('insert into franchise_document_reviewers values($1,true)',[staff]);
 const access=portalAccess('synthetic'.repeat(8));
 const followup=createApplicationFollowup({request,access,rate:async()=>true,json:(res,status,value)=>Object.assign(res,{status,value}),url:'https://synthetic.invalid',serviceKey:'synthetic',fetcher:async()=>Response.json({id:staff})});
 const objects=new Map();let scans=0,infected=false;
 const repository=createUploadRepository(request);
 const storage={exists:async p=>objects.has(p),sign:async p=>({endpoint:'https://synthetic.invalid/storage/v1/upload/resumable',signature:'test',path:p}),download:async(_b,p)=>objects.get(p),promote:async(p,f)=>objects.set('safe/'+p,Buffer.from(await f.arrayBuffer())),remove:async()=>{}};
 const handler=createDirectUploadHandler({repository,storage,rate:async()=>true,verify:async()=>{throw Error('Must use portal auth');},verifyStorage:async()=>{},access:uploadSessionAccess('uploads'.repeat(8)),scanDocument:async()=>{scans++;return infected?{status:'infected',engine:'ClamAV'}:clean;},json:(res,status,value)=>Object.assign(res,{status,value}),changes:followup.changes});
 const uploadFetch=async(url,opt)=>{
  const start=url.match(/^\/api\/application-status\/([^/]+)\/changes\/([^/]+)\/uploads$/),control=url.match(/^\/api\/franchise-applications\/uploads\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  assert.ok(start||control,'expected private change-upload or control route');
  const res=response();
  try {await handler(stream(JSON.parse(opt.body),opt.headers.authorization?.replace('Bearer ','')),res,control?.[1],control?.[2],control?.[3],undefined,undefined,start?{applicationId:start[1],changeId:start[2]}:undefined);}
  catch(e){return Response.json({error:e.message},{status:e.status||500});}
  return Response.json(res.value,{status:res.status});
 };
 const uploader=async(file,grant,opt)=>{objects.set(grant.path,Buffer.from(await file.arrayBuffer()));opt.onProgress(file.size);};
 for(const category of ['identity','funding']){
  const id=randomUUID(),changeId=randomUUID();
  const data={...structuredClone(fixture),govIdType:'Passport'};
  const docs=Object.fromEntries(REQUIRED_DOC_KEYS.filter(k=>k!=='govIdBack').map(k=>[k,{path:id+'/'+k,name:k+'.pdf',contentType:k==='idPhoto'?'image/jpeg':'application/pdf',size:20,scan:clean}]));
  if(category==='funding'){Object.assign(data,{fundingStatus:'pending',pendingFundingDetails:'Loan not released yet',fundsEvidenceType:'pending-evidence',totalLiquidCapital:'0',liquidCapital:'below50k'});delete docs.proofOfFunds;}
  await db.query("insert into franchise_applications(id,applicant_name,applicant_email,application_data,document_paths,status) values($1,'Synthetic','test@example.invalid',$2,$3,'submitted')",[id,JSON.stringify(data),JSON.stringify(docs)]);
  const row=(await request('/rest/v1/franchise_applications?id=eq.'+id))[0],token=access.receipt(row).accessCode;
  const patch=category==='identity'?{govIdType:"Driver's License"}:{fundingStatus:'available',fundsEvidenceType:'bank-certificate',totalLiquidCapital:'350000'};
  const body={revision:1,category,patch,reason:'Synthetic supporting evidence change',requestId:changeId};
  let res=response();await followup.handler(stream(body,token),res,id,'changes');assert.equal(res.value.state,'pending');
  await followup.handler(stream(body,token),response(),id,'changes');
  const change=(await request('/rest/v1/franchise_answer_changes?id=eq.'+changeId))[0];
  assert.deepEqual(change.required_documents,category==='identity'?['govIdFront','govIdBack']:['proofOfFunds']);
  const review={revision:1,decision:'accepted',note:'Synthetic reviewer checked these files',verification:{identityChecked:true,method:'Synthetic identity verification'}};
  await assert.rejects(followup.handler(stream(review,'staff-token-long-enough'),response(),id,'changes',changeId,true),/Supporting documents/);
  const files=Object.fromEntries(change.required_documents.map(k=>[k,new File(['%PDF-1.4\nSynthetic only\n%%EOF'],k+'.pdf',{type:'application/pdf'})]));
  const options={formData:{documents:files},requestId:randomUUID(),changeEvidence:{applicationId:id,id:changeId,accessCode:token},fetcher:uploadFetch,uploader};
  await assert.rejects(submitFranchiseApplication({...options,changeEvidence:{...options.changeEvidence,accessCode:'invalid'}}),/invalid/);
  await assert.rejects(submitFranchiseApplication({...options,changeEvidence:{...options.changeEvidence,id:randomUUID()}}),/no longer/);
  await assert.rejects(submitFranchiseApplication({...options,formData:{documents:{...files,resumeCv:Object.values(files)[0]}}}),/all and only/);
  if(category==='identity')await assert.rejects(submitFranchiseApplication({...options,formData:{documents:{govIdFront:files.govIdFront}}}),/all and only/);
  if(category==='identity'){infected=true;await assert.rejects(submitFranchiseApplication(options),/security scan/);infected=false;options.requestId=randomUUID();}
  const receipt=await submitFranchiseApplication(options);assert.equal(receipt.status,'received');
  const scanCount=scans;assert.deepEqual(await submitFranchiseApplication(options),receipt);assert.equal(scans,scanCount);
  await assert.rejects(submitFranchiseApplication({...options,requestId:randomUUID()}),/already received/);
  const before=(await request('/rest/v1/franchise_applications?id=eq.'+id))[0];
  assert.deepEqual(before.document_paths,docs);assert.equal(before.application_data.govIdType,'Passport');
  res=response();await followup.handler(stream(null,token),res,id);
  assert.ok(res.value.changes[0].documents.every(d=>d.received));assert.ok(!JSON.stringify(res.value).includes('direct/'));
  await assert.rejects(followup.handler(stream({...review,revision:99},'staff-token-long-enough'),response(),id,'changes',changeId,true),/changed|unavailable/);
  await followup.handler(stream(review,'staff-token-long-enough'),response(),id,'changes',changeId,true);
  const accepted=(await request('/rest/v1/franchise_applications?id=eq.'+id))[0];
  assert.equal(accepted.application_data[category==='identity'?'govIdType':'fundingStatus'],category==='identity'?"Driver's License":'available');
  for(const key of change.required_documents)assert.match(accepted.document_paths[key].path,/^direct\//);
  await assert.rejects(followup.changes.authorize(stream(null,token),id,changeId),/no longer/);
  // Uploaded evidence remains inventoried even after upload-session cleanup.
  await db.query("delete from franchise_upload_sessions where application_id=$1",[id]);
  await db.query("update franchise_applications set submitted_at=now()-interval '300 days',status='declined' where id=$1",[id]);
  await db.query('insert into franchise_privacy_officers values($1,true) on conflict do nothing',[staff]);
  await rpc('review_franchise_retention',{p_application:id,p_officer:staff,p_closed_at:new Date(Date.now()-181*86400000).toISOString()});
  const job=await rpc('start_franchise_erasure',{p_application:id});
  const erased=(await db.query('select path from franchise_erasure_objects where job_id=$1',[job])).rows.map(r=>r.path);
  for(const key of change.required_documents){assert.ok(erased.includes(accepted.document_paths[key].path));if(docs[key])assert.ok(erased.includes(docs[key].path));}
 }
});

test('staff onboarding ignores applicant expiry/revocation but retains role, status, erasure and reassessment guards',async t=>{
 const {db,rpc}=await setup(t),staff=randomUUID(),id=randomUUID(),item=randomUUID();
 await db.query('insert into auth.users values($1)',[staff]);await db.query('insert into franchise_document_reviewers values($1,true)',[staff]);
 await db.query("insert into franchise_applications(id,applicant_name,applicant_email,status,submitted_at,portal_access_revoked) values($1,'Test','test@example.invalid','approved',now()-interval '91 days',true)",[id]);
 const assignment={p_application:id,p_id:item,p_reviewer:staff,p_details:{title:'Orientation',instructions:'Confirm readiness',purpose:'Arrange training',evidenceMode:'ready',responsible:'Applicant',contactName:'Staff',contactEmail:'staff@example.invalid'}};
 assert.ok(await rpc('assign_franchise_onboarding',assignment));
 const action={p_application:id,p_item:item,p_id:randomUUID(),p_hash:'a'.repeat(64),p_revision:1,p_action:'reply',p_note:'We can arrange the appointment.',p_reviewer:staff};
 assert.ok(await rpc('act_franchise_onboarding',action));
 await assert.rejects(rpc('act_franchise_onboarding',{...action,p_id:randomUUID(),p_reviewer:null,p_action:'clarification',p_revision:2}),/access unavailable/);
 await db.query("update franchise_onboarding_items set state='submitted' where id=$1",[item]);
 assert.equal((await rpc('act_franchise_onboarding',{...action,p_id:randomUUID(),p_action:'complete',p_revision:2})).state,'complete');
 await db.query("update franchise_applications set reassessment_required=true where id=$1",[id]);
 await assert.rejects(rpc('assign_franchise_onboarding',{...assignment,p_id:randomUUID()}),/reassessment/);
 await db.query("update franchise_applications set reassessment_required=false,status='declined' where id=$1",[id]);
 await assert.rejects(rpc('assign_franchise_onboarding',{...assignment,p_id:randomUUID()}),/closed/);
 await db.query("update franchise_applications set status='approved' where id=$1",[id]);
 await db.query('update franchise_document_reviewers set enabled=false where user_id=$1',[staff]);
 await assert.rejects(rpc('assign_franchise_onboarding',{...assignment,p_id:randomUUID()}),/permission/);
 await db.query('update franchise_document_reviewers set enabled=true where user_id=$1',[staff]);
 await db.query("insert into franchise_erasure_jobs(application_id,application_fingerprint,reason) values($1,$2,'retention')",[id,'b'.repeat(64)]);
 await assert.rejects(rpc('assign_franchise_onboarding',{...assignment,p_id:randomUUID()}),/unavailable/);
 await db.exec('set role authenticated');await assert.rejects(rpc('assert_franchise_staff_followup',{p_application:id,p_reviewer:staff}),/permission/);await db.exec('reset role');
});

test('pending-only document deferral preserves field validation and final document requirements',()=>{
 const current={...structuredClone(fixture),govIdType:'Passport',documents:{}};
 assert.throws(()=>prepareApplicationChange(current,'identity',{govIdType:"Driver's License"}),/Upload/);
 const next=prepareApplicationChange(current,'identity',{govIdType:"Driver's License"},{pending:true});
 assert.ok(requiredChangeDocuments(current,next,'identity').includes('govIdBack'));
 assert.throws(()=>prepareApplicationChange(current,'identity',{govIdType:'Invented ID'},{pending:true}),/valid/);
 assert.throws(()=>prepareApplicationChange(current,'funding',{totalLiquidCapital:'-1'},{pending:true}));
});

test('supporting evidence links require an enabled staff identity, stay application-bound and expire quickly',async()=>{
 const id=randomUUID(),changeId=randomUUID(),staff=randomUUID(),access=portalAccess('s'.repeat(40));
 const a={id,status:'submitted',submitted_at:new Date().toISOString(),application_data:{govIdType:'Passport'},document_paths:{}};
 let enabled=true,linkCount=0,auditCount=0;
 const path=`direct/${randomUUID()}/govIdFront`;
 const evidence={path,name:'synthetic.pdf',scan:clean};
 const request=async(route,options={})=>{
  if(route.includes('franchise_document_reviewers?'))return enabled?[{user_id:staff}]:[];
  if(route.includes('franchise_applications?'))return[a];
  if(route.includes('franchise_answer_changes?'))return route.includes('id=eq.'+changeId)?[{id:changeId,application_id:id,evidence:{govIdFront:evidence}}]:[];
  if(route==='/rest/v1/franchise_document_access_log'){assert.equal(JSON.parse(options.body).user_id,staff);auditCount++;return[];}
  if(route.startsWith('/storage/v1/object/sign/')){assert.ok(route.endsWith(path));assert.equal(JSON.parse(options.body).expiresIn,60);linkCount++;return{signedURL:'/object/sign/franchise-documents/synthetic?token=synthetic'};}
  return[];
 };
 const followup=createApplicationFollowup({request,access,rate:async()=>true,json:(res,status,value)=>Object.assign(res,{status,value}),url:'https://synthetic.invalid',serviceKey:'synthetic',fetcher:async()=>Response.json({id:staff})});
 const body={documentKey:'govIdFront'},staffToken='staff-token-long-enough';
 await assert.rejects(followup.handler(stream(body,access.receipt(a).accessCode),response(),id,'change-evidence',changeId,false),/approval/);
 enabled=false;await assert.rejects(followup.handler(stream(body,staffToken),response(),id,'change-evidence',changeId,true),/permission/);enabled=true;
 await assert.rejects(followup.handler(stream(body,staffToken),response(),id,'change-evidence',randomUUID(),true),/not available/);
 assert.equal(linkCount,0);
 const res=response();await followup.handler(stream(body,staffToken),res,id,'change-evidence',changeId,true);
 assert.equal(res.value.expiresIn,60);assert.equal(linkCount,1);assert.equal(auditCount,1);
 evidence.scan={status:'skipped',engine:'none',scannedAt:new Date().toISOString()};
 await assert.rejects(followup.handler(stream(body,staffToken),response(),id,'change-evidence',changeId,true),/not available/);
 assert.equal(linkCount,1);
});
