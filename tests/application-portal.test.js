import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPortalHandler, portalAccess } from '../server/applicationPortal.js';

function harness() {
  const id=randomUUID(), correctionId=randomUUID(), retryId=randomUUID();
  const access=portalAccess('synthetic-secret-only-'.repeat(3));
  const row={id,status:'more_information_requested',submitted_at:new Date().toISOString(),updated_at:new Date().toISOString(),staff_notes:'PRIVATE',application_data:{govIdNumber:'PRIVATE'}};
  const request={id:correctionId,document_key:'govIdFront',reason:'Please replace the blurred front photo.',status:'open',reviewer_id:'PRIVATE'};
  const state={parse:0,insert:0,scan:0,released:0,uploads:[],deletes:[],events:[],allow:true};
  let form=new FormData();form.append('requestId',retryId);form.append('document',new File(['%PDF-1.4 synthetic'],'synthetic.pdf',{type:'application/pdf'}));
  const deps={access,rate:async()=>state.allow,admit:async()=>()=>{state.released++;},verifyStorage:async()=>{},readMultipart:async()=>{state.parse++;return form;},
    repository:{find:async()=>row,requests:async()=>[request],replace:async body=>{state.insert++;request.status='received';request.request_id=body.retry_id;request.request_hash=body.file_hash;return {id:correctionId,requestId:retryId,status:'received',path:body.metadata.path};}},
    scanDocument:async()=>{state.scan++;return {status:'clean',engine:'ClamAV',scannedAt:new Date().toISOString()};},
    uploadFile:async(bucket,path)=>state.uploads.push([bucket,path]),deleteStorageObjects:async(bucket,paths)=>state.deletes.push([bucket,paths]),reportCleanupFailure:event=>state.events.push(event),
    json:(res,status,body)=>{res.status=status;res.body=body;},
  };
  const req={headers:{authorization:'Bearer '+access.receipt(row).accessCode},setTimeout(){}};
  const call=async(correction=correctionId)=>{const res={};await createPortalHandler(deps)(req,res,id,correction);return res;};
  return {id,access,row,request,state,deps,req,call,form};
}

test('portal codes are application-bound and require a server secret',()=>{
  const h=harness();const token=h.access.receipt(h.row).accessCode;
  h.access.verify(h.id,token);
  assert.throws(()=>h.access.verify(randomUUID(),token),/invalid/);
  assert.throws(()=>h.access.verify(h.id,h.id),/invalid/);
  assert.throws(()=>portalAccess('').receipt(h.row),/not configured/);
});
test('portal denies wrong credentials, revoked/expired access and rate limits before parsing',async()=>{
  for(const change of [h=>{h.req.headers.authorization='Bearer wrong';},h=>{h.row.portal_access_revoked=true;},h=>{h.row.submitted_at='2000-01-01';},h=>{h.state.allow=false;}]){
    const h=harness();change(h);await assert.rejects(h.call());assert.equal(h.state.parse,0);assert.equal(h.state.scan,0);
  }
});
test('status responses expose requests but not answers, staff notes, reviewer identity or object paths',async()=>{
  const h=harness();const result=await h.call(null);assert.equal(result.body.status,'more_information_requested');
  assert.equal(JSON.stringify(result.body).includes('PRIVATE'),false);assert.equal(h.state.parse,0);
});
test('replacement requires an open matching request and a valid file',async()=>{
  const h=harness();await assert.rejects(h.call(randomUUID()),/not found/);assert.equal(h.state.parse,0);
  h.form.set('document',new File(['fake'],'fake.pdf',{type:'application/pdf'}));await assert.rejects(h.call(),/file type/);assert.equal(h.state.uploads.length,0);assert.equal(h.state.released,1);
});
test('clean replacements scan before final storage, return a receipt, and retry without a second update',async()=>{
  const h=harness();const result=await h.call();assert.equal(result.body.status,'received');assert.equal(h.state.insert,1);
  assert.deepEqual(h.state.uploads.map(u=>u[0]),['franchise-quarantine','franchise-documents']);assert.equal(h.state.scan,1);
  assert.equal(h.state.deletes[0][0],'franchise-quarantine');
  assert.deepEqual((await h.call()).body,result.body);assert.equal(h.state.insert,1);assert.equal(h.state.scan,1);
  h.form.set('requestId',randomUUID());await assert.rejects(h.call(),/already completed/);
});
test('infected or unavailable scans cannot release replacements to reviewers',async()=>{
  for(const scan of [{status:'rejected'},{status:'clean'},{status:'unavailable'}]){
    const h=harness();h.deps.scanDocument=async()=>scan;await assert.rejects(h.call());assert.equal(h.state.insert,0);
    assert.deepEqual(h.state.uploads.map(u=>u[0]),['franchise-quarantine']);assert.ok(h.state.deletes.some(d=>d[0]==='franchise-quarantine'));assert.equal(h.state.released,1);
  }
});
test('ambiguous correction commits preserve final files for reconciliation',async()=>{
  const h=harness();h.deps.repository.replace=async()=>{throw new Error('timeout');};await assert.rejects(h.call(),/timeout/);
  assert.equal(h.state.deletes.some(d=>d[0]==='franchise-documents'),false);assert.equal(h.state.events[0].reason,'reconcile-possible-commit');
});
