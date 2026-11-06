import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { validateApplication, sanitizeApplication, getApplicationDocuments } from '../shared/application.js';
import { DOCUMENT_POLICY, DOCUMENT_POLICY_VERSION, ADDRESS_EVIDENCE_OPTIONS, DOCUMENT_RECENCY_NOTICE } from '../shared/documentPolicy.js';
import { updateApplicationAnswer } from '../shared/applicationAnswers.js';
import { validateUploadRequest } from '../server/directUploads.js';
import { createFundingVerificationHandler } from '../server/fundingVerification.js';
import { stepFeedback } from '../src/utils/personalFeedback.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url), 'utf8'));
const valid = patch => {
  const data = { ...structuredClone(fixture), ...patch };
  data.documents = Object.fromEntries(getApplicationDocuments(data).filter(doc => doc.required).map(doc => [doc.key, { size: 42, type: 'image/jpeg' }]));
  return data;
};
const validate = data => validateApplication(data, { documentMetadata: true });
const body = data => ({ version: 1, requestId: randomUUID(), applicationData: data, manifest: Object.entries(data.documents).map(([key, doc], index) => ({ key, ...doc, name: `${key}.jpg`, sha256: String(index).repeat(64) })) });
const pending = { fundingStatus: 'pending', totalLiquidCapital: '0', liquidCapital: 'below50k', investmentSources: ['bank-loan'], pendingFundingDetails: 'Synthetic: awaiting release of the approved facility; timing is unknown.', fundsEvidenceType: 'pending-evidence' };

test('address alternatives require an explanation only where needed and remain reviewable evidence', () => {
  for (const { value } of ADDRESS_EVIDENCE_OPTIONS) {
    const data = valid({ addressEvidenceType: value });
    if (['bill-household', 'bill-landlord', 'other'].includes(value)) {
      assert.ok(validate(data).some(error => /Address evidence explanation/.test(error.message)));
      data.addressEvidenceDetails = 'Synthetic: this household bill covers the home where I live with my parent.';
    }
    assert.deepEqual(validate(data), [], value);
    assert.ok(validateUploadRequest(body(data)).data.addressEvidenceType);
  }
  assert.ok(validate(valid({ addressEvidenceType: 'invented' })).some(error => error.step === 6));
});

test('Other ID requires name and authority, limits lengths, focuses errors and removes hidden details', () => {
  const data = valid({ govIdOtherName: '', govIdOtherIssuer: '' });
  const issues = stepFeedback(1, data);
  assert.ok(issues.some(issue => issue.id === 'pi-govIdOtherName'));
  assert.ok(issues.some(issue => issue.id === 'pi-govIdOtherIssuer'));
  assert.ok(validate(valid({ govIdOtherName: 'x'.repeat(121) })).some(error => error.step === 1));
  const clean = updateApplicationAnswer(valid(), 'govIdType', 'Passport');
  assert.equal(clean.govIdOtherName, undefined);
  assert.equal(clean.govIdOtherIssuer, undefined);
  assert.equal(sanitizeApplication({ ...fixture, govIdType: 'Passport' }).govIdOtherName, undefined);
});

test('pending funding can submit with no invented funds/file but cannot masquerade as available capital', () => {
  const data = valid(pending);
  assert.deepEqual(validate(data), []);
  assert.equal(data.documents.proofOfFunds, undefined);
  const accepted = validateUploadRequest(body({ ...data, documentPolicyVersion: 'forged-version' }));
  assert.equal(accepted.data.documentPolicyVersion, DOCUMENT_POLICY_VERSION);
  for (const patch of [{ fundingStatus: 'available' }, { totalLiquidCapital: '100' }, { pendingFundingDetails: ' ' }, { pendingFundingDetails: 'x'.repeat(1001) }]) {
    assert.ok(validate({ ...data, ...patch }).length);
    assert.throws(() => validateUploadRequest(body({ ...data, ...patch })), error => error.status === 422);
  }
  for (const fundsEvidenceType of ['loan-approval', 'partner-commitment']) {
    assert.deepEqual(validate(valid({ ...pending, fundsEvidenceType })), []);
    assert.ok(validate(valid({ fundsEvidenceType })).some(error => /Funding evidence type/.test(error.message)));
  }
  const partly = valid({ ...pending, fundingStatus: 'partly-pending', totalLiquidCapital: '5000' });
  assert.deepEqual(validate(partly), []);
  assert.ok(validate({ ...partly, totalLiquidCapital: '0' }).length);
  const attached = { ...data, documents: { ...data.documents, proofOfFunds: { size: 42, type: 'image/jpeg' } } };
  assert.ok(validate(attached).some(error => /already selected/.test(error.message)));
});

test('inactive explanations are omitted and current policy covers every document without a fixed recency cutoff', () => {
  const data = { ...fixture, pendingFundingDetails: 'PRIVATE_OLD_NOTE', addressEvidenceDetails: 'PRIVATE_OLD_NOTE', fundsEvidenceDetails: 'PRIVATE_OLD_NOTE' };
  assert.doesNotMatch(JSON.stringify(sanitizeApplication(data)), /PRIVATE_OLD_NOTE/);
  assert.doesNotMatch(JSON.stringify(updateApplicationAnswer(data, 'fundingStatus', 'available')), /PRIVATE_OLD_NOTE/);
  assert.match(DOCUMENT_RECENCY_NOTICE, /No fixed document-age limit/);
  for (const doc of getApplicationDocuments()) for (const key of ['purpose', 'stage', 'pages', 'alternatives']) assert.ok(DOCUMENT_POLICY[doc.key][key]);
});

test('funding verification authenticates and authorizes before reading, binds reviewer identity, bounds input and cannot change scanner mode', async () => {
  const appId = randomUUID(); const userId = randomUUID(); const recordId = randomUUID(); let permitted = true; let authOK = true; let rpcBody; let allow = true;
  const handler = createFundingVerificationHandler({ url: 'https://synthetic.invalid', serviceKey: 'synthetic', rate: async () => allow,
    fetcher: async () => Response.json({ id: userId }, { status: authOK ? 200 : 401 }),
    request: async (path, options) => {
      if (path.includes('franchise_document_reviewers')) return permitted ? [{ user_id: userId }] : [];
      rpcBody = JSON.parse(options.body); return { id: recordId, applicationId: appId, status: 'verified' };
    }, json: (res, status, value) => Object.assign(res, { status, value }) });
  const request = body => Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer synthetic.token.long.enough' }, setTimeout() {} });
  const res = () => ({ setHeader() {} });
  const invalid = request({}); permitted = false;
  await assert.rejects(handler(invalid, res(), appId), error => error.status === 403); assert.equal(invalid.readableDidRead, false);
  permitted = true; authOK = false; await assert.rejects(handler(request({}), res(), appId), error => error.status === 401);
  authOK = true; allow = false; await assert.rejects(handler(request({}), res(), appId), error => error.status === 429);
  allow = true;
  for (const input of [{ notes: 'checked' }, { confirmedAvailable: true, notes: '' }, { confirmedAvailable: true, notes: 'x'.repeat(1001) }]) await assert.rejects(handler(request(input), res(), appId), error => error.status === 422);
  const response = res(); await handler(request({ confirmedAvailable: true, notes: 'Evidence reviewed, availability confirmed.', reviewerId: randomUUID(), allowUnscanned: true }), response, appId);
  assert.equal(response.value.id, recordId); assert.equal(rpcBody.p_reviewer, userId); assert.equal(rpcBody.p_allow_unscanned, false);
});
