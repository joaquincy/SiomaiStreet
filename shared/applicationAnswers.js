import { omitPassportBack } from './applicationDocuments.js';
import { cleanConditionalEvidence } from './documentPolicy.js';
import { PRIVACY_NOTICE_VERSION } from './privacy.js';

// Linked API fields describe one current answer, not an initial and final preference.
// Keep the existing keys for the connected reviewer app.
// Note: territory (Step 1) and targetRegion (Step 6) are validated for consistency
// rather than silently overwriting each other when changed to different regions.
const linkedFields = [
  ['ownedBusiness', 'priorBusinessOwned'],
  ['franchiseType', 'selectedPackage'],
];
const draftLinkedFields = [
  ...linkedFields,
  ['territory', 'targetRegion'],
];

export const CAPITAL_OPTIONS = [
  { value: 'below50k', label: 'Below ₱50k' },
  { value: '50k-150k', label: '₱50k to ₱150k' },
  { value: '150k-250k', label: 'Above ₱150k to ₱250k' },
  { value: '250k-500k', label: 'Above ₱250k to ₱500k' },
  { value: 'above500k', label: 'Above ₱500k' },
];

export const OPENING_TIMELINE_OPTIONS = [
  { value: 'within-6-months', label: 'Within 6 months' },
  { value: '6-12-months', label: '6 to 12 months' },
  { value: '1-2-years', label: '1 to 2 years' },
  { value: 'just-exploring', label: 'Just exploring' },
];

export const PLAN_TIMELINE_LABELS = {
  'within-3-months': 'Within 3 months',
  '3-6-months': '3 to 6 months',
  '6-12-months': '6 to 12 months',
  '1-2-years': '1 to 2 years',
  'just-planning': 'Just exploring',
};

const openingForPlan = {
  'within-3-months': 'within-6-months',
  '3-6-months': 'within-6-months',
  '6-12-months': '6-12-months',
  '1-2-years': '1-2-years',
  'just-planning': 'just-exploring',
};
const planForOpening = {
  'within-6-months': '', // Ask for the more specific timing in the location plan.
  '6-12-months': '6-12-months',
  '1-2-years': '1-2-years',
  'just-exploring': 'just-planning',
};

export function parseAmount(value) {
  if (typeof value !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value.trim())) return NaN;
  const number = Number(value.trim().replaceAll(',', ''));
  return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER / 100 ? number : NaN;
}

export function capitalRangeFor(value) {
  const amount = parseAmount(value);
  if (!Number.isFinite(amount) || amount < 0) return '';
  if (amount < 50000) return 'below50k';
  if (amount <= 150000) return '50k-150k';
  if (amount <= 250000) return '150k-250k';
  if (amount <= 500000) return '250k-500k';
  return 'above500k';
}

export function capitalRangeLabel(value) {
  return CAPITAL_OPTIONS.find(option => option.value === value)?.label || 'Not answered';
}

export function openingTimelineLabel(value) {
  return OPENING_TIMELINE_OPTIONS.find(option => option.value === value)?.label || 'Not answered';
}

const omitInactiveCoApplicant = data => {
  if (data.hasCoApplicant !== 'yes') delete data.coApplicant;
  return data;
};

const omitInactiveAnswers = data => {
  omitInactiveCoApplicant(data);
  if (data.documents) data.documents = omitPassportBack(data.documents, data.govIdType);
  return cleanConditionalEvidence(data);
};

// Only an explicit edit reconciles existing conflicting answers. Never guess an amount.
export function updateApplicationAnswer(previous, field, value) {
  const next = { ...previous, [field]: value };
  if (field === 'consent_privacy') {
    if (value === true) next.privacyNoticeVersion = PRIVACY_NOTICE_VERSION;
    else delete next.privacyNoticeVersion;
  }
  const pair = linkedFields.find(fields => fields.includes(field));
  if (pair) for (const key of pair) next[key] = value;
  if (field === 'territory' && !previous.targetRegion) next.targetRegion = value;
  if (field === 'targetRegion' && !previous.territory) next.territory = value;
  if (field === 'totalLiquidCapital') {
    const range = capitalRangeFor(value);
    if (range) next.liquidCapital = range;
  }
  if (field === 'openingTimeline' && openingForPlan[next.planOpeningTimeline] !== value) {
    next.planOpeningTimeline = planForOpening[value] ?? '';
  }
  if (field === 'planOpeningTimeline' && Object.hasOwn(openingForPlan, value)) {
    next.openingTimeline = openingForPlan[value];
  }
  return omitInactiveAnswers(next);
}

// Restore partial older drafts without choosing between two populated, conflicting values.
// Server validation deliberately does not call this helper: API conflicts must be rejected.
export function restoreApplicationAnswers(data) {
  const next = { ...data };
  for (const [first, second] of draftLinkedFields) {
    if (!next[first] && next[second]) next[first] = next[second];
    if (!next[second] && next[first]) next[second] = next[first];
  }
  if (!next.liquidCapital && next.totalLiquidCapital) next.liquidCapital = capitalRangeFor(next.totalLiquidCapital);
  if (!next.openingTimeline && Object.hasOwn(openingForPlan, next.planOpeningTimeline)) {
    next.openingTimeline = openingForPlan[next.planOpeningTimeline];
  }
  if (!next.planOpeningTimeline && Object.hasOwn(planForOpening, next.openingTimeline)) {
    next.planOpeningTimeline = planForOpening[next.openingTimeline];
  }
  return omitInactiveAnswers(next);
}

export function applicationAnswerConflicts(data) {
  const conflicts = [];
  const add = (step, id, message) => conflicts.push({ step, id, message });
  const range = capitalRangeFor(data.totalLiquidCapital);
  if (data.liquidCapital && range && range !== data.liquidCapital) {
    add(3, 'fc-capital', `Liquid capital conflicts with the range saved in Step 1 (${capitalRangeLabel(data.liquidCapital)}). Confirm your current amount here to update that range.`);
  }
  if (data.ownedBusiness && data.priorBusinessOwned && data.ownedBusiness !== data.priorBusinessOwned) {
    add(2, 'bb-priorBusinessOwned', 'Business ownership answers differ in this draft. Confirm your current answer in Step 1.');
  }
  if (data.franchiseType && data.selectedPackage && data.franchiseType !== data.selectedPackage) {
    add(5, 'fp-selectedPackage', 'Franchise package differs from the format saved in Step 1. Confirm or change your current format.');
  }
  if (data.territory && data.targetRegion && data.territory !== data.targetRegion) {
    add(5, 'fp-targetRegion', 'Target region differs from the territory saved in Step 1. Choose your current region here to update both answers.');
  }
  if (data.openingTimeline && Object.hasOwn(openingForPlan, data.planOpeningTimeline) && openingForPlan[data.planOpeningTimeline] !== data.openingTimeline) {
    add(5, 'fp-planOpeningTimeline', 'Opening timeline differs from the answer saved in Step 1. Choose your current timing here to update both answers.');
  }
  return conflicts;
}
