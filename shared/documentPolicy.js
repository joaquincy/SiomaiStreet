export const DOCUMENT_POLICY_VERSION = '2026-11-04.1';
export const FUNDING_STATUS_OPTIONS = [
  { value: 'available', label: 'All planned funding is available now' },
  { value: 'partly-pending', label: 'Some is available; some is still pending' },
  { value: 'pending', label: 'Funding is pending; none is available yet' },
];
export const ADDRESS_EVIDENCE_OPTIONS = [
  { value: 'bill-self', label: 'Utility bill in my name' },
  { value: 'bill-household', label: 'Utility bill in a parent’s or spouse’s name' },
  { value: 'bill-landlord', label: 'Utility bill in my landlord’s name' },
  { value: 'lease', label: 'Lease or tenancy agreement' },
  { value: 'address-certificate', label: 'Official address or residency certificate' },
  { value: 'other', label: 'Another address document for review' },
];
export const FUNDS_EVIDENCE_OPTIONS = [
  { value: 'bank-certificate', label: 'Bank certificate' },
  { value: 'statement-balance', label: 'Relevant balance page of a statement' },
  { value: 'loan-approval', label: 'Financing approval or offer' },
  { value: 'partner-commitment', label: 'Partner or family funding commitment' },
  { value: 'pending-evidence', label: 'Evidence is not available yet; funding is pending' },
  { value: 'other', label: 'Another funding document for review' },
];
export const hasPendingFunding = data => ['partly-pending', 'pending'].includes(data.fundingStatus);
export const canDeferFundsEvidence = data => hasPendingFunding(data) && data.fundsEvidenceType === 'pending-evidence';
export const needsAddressExplanation = data => ['bill-household', 'bill-landlord', 'other'].includes(data.addressEvidenceType);
export const DOCUMENT_RECENCY_NOTICE = 'No fixed document-age limit has been approved. Keep the issue date or statement period visible. A reviewer may request updated evidence with a reason; the form does not reject a file solely because of its age.';
export const DOCUMENT_REDACTION_NOTICE = 'You may permanently redact full account numbers, unrelated transactions, usage details and unrelated personal information. Keep the issuer, relevant holder name, date or period, and the address, balance or commitment needed for review visible. Never change these facts. Do not upload passwords, PINs or one-time codes.';

// These alternatives are accepted for submission and manual review, not automatic approval.
// No unapproved document-age window is inferred here.
export const DOCUMENT_POLICY = {
  govIdFront: { purpose: 'Identify the applicant.', stage: 'Application; identity checked during review.', pages: 'Front of the selected ID, or passport photo/identity page only. Keep name, photo, ID number, issuer and any validity details visible.', alternatives: 'For Other ID, identify its name and issuing authority in Step 2. A reviewer must assess it; selecting Other is not automatic acceptance.' },
  govIdBack: { purpose: 'Read relevant details printed on the reverse of the selected ID.', stage: 'Application for non-Passport IDs.', pages: 'Back of the same ID. No passport cover or blank page is needed.', alternatives: 'Passport requires no back image. Do not substitute another person’s document.' },
  proofOfBilling: { purpose: 'Link the applicant to their declared residential address.', stage: 'Application evidence; reviewer checks the address and any name mismatch.', pages: 'Only pages showing issuer, holder/occupant, residential address and issue date or period. For a lease, include the relevant parties, property and effective term; do not add unrelated pages.', alternatives: 'A parent/spouse/landlord bill with an explanation, a lease, or an official address certificate may be submitted for review. Do not upload that person’s ID. Another document needs an explanation and reviewer assessment.' },
  proofOfFunds: { purpose: 'Distinguish available funds from proposed or conditional financing.', stage: 'Application if evidence exists. Pending evidence can follow through a private reviewer request; funding must be verified before approval.', pages: 'Bank certificate or balance summary showing holder, issuer, date/period and relevant available balance. For financing or a commitment, include only relevant amount, parties, conditions and release status. Transaction history and full account numbers are not requested.', alternatives: 'Financing approvals and partner/family commitments can document a plan, but are not released cash. Explain pending funding in Step 4. If evidence is not yet available, choose that option rather than uploading a dummy file.' },
  idPhoto: { purpose: 'Match the applicant’s appearance to the identity evidence.', stage: 'Application.', pages: 'One portrait against a plain white background that reflects your current appearance.', alternatives: 'An image file is required; no arbitrary age cutoff is imposed.' },
  dtiSecCert: { purpose: 'Review an existing business registration, if relevant.', stage: 'Optional at application; additional verification only if requested.', pages: 'Relevant registration pages showing entity, issuer, registration number and dates.', alternatives: 'DTI or SEC registration as applicable. Individuals without a registered business need not invent one.' },
  businessPermit: { purpose: 'Review an existing business permit, if relevant.', stage: 'Optional at application; site-specific permits belong to later verification/onboarding.', pages: 'Relevant permit page showing business, location, issuer and validity period.', alternatives: 'No existing business means this optional upload is not needed.' },
  resumeCv: { purpose: 'Understand relevant employment or business experience.', stage: 'Optional at application.', pages: 'Relevant experience pages only; omit unrelated sensitive information and third-party contacts.', alternatives: 'The structured experience answers can be used; no CV is required.' },
  characterRef: { purpose: 'Provide an optional professional reference relevant to the application.', stage: 'Optional now; contact or additional checks require a specific reviewer purpose.', pages: 'Relevant reference letter only. Do not include third-party IDs or unrelated personal records.', alternatives: 'No reference letter is required at initial application.' },
  siteProposal: { purpose: 'Assess an identified potential site.', stage: 'Optional at application; later site verification/onboarding as requested.', pages: 'Relevant site photos, layout or proposal. Avoid identifiable bystanders and unrelated properties.', alternatives: 'Applicants still scouting a site can leave this empty.' },
};

export function cleanConditionalEvidence(data) {
  const next = { ...data };
  if (next.govIdType !== 'Other') { delete next.govIdOtherName; delete next.govIdOtherIssuer; }
  if (!['PhilID (National ID)', 'UMID'].includes(next.govIdType)) delete next.govIdReviewReason;
  if (!hasPendingFunding(next)) delete next.pendingFundingDetails;
  if (!needsAddressExplanation(next)) delete next.addressEvidenceDetails;
  if (next.fundsEvidenceType !== 'other') delete next.fundsEvidenceDetails;
  return next;
}
