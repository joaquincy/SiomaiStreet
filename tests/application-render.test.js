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
import { updateApplicationAnswer } from '../shared/applicationAnswers.js';
import { PRIVACY_CONTACT_EMAIL, PRIVACY_NOTICE_VERSION } from '../shared/privacy.js';

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
      if (name === 'DocumentUpload') {
        assert.match(markup, /id="doc-govIdFront"/);
        assert.doesNotMatch(markup, /Didit|Selfie-to-ID|Verify my identity|identity-check|identity-dialog/);
      }
      if (name === 'LegalConsents') {
        assert.ok(markup.includes(`mailto:${PRIVACY_CONTACT_EMAIL}`));
        assert.match(markup, /180 days after their recorded closure/);
        assert.doesNotMatch(markup, /privacy contacts.*still require confirmation|synthetic information for development/);
      }
      if (formData === fixture) assert.deepEqual(issues, [], `${name}: complete answers must clear all client issues`);
      else assert.ok(issues.length, `${name}: missing answers must remain visible`);
    }
  }
  await t.test('public privacy notice and preparation guide expose the confirmed contact and consistent retention rule', async () => {
    const { default: PrivacyPolicy } = await vite.ssrLoadModule('/src/pages/Legal/DataNoticePage.jsx');
    const { default: ApplicationStart } = await vite.ssrLoadModule('/src/pages/Application/ApplicationStart.jsx');
    const { HelmetProvider } = await import('react-helmet-async');
    const policy = renderToStaticMarkup(createElement(HelmetProvider, {}, createElement(PrivacyPolicy)));
    assert.match(policy, /id="franchise-applications"/);
    assert.ok(policy.includes(PRIVACY_NOTICE_VERSION));
    assert.ok(policy.includes(`mailto:${PRIVACY_CONTACT_EMAIL}`));
    assert.match(policy, /180 days after their recorded closure/);
    assert.doesNotMatch(policy, /two \(2\) years|Privacy contact details will be published|privacy-request contact details are pending/);
    const embedded = renderToStaticMarkup(createElement(PrivacyPolicy, { embedded: true }));
    assert.doesNotMatch(embedded, /<main|<title|rel="canonical"|<h1|id="franchise-applications"|href="\/privacy/,
      'The modal must not change the underlying page metadata, duplicate its anchors or link back to itself');
    assert.match(embedded, /180 days after their recorded closure/);
    assert.ok(embedded.includes(`mailto:${PRIVACY_CONTACT_EMAIL}`));
    const { default: Footer } = await vite.ssrLoadModule('/src/components/Footer.jsx');
    const footer = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Footer)));
    assert.match(footer, /<button[^>]*aria-haspopup="dialog"[^>]*>PRIVACY<\/button>/);
    assert.doesNotMatch(footer, /<dialog|180 days after their recorded closure/, 'The policy content is only mounted on demand');
    const start = renderToStaticMarkup(createElement(ApplicationStart));
    assert.ok(start.includes('/privacy#franchise-applications'));
    assert.ok(start.includes(`mailto:${PRIVACY_CONTACT_EMAIL}`));
  });
  await t.test('linked answers render direct plan controls and reachable conflict messages', async () => {
    const renderStep = async (index, formData) => {
      const { default: Step } = await vite.ssrLoadModule(`/src/pages/Application/steps/${steps[index]}.jsx`);
      const issues = stepFeedback(index, formData);
      const feedback = { showErrors: true, issues, errorsFor: id => issues.filter(issue => issue.id === id).map(issue => issue.message) };
      return renderToStaticMarkup(createElement(ApplicationFeedbackContext.Provider, { value: feedback },
        createElement(Step, { formData, updateField() {}, onEditStep() {}, onEdit() {} })));
    };
    const capital = await renderStep(0, fixture);
    assert.match(capital, /Review or change amount in Step 4/);
    assert.doesNotMatch(capital, /Below ₱50k/);
    const refined = await renderStep(5, fixture);
    assert.match(refined, /Within 3 months/);
    assert.doesNotMatch(refined, /Change (?:timing )?in Step 1|from Step 1|Compare formats or update my preference/);
    assert.match(refined, /id="fp-region-select"[^>]*role="combobox"/);
    assert.match(refined, /id="fp-selectedPackage"[^>]*aria-labelledby="fp-package-label"/);
    assert.match(refined, /package-card selected[^>]*aria-pressed="true"/);
    const longPlan = updateApplicationAnswer(fixture, 'openingTimeline', '1-2-years');
    const longMarkup = await renderStep(5, longPlan);
    assert.match(longMarkup, /toggle-option selected[^>]*aria-pressed="true"[^>]*>[\s\S]*?<span>1 to 2 years<\/span>/);
    for (const label of ['Within 3 months', '3 to 6 months', '6 to 12 months', '1 to 2 years', 'Just exploring']) assert.ok(longMarkup.includes(label));
    const regionConflict = await renderStep(5, { ...fixture, targetRegion: 'Bicol Region' });
    assert.match(regionConflict, /id="fp-targetRegion"[^>]*aria-describedby="fp-region-hint fp-targetRegion-error"/);
    assert.match(regionConflict, /Choose your current region here/);
    const conflict = await renderStep(2, { ...fixture, priorBusinessOwned: 'yes' });
    assert.match(conflict, /id="bb-priorBusinessOwned" tabindex="-1"/);
    assert.match(conflict, /aria-describedby="bb-priorBusinessOwned-error"/);
    assert.match(conflict, /Business ownership answers differ/);
    const removed = { ...fixture, hasCoApplicant: 'no', coApplicant: { firstName: 'REMOVED_PARTNER_SENTINEL', email: 'removed@example.invalid' } };
    assert.doesNotMatch(await renderStep(1, removed), /REMOVED_PARTNER_SENTINEL|removed@example.invalid|Co-applicant First Name/);
    assert.doesNotMatch(await renderStep(8, removed), /REMOVED_PARTNER_SENTINEL|removed@example.invalid/);
    const passport = updateApplicationAnswer(fixture, 'govIdType', 'Passport');
    const passportDocuments = await renderStep(6, passport);
    assert.match(passportDocuments, /Passport identity page/);
    assert.match(passportDocuments, /4 of 4 required selected/);
    assert.match(passportDocuments, /\(4 Required\)/);
    assert.doesNotMatch(passportDocuments, /id="doc-govIdBack"/);
    const passportReview = await renderStep(8, passport);
    assert.match(passportReview, /Passport identity page:/);
    assert.doesNotMatch(passportReview, /Government-Issued ID \(Back\)/);
    const changedId = await renderStep(6, updateApplicationAnswer(passport, 'govIdType', "Driver's License"));
    assert.match(changedId, /id="doc-govIdBack"/);
    assert.match(changedId, /4 of 5 required selected/);
    const pending = { ...passport, fundingStatus: 'pending', totalLiquidCapital: '0', liquidCapital: 'below50k', pendingFundingDetails: 'Synthetic awaiting loan release.', fundsEvidenceType: 'pending-evidence', addressEvidenceType: 'bill-landlord', addressEvidenceDetails: 'Synthetic landlord bill covers my residence.', documents: { ...passport.documents } };
    delete pending.documents.proofOfFunds;
    const pendingDocuments = await renderStep(6, pending);
    assert.match(pendingDocuments, /3 of 3 required selected/);
    assert.match(pendingDocuments, /Funding evidence deferred/);
    assert.match(pendingDocuments, /No fixed document-age limit/);
    assert.match(pendingDocuments, /redact full account numbers/);
    assert.match(pendingDocuments, /id="doc-addressEvidenceDetails"/);
    assert.match(await renderStep(3, pending), /id="fc-pendingFundingDetails"/);
    assert.match(await renderStep(8, pending), /reviewer verification required before approval/);
    const otherId = await renderStep(1, fixture);
    assert.match(otherId, /id="pi-govIdOtherName"/); assert.match(otherId, /id="pi-govIdOtherIssuer"/);
    assert.doesNotMatch(await renderStep(1, passport), /id="pi-govIdOtherName"/);
  });
  const { FormSelect } = await vite.ssrLoadModule('/src/components/FormElements.jsx');
  await t.test('email controls expose pending, code-entry, expired and confirmed states without exposing proof', async () => {
    const { default: EmailConfirmation } = await vite.ssrLoadModule('/src/pages/Application/steps/EmailConfirmation.jsx');
    const email = 'synthetic@example.invalid';
    const props = { email, confirmEmail: email, draftId: 'synthetic', onConfirmed() {}, onChallenge() {} };
    const render = extra => renderToStaticMarkup(createElement(EmailConfirmation, { ...props, ...extra }));
    assert.match(render(), /Send confirmation code/);
    assert.match(render({ confirmEmail: 'different@example.invalid' }), /disabled=""/);
    const challenge = { challengeId: 'synthetic', expiresAt: new Date(Date.now() + 600000).toISOString() };
    const entry = render({ challenge });
    assert.match(entry, /inputMode="numeric"|inputmode="numeric"/);
    assert.match(entry, /autoComplete="one-time-code"|autocomplete="one-time-code"/);
    assert.match(entry, /for="application-email-code"/);
    assert.match(entry, /aria-describedby="application-email-code-hint"/);
    assert.match(render({ challenge: { ...challenge, expiresAt: '2000-01-01T00:00:00Z' } }), /This code expired/);
    const confirmed = render({ confirmation: { email, proof: 'NEVER_RENDER_PROOF', expiresAt: challenge.expiresAt } });
    assert.match(confirmed, /Email confirmed/);
    assert.doesNotMatch(confirmed, /NEVER_RENDER_PROOF|Send confirmation code/);
  });
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
  const { default: Onboarding } = await vite.ssrLoadModule('/src/pages/Application/ApplicationOnboarding.jsx');
  const onboarding = renderToStaticMarkup(createElement(MemoryRouter, {initialEntries:['/application/onboarding']}, createElement(Onboarding)));
  assert.match(onboarding, /preparation guide, not your personal onboarding record/);
  assert.match(onboarding, /aria-current="page"[^>]*href="\/application\/onboarding"/);
  assert.match(onboarding, /Confirm launch readiness/);
  const { default: Start } = await vite.ssrLoadModule('/src/pages/Application/ApplicationStart.jsx');
  const preparation = renderToStaticMarkup(createElement(Start));
  assert.match(preparation, /No employment history/);
  assert.match(preparation, /not needed for Passport/);
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
