import { sanitizeApplication, validateStep, applicationChoices, getApplicationDocuments } from './application.js';
import { updateApplicationAnswer } from './applicationAnswers.js';
import { canDeferFundsEvidence } from './documentPolicy.js';

export const CHANGE_GROUPS = {
  contact: { label: 'Phone and contact preference', fields: ['primaryPhone', 'secondaryPhone', 'preferredContactMethod'], immediate: true },
  plan: { label: 'Location, package and opening plans', fields: ['selectedPackage', 'targetRegion', 'targetCity', 'hasSpecificLocation', 'siteTypes', 'openToAlternative', 'planOpeningTimeline', 'multipleUnits', 'additionalPlanDetails'] },
  funding: { label: 'Funding plans', fields: ['totalLiquidCapital', 'fundingStatus', 'pendingFundingDetails', 'investmentSources', 'fundsEvidenceType', 'fundsEvidenceDetails'] },
  identity: { label: 'Name and identity details', fields: ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'citizenship', 'address', 'govIdType', 'govIdOtherName', 'govIdOtherIssuer', 'govIdNumber', 'govIdReviewReason', 'maritalStatus'], verification: true },
  coApplicant: { label: 'Co-applicant', fields: ['hasCoApplicant', 'coApplicant'], verification: true },
  email: { label: 'Registered email', fields: ['email'], verification: true },
};
export const FOLLOWUP_LABELS = { primaryPhone: 'Primary phone', secondaryPhone: 'Alternative phone (optional)', preferredContactMethod: 'Preferred contact method', totalLiquidCapital: 'Available capital (PHP)', govIdNumber: 'Government ID number', coApplicant: 'Co-applicant details' };
export const followupLabel = key => FOLLOWUP_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
export const followupOptions = key => key === 'preferredContactMethod' ? ['email', 'phone'] : applicationChoices[key];
export const FOLLOWUP_ARRAY_FIELDS = ['siteTypes', 'investmentSources'];
export const changeStates = { pending: 'Pending', accepted: 'Accepted', changes_needed: 'Changes needed' };
export const onboardingStates = { not_started: 'Not started', submitted: 'Submitted for review', needs_correction: 'Needs correction', complete: 'Reviewer-confirmed complete' };
export const ONBOARDING_DOCUMENT_KEY = 'onboardingEvidence';
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const invalid = message => Object.assign(new Error(message), { status: 422 });

export function changeDocuments(answers, documents) {
  const next = { ...documents };
  if (answers.govIdType === 'Passport') delete next.govIdBack;
  if (canDeferFundsEvidence(answers)) delete next.proofOfFunds;
  return next;
}

export function requiredChangeDocuments(current, proposed, group) {
  if (!['identity', 'funding'].includes(group)) return [];
  const required = getApplicationDocuments(proposed).filter(doc => doc.required).map(doc => doc.key);
  const freshId = group === 'identity' && ['govIdType', 'govIdNumber', 'govIdOtherName', 'govIdOtherIssuer', 'firstName', 'lastName', 'dateOfBirth'].some(key => current[key] !== proposed[key]);
  return required.filter(key => !current.documents?.[key] ||
    (freshId && ['govIdFront', 'govIdBack'].includes(key)) ||
    (group === 'identity' && current.address !== proposed.address && key === 'proofOfBilling') ||
    (group === 'funding' && key === 'proofOfFunds'));
}

export function prepareApplicationChange(current, group, patch, { pending = false } = {}) {
  const spec = CHANGE_GROUPS[group];
  if (!spec || !object(patch) || !Object.keys(patch).length || Object.keys(patch).some(k => !spec.fields.includes(k))) throw invalid('Choose only the fields in this update category.');
  let next = { ...current };
  for (const [key, raw] of Object.entries(patch)) {
    if (FOLLOWUP_ARRAY_FIELDS.includes(key) ? !Array.isArray(raw) || raw.some(x => typeof x !== 'string') : key === 'coApplicant' ? !object(raw) || Object.entries(raw).some(([k, v]) => !['firstName', 'lastName', 'email', 'phone'].includes(k) || typeof v !== 'string' || v.length > 320) : typeof raw !== 'string' || raw.length > 2000) throw invalid(`Check ${followupLabel(key)}.`);
    next = updateApplicationAnswer(next, key, typeof raw === 'string' ? raw.trim() : raw);
  }
  if (next.email) next.email = next.email.trim().toLowerCase();
  next.confirmEmail = next.email;
  const documents = changeDocuments(next, current.documents || {});
  const preference = next.preferredContactMethod;
  next = { ...sanitizeApplication(next), documents, ...(preference ? { preferredContactMethod: preference } : {}) };
  if (group === 'contact') {
    for (const key of ['primaryPhone', 'secondaryPhone']) {
      const digits = (next[key] || '').replace(/\D/g, '');
      if ((key === 'primaryPhone' || next[key]) && (digits.length < 7 || digits.length > 15 || next[key].length > 40)) throw invalid(`Enter a valid ${followupLabel(key).toLowerCase()}.`);
    }
    if (preference && !['email', 'phone'].includes(preference)) throw invalid('Choose email or phone for your contact preference.');
  } else {
    const steps = { plan: [5], funding: [3, 6], identity: [1, 6], coApplicant: [1], email: [1] }[group];
    const errors = steps.flatMap(step => validateStep(step, next, { documentMetadata: true, deferRequiredDocuments: pending && ['identity', 'funding'].includes(group) }));
    if (errors.length) throw invalid(errors.join('. '));
  }
  const { documents: _omitted, confirmEmail: _confirmation, ...answers } = next;
  if (current.emailVerification && next.email === current.email) answers.emailVerification = current.emailVerification;
  return answers;
}

export function changeView(data, group) {
  return Object.fromEntries((CHANGE_GROUPS[group]?.fields || []).map(key => [key,
    key === 'govIdNumber' && data[key] ? `Ending ${String(data[key]).slice(-4)}` : data[key] ?? (FOLLOWUP_ARRAY_FIELDS.includes(key) ? [] : key === 'coApplicant' ? {} : '')]));
}
