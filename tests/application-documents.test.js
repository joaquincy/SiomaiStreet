import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { getApplicationDocuments, validateApplication, validateStep, sanitizeApplication } from '../shared/application.js';
import { updateApplicationAnswer, restoreApplicationAnswers } from '../shared/applicationAnswers.js';
import { validateUploadRequest } from '../server/directUploads.js';
import { stepFeedback } from '../src/utils/personalFeedback.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url), 'utf8'));
const passport = () => ({ ...structuredClone(fixture), govIdType: 'Passport', documents: Object.fromEntries(
  getApplicationDocuments({ govIdType: 'Passport' }).filter(doc => doc.required).map(doc =>
    [doc.key, new File(['synthetic test only'], `${doc.key}.jpg`, { type: 'image/jpeg' })]) ) });
const uploadBody = data => ({ version: 1, requestId: randomUUID(), applicationData: data,
  manifest: Object.entries(data.documents).map(([key, file]) => ({ key, name: file.name, type: file.type, size: file.size, sha256: 'a'.repeat(64) })) });

test('Passport without a back passes step, final and direct-upload validation; all other IDs still need a back', () => {
  const data = passport();
  assert.deepEqual(validateStep(6, data), []);
  assert.deepEqual(validateApplication(data), []);
  assert.equal(validateUploadRequest(uploadBody(data)).manifest.length, 4);
  for (const govIdType of ["Driver's License", 'UMID', 'PhilID (National ID)', 'Postal ID', "Voter's ID", 'Other', undefined, 'passport']) {
    const other = { ...data, govIdType };
    assert.ok(stepFeedback(6, other).some(issue => issue.id === 'doc-govIdBack'), String(govIdType));
    assert.throws(() => validateUploadRequest(uploadBody(other)), error => error.status === 422);
  }
});

test('Passport still requires every other mandatory document and validates size and format', () => {
  for (const key of ['govIdFront', 'proofOfBilling', 'proofOfFunds', 'idPhoto']) {
    const data = passport();
    delete data.documents[key];
    assert.ok(stepFeedback(6, data).some(issue => issue.id === `doc-${key}`), key);
    assert.throws(() => validateUploadRequest(uploadBody(data)), error => error.status === 422);
  }
  assert.ok(validateStep(6, { ...passport(), documents: {} }).includes('Upload Passport identity page'));
  const body = uploadBody(passport());
  for (const patch of [{ size: 10485761 }, { size: 0 }, { type: 'text/html' }]) {
    assert.throws(() => validateUploadRequest({ ...body, manifest: [{ ...body.manifest[0], ...patch }, ...body.manifest.slice(1)] }), error => error.status === 422);
  }
});

test('switching to Passport removes only the back and cannot resurrect it from an older draft', () => {
  const data = passport();
  data.govIdType = 'Other';
  data.documents.govIdBack = new File(['synthetic back'], 'previous-id-back.jpg', { type: 'image/jpeg' });
  const next = updateApplicationAnswer(data, 'govIdType', 'Passport');
  assert.equal(Object.hasOwn(next.documents, 'govIdBack'), false);
  assert.equal(next.documents.govIdFront, data.documents.govIdFront);
  assert.equal(next.documents.proofOfFunds, data.documents.proofOfFunds);
  assert.ok(data.documents.govIdBack, 'the previous state is not mutated');
  const dirtyPassport = { ...data, govIdType: 'Passport' };
  for (const clean of [sanitizeApplication(dirtyPassport), restoreApplicationAnswers(dirtyPassport), updateApplicationAnswer(next, 'documents', data.documents)]) {
    assert.equal(Object.hasOwn(clean.documents, 'govIdBack'), false);
  }
  const card = updateApplicationAnswer(next, 'govIdType', "Driver's License");
  assert.ok(stepFeedback(6, card).some(issue => issue.id === 'doc-govIdBack'));
});
