import test from 'node:test';
import assert from 'node:assert/strict';
import { identityService } from '../server/diditIdentity.js';

const draft = '065297ac-33cf-4193-af57-0fddea7a6e07';
const session = '784a6249-81c7-4886-9744-748406ebd14d';
const details = { govIdNumber: 'TEST-123', dateOfBirth: '1990-09-12' };
function setup(mode = 'sandbox') {
  const decision = { session_id: session, workflow_id:'workflow', status:'Approved',
    id_verifications:[{status:'Approved', document_number:'TEST123', date_of_birth:details.dateOfBirth}],
    liveness_checks:[{status:'Approved'}], face_matches:[{status:'Approved'}] };
  const service = identityService({ DIDIT_MODE:mode, DIDIT_API_KEY:'test-key', DIDIT_WORKFLOW_ID:'workflow' }, async (_, opts) => {
    if (opts.method === 'POST') {
      decision.vendor_data = JSON.parse(opts.body).vendor_data;
      return Response.json({session_id: session, url:'https://verify.didit.me/session/test'});
    }
    return Response.json(decision);
  });
  return { service, decision };
}
test('provider result must be complete, server signed, and bound to the same draft and identity', async () => {
  const { service, decision } = setup();
  const start = await service.run('start', draft, details, null, 'sandbox');
  const check = () => service.run('status', draft, details, start.proof);
  const passed = await check();
  assert.equal(service.summary(passed.proof, draft, details).status, 'passed');
  assert.equal(service.summary(passed.proof, session, details).status, 'manual-review');
  assert.equal(service.summary(passed.proof, draft, {...details,govIdNumber:'OTHER'}).status, 'manual-review');
  assert.equal(service.summary('passed', draft, details).status, 'manual-review');
  decision.face_matches = [];
  assert.equal((await check()).status, 'manual-review');
  decision.vendor_data = 'different';
  await assert.rejects(check, /confirmed/);
});
test('live check requires live consent and matching ID details', async () => {
  const { service, decision } = setup('live');
  await assert.rejects(() => service.run('start', draft, details, null, 'sandbox'), /notice/);
  const start = await service.run('start', draft, details, null, 'live');
  assert.equal((await service.run('status', draft, details, start.proof)).status, 'passed');
  decision.id_verifications[0].document_number = 'other';
  assert.equal((await service.run('status', draft, details, start.proof)).status, 'manual-review');
});
