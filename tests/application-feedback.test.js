import test from 'node:test';
import assert from 'node:assert/strict';
import { personalFeedback } from '../src/utils/personalFeedback.js';
import { wordCount } from '../src/utils/wordCount.js';

test('personal feedback retains unrelated errors and targets the corrected field', () => {
  const initial=personalFeedback({});
  assert.ok(initial.some(issue=>issue.id==='pi-firstName'));
  const corrected=personalFeedback({firstName:'Synthetic'});
  assert.ok(!corrected.some(issue=>issue.id==='pi-firstName'));
  assert.ok(corrected.some(issue=>issue.id==='pi-lastName'));
  assert.ok(corrected.some(issue=>issue.id==='pi-citizenship'));
  assert.ok(corrected.every(issue=>issue.id!=='personal-step-title'));
});
test('dependent and conditional validation links to the right control', () => {
  const issues=personalFeedback({email:'a@example.invalid',confirmEmail:'b@example.invalid',hasCoApplicant:'yes',coApplicant:{}});
  assert.ok(issues.some(issue=>issue.id==='pi-confirmEmail'));
  for(const key of ['firstName','lastName','email','phone']) assert.ok(issues.some(issue=>issue.id===`co-${key}`));
  assert.ok(!personalFeedback({hasCoApplicant:'no'}).some(issue=>issue.id.startsWith('co-')));
});
test('word counters count whitespace-delimited words consistently with business validation', () => {
  assert.equal(wordCount('  one\n two\tthree  '),3);
  assert.equal(wordCount('   '),0);
  assert.equal(wordCount(undefined),0);
  assert.equal(wordCount('word '.repeat(100)),100);
});
