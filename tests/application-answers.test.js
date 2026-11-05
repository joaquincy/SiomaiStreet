import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { updateApplicationAnswer, restoreApplicationAnswers, capitalRangeFor } from '../shared/applicationAnswers.js';
import { sanitizeApplication, validateApplication, REQUIRED_DOC_KEYS } from '../shared/application.js';
import { stepFeedback } from '../src/utils/personalFeedback.js';
import { loadApplicationDraft, saveApplicationDraft } from '../src/utils/applicationDraft.js';
import { validateUploadRequest } from '../server/directUploads.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url), 'utf8'));
const manifest = REQUIRED_DOC_KEYS.map(key => ({ key, name: `${key}.jpg`, type: 'image/jpeg', size: 100, sha256: '0'.repeat(64) }));
const valid = patch => ({ ...structuredClone(fixture), documents: Object.fromEntries(manifest.map(doc => [doc.key, doc])), ...patch });
const validate = data => validateApplication(data, { documentMetadata: true });
const request = data => ({ version: 1, requestId: randomUUID(), applicationData: data, manifest });

test('every repeated-answer conflict is rejected by shared and direct-upload validation with an error target', () => {
  assert.deepEqual(validate(valid()), []);
  for (const [patch, step, id] of [
    [{ liquidCapital: 'below50k' }, 3, 'fc-capital'],
    [{ priorBusinessOwned: 'yes' }, 2, 'bb-priorBusinessOwned'],
    [{ selectedPackage: 'casual-dining' }, 5, 'fp-selectedPackage'],
    [{ targetRegion: 'Bicol Region' }, 5, 'fp-targetRegion'],
    [{ openingTimeline: '1-2-years' }, 5, 'fp-planOpeningTimeline'],
  ]) {
    const data = valid(patch);
    assert.ok(validate(data).some(issue => issue.step === step));
    assert.ok(stepFeedback(step, data).some(issue => issue.id === id));
    assert.throws(() => validateUploadRequest(request(data)), error => error.status === 422 && error.validationErrors.some(issue => issue.step === step));
  }
});

test('edits from either step update the same answer without losing unrelated answers or files', () => {
  for (const [first, second, value] of [
    ['franchiseType', 'selectedPackage', 'not-sure'],
    ['territory', 'targetRegion', 'Bicol Region'],
    ['ownedBusiness', 'priorBusinessOwned', 'yes'],
  ]) {
    for (const field of [first, second]) {
      const before = valid();
      const next = updateApplicationAnswer(before, field, value);
      assert.equal(next[first], value);
      assert.equal(next[second], value);
      assert.equal(next.documents, before.documents);
      assert.equal(next.whyInterested, before.whyInterested);
      assert.notEqual(before[field], value, 'does not mutate the original');
      assert.deepEqual(validate(next), []);
    }
  }
});

test('exact capital deterministically updates ranges including every boundary and cents', () => {
  for (const [amount, range] of [
    ['0.01', 'below50k'], ['49,999.99', 'below50k'], ['50,000', '50k-150k'],
    ['150000', '50k-150k'], ['150000.01', '150k-250k'], ['250000', '150k-250k'],
    ['250000.01', '250k-500k'], ['500000', '250k-500k'], ['500000.01', 'above500k'],
  ]) {
    assert.equal(capitalRangeFor(amount), range);
    const next = updateApplicationAnswer(valid(), 'totalLiquidCapital', amount);
    assert.equal(next.liquidCapital, range);
    assert.equal(next.totalLiquidCapital, amount);
    assert.deepEqual(validate(next), []);
  }
  for (const amount of ['', '-5', '1,00', 'Infinity', '999999999999999999']) {
    const next = updateApplicationAnswer(valid(), 'totalLiquidCapital', amount);
    assert.equal(capitalRangeFor(amount), '');
    assert.equal(next.liquidCapital, fixture.liquidCapital, 'invalid input does not invent a new range');
    assert.ok(validate(next).some(issue => issue.step === 3));
  }
  const zero = updateApplicationAnswer(valid(), 'totalLiquidCapital', '0');
  assert.equal(zero.liquidCapital, 'below50k');
  assert.ok(validate(zero).some(issue => issue.step === 3), 'zero cash requires an explicit pending funding answer');
});

test('timeline refinement preserves compatible timing and supports longer and exploratory plans', () => {
  for (const [opening, plan] of [['6-12-months', '6-12-months'], ['1-2-years', '1-2-years'], ['just-exploring', 'just-planning']]) {
    const next = updateApplicationAnswer(valid(), 'openingTimeline', opening);
    assert.equal(next.planOpeningTimeline, plan);
    assert.deepEqual(validate(next), []);
    const refined = updateApplicationAnswer(next, 'planOpeningTimeline', 'within-3-months');
    assert.equal(refined.openingTimeline, 'within-6-months');
    assert.deepEqual(validate(refined), []);
  }
  assert.equal(updateApplicationAnswer(valid(), 'openingTimeline', 'within-6-months').planOpeningTimeline, '3-6-months');
  const reset = updateApplicationAnswer(valid({ openingTimeline: '1-2-years', planOpeningTimeline: '1-2-years' }), 'openingTimeline', 'within-6-months');
  assert.equal(reset.planOpeningTimeline, '', 'does not invent a more precise opening date');
  assert.ok(validate(reset).some(issue => issue.step === 5));
});

test('older partial drafts fill missing aliases but retain conflicting values for explicit review', () => {
  const partial = restoreApplicationAnswers({ ownedBusiness: 'no', franchiseType: 'food-cart', territory: 'Bicol Region', openingTimeline: '1-2-years' });
  assert.equal(partial.priorBusinessOwned, 'no');
  assert.equal(partial.selectedPackage, 'food-cart');
  assert.equal(partial.targetRegion, 'Bicol Region');
  assert.equal(partial.planOpeningTimeline, '1-2-years');
  const conflict = valid({ selectedPackage: 'casual-dining', totalLiquidCapital: '1000', priorBusinessOwned: 'yes' });
  const restored = restoreApplicationAnswers(conflict);
  assert.equal(restored.franchiseType, 'food-cart');
  assert.equal(restored.selectedPackage, 'casual-dining');
  assert.equal(restored.liquidCapital, '250k-500k');
  assert.equal(restored.totalLiquidCapital, '1000');
  assert.equal(restored.ownedBusiness, 'no');
  assert.equal(restored.priorBusinessOwned, 'yes');
  assert.equal(validate(restored).length, 3);
});

test('No or missing co-applicant choice strips details from state, sanitizer and backend payload/hash', () => {
  const partner = { firstName: 'Synthetic', lastName: 'Partner', email: 'partner@example.invalid', phone: '00000000000' };
  const active = valid({ hasCoApplicant: 'yes', coApplicant: partner });
  assert.deepEqual(sanitizeApplication(active).coApplicant, partner);
  assert.deepEqual(validate(active), []);
  const removed = updateApplicationAnswer(active, 'hasCoApplicant', 'no');
  assert.equal(Object.hasOwn(removed, 'coApplicant'), false);
  assert.equal(Object.hasOwn(updateApplicationAnswer(removed, 'hasCoApplicant', 'yes'), 'coApplicant'), false);
  assert.equal(Object.hasOwn(updateApplicationAnswer(removed, 'coApplicant', partner), 'coApplicant'), false);
  for (const choice of ['no', undefined]) {
    const dirty = valid({ hasCoApplicant: choice, coApplicant: partner });
    const clean = valid({ hasCoApplicant: choice });
    assert.equal(Object.hasOwn(sanitizeApplication(dirty), 'coApplicant'), false);
    const accepted = validateUploadRequest(request(dirty));
    assert.equal(Object.hasOwn(accepted.data, 'coApplicant'), false);
    assert.equal(accepted.hash, validateUploadRequest(request(clean)).hash, 'inactive details cannot affect retries');
    assert.deepEqual(validate(dirty), []);
  }
});

test('saved and restored browser drafts omit inactive partner data and keep their retry identity', t => {
  const previous = globalThis.window;
  let stored;
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_key, value) => { stored = value; } } };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  const id = randomUUID();
  const data = valid({ hasCoApplicant: 'no', coApplicant: { email: 'removed@example.invalid' } });
  assert.equal(saveApplicationDraft(5, data, id), true);
  assert.doesNotMatch(stored, /removed@example/);
  stored = JSON.stringify({ requestId: id, currentStep: 5, updatedAt: new Date().toISOString(), formData: data });
  const loaded = loadApplicationDraft();
  assert.equal(loaded.requestId, id);
  assert.equal(Object.hasOwn(loaded.formData, 'coApplicant'), false);
  saveApplicationDraft(5, loaded.formData, id);
  assert.doesNotMatch(stored, /removed@example/);
});
