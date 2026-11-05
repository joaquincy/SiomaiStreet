import { canDeferFundsEvidence } from './documentPolicy.js';

export const APPLICATION_DOCUMENTS = [
  { key: 'govIdFront', label: 'Valid Government-Issued ID (Front)', required: true },
  { key: 'govIdBack', label: 'Valid Government-Issued ID (Back)', required: true },
  { key: 'proofOfBilling', label: 'Proof of Billing / Address', required: true },
  { key: 'proofOfFunds', label: 'Funding evidence', required: true },
  { key: 'idPhoto', label: '2x2 ID Photo (white background, current appearance)', required: true },
  { key: 'dtiSecCert', label: 'DTI or SEC Certificate (if business owner)', required: false },
  { key: 'businessPermit', label: 'Business Permit (latest)', required: false },
  { key: 'resumeCv', label: 'Resume or CV', required: false },
  { key: 'characterRef', label: 'Character Reference Letter', required: false },
  { key: 'siteProposal', label: 'Site Proposal or Location Photos', required: false },
];

// These are the default requirements before an ID type is selected.
// Applicant-specific checks must use getApplicationDocuments instead.
export const REQUIRED_DOC_KEYS = APPLICATION_DOCUMENTS.filter(doc => doc.required).map(doc => doc.key);

export function getApplicationDocuments(formData = {}) {
  return APPLICATION_DOCUMENTS.filter(doc => doc.key !== 'govIdBack' || formData.govIdType !== 'Passport').map(doc => {
    if (doc.key === 'govIdFront' && formData.govIdType === 'Passport') return { ...doc, label: 'Passport identity page' };
    if (doc.key === 'proofOfFunds' && canDeferFundsEvidence(formData)) return { ...doc, required: false, deferred: true };
    return doc;
  });
}

// A previously selected ID back must not become a hidden attachment after switching to Passport.
// Return the original object when unchanged so draft persistence does not rewrite every file.
export function omitPassportBack(documents, govIdType) {
  if (govIdType !== 'Passport' || !documents || !Object.hasOwn(documents, 'govIdBack')) return documents;
  const selected = { ...documents };
  delete selected.govIdBack;
  return selected;
}
