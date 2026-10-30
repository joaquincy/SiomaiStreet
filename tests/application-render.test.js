const syntheticPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAMklEQVRIie3QMQ0AAAjAMPxrQxQSdvG1BpZs9tkIFIuSRcmiZFGyKFmULEoWJYvS+6IDceSQiMhl3nAAAAAASUVORK5CYII=','base64');
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { REQUIRED_DOC_KEYS } from '../shared/application.js';
import { stepFeedback } from '../src/utils/personalFeedback.js';

test('all nine steps render synthetic complete and empty/error states without crashing (not browser QA)', async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, logLevel: 'error' });
  t.after(() => vite.close());
  const fixture = JSON.parse(await readFile(new URL('./fixtures/applicant.json', import.meta.url), 'utf8'));
  fixture.documents = Object.fromEntries(REQUIRED_DOC_KEYS.map(key => [key, new File([key==='idPhoto'?syntheticPng:'synthetic'], `${key}.pdf`, { type:key==='idPhoto'?'image/png':'application/pdf' })]));
  const { ApplicationFeedbackContext } = await vite.ssrLoadModule('/src/components/applicationFeedbackContext.js');
  const steps = ['PreQualification', 'PersonalInfo', 'BusinessBackground', 'FinancialCapability', 'BrandAlignment', 'FranchisePlan', 'DocumentUpload', 'LegalConsents', 'ReviewSubmit'];
  for (const [index, name] of steps.entries()) {
    const { default: Step } = await vite.ssrLoadModule(`/src/pages/Application/steps/${name}.jsx`);
    for (const formData of [{}, fixture]) {
      const issues = stepFeedback(index, formData);
      const feedback = { showErrors: true, issues, errorsFor: id => issues.filter(issue => issue.id === id).map(issue => issue.message) };
      const markup = renderToStaticMarkup(createElement(ApplicationFeedbackContext.Provider, { value: feedback },
        createElement(Step, { formData, updateField() {}, onEditStep() {}, showErrors: true })));
      assert.match(markup, /step-content/, name);
      if (formData === fixture) assert.deepEqual(issues, [], `${name}: complete answers must clear all client issues`);
      else assert.ok(issues.length, `${name}: missing answers must remain visible`);
    }
  }
  const { FormSelect } = await vite.ssrLoadModule('/src/components/FormElements.jsx');
  const select = renderToStaticMarkup(createElement(FormSelect, { id: 'test-select', options: ['One', 'Two'], ariaLabel: 'Synthetic selection', onChange() {} }));
  assert.match(select, /role="combobox"/);
  assert.match(select, /aria-expanded="false"/);
  const { default: Calendar } = await vite.ssrLoadModule('/src/components/DatePickerInput.jsx');
  const calendar = renderToStaticMarkup(createElement(Calendar, { id: 'test-date', value: '1995-01-15', onChange() {} }));
  assert.match(calendar, /aria-haspopup="dialog"/);
  assert.match(calendar, /type="date"/);
  const { default: Status } = await vite.ssrLoadModule('/src/pages/Application/ApplicationStatus.jsx');
  const portal = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Status)));
  assert.match(portal, /Private access code/);
  assert.match(portal, /type="password"/);
  assert.doesNotMatch(portal, /replace-with-a/);
  const { default: Start } = await vite.ssrLoadModule('/src/pages/Application/ApplicationStart.jsx');
  const preparation = renderToStaticMarkup(createElement(Start));
  assert.match(preparation, /No employment history/);
  assert.match(preparation, /awaiting owner approval/);
  assert.match(preparation, /<dialog[^>]*aria-labelledby="application-welcome-title"/);
  assert.match(preparation, /aria-label="Close before you start"/);
  assert.match(preparation, /aria-haspopup="dialog"/);
  assert.doesNotMatch(preparation, /<dialog[^>]*\sopen(?:\s|=|>)/, 'The modal opens on the client after the draft restores, not during initial rendering');
  const {default:Picker}=await vite.ssrLoadModule('/src/components/DocumentPicker.jsx');
  const picker=renderToStaticMarkup(createElement(Picker,{docKey:'govIdFront',label:'Test ID',onConfirm(){}}));
  assert.match(picker,/capture="environment"/);assert.match(picker,/Take photo/);assert.match(picker,/Choose photo/);assert.match(picker,/Upload file/);assert.match(picker,/<dialog/);
  const photo=renderToStaticMarkup(createElement(Picker,{docKey:'idPhoto',label:'Portrait',onConfirm(){}}));assert.match(photo,/capture="user"/);
});
