// Only ordinary, scalar applicant answers. Staff-only state and recovery email
// cannot be edited through a targeted correction request.
export const CORRECTION_FIELDS = {
  firstName: 'identity', middleName: 'identity', lastName: 'identity', address: 'identity',
  govIdNumber: 'identity', govIdReviewReason: 'identity',
  primaryPhone: 'contact', secondaryPhone: 'contact',
  targetCity: 'plan', additionalPlanDetails: 'plan', pendingFundingDetails: 'funding',
};
export const FIELD_CORRECTION_STATES = { open: 'Correction requested', received: 'Response received', changes_needed: 'Changes needed', resolved: 'Reviewer confirmed' };
