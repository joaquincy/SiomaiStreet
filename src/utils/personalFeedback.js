import { validateStep } from '../../shared/application.js';

const STEP_MAPPINGS = {
  0: [
    [/liquid capital/i, 'pq-liquidCapital'],
    [/business ownership|owned business/i, 'pq-ownedBusiness'],
    [/franchise type/i, 'pq-franchiseType'],
    [/territory/i, 'pq-territory'],
    [/ownership intention/i, 'pq-ownershipIntention'],
    [/opening timeline/i, 'pq-openingTimeline'],
  ],
  1: [
    [/co-applicant first name/i, 'co-firstName'],
    [/co-applicant last name/i, 'co-lastName'],
    [/co-applicant email/i, 'co-email'],
    [/co-applicant phone/i, 'co-phone'],
    [/first name/i, 'pi-firstName'],
    [/last name/i, 'pi-lastName'],
    [/birth|18 years/i, 'pi-dateOfBirth'],
    [/citizenship/i, 'pi-citizenship'],
    [/residential address|invalid address/i, 'pi-address'],
    [/primary phone/i, 'pi-primaryPhone'],
    [/confirm email|addresses must match/i, 'pi-confirmEmail'],
    [/email/i, 'pi-email'],
    [/id type/i, 'pi-govIdType'],
    [/id number/i, 'pi-govIdNumber'],
    [/marital/i, 'pi-maritalStatus'],
  ],
  2: [
    [/remove employment entries|employment history/i, 'bb-employmentHistory'],
    [/additional position (\d+)/i, (match) => `bb-position-${Number(match[1]) - 1}`],
    [/position (\d+)/i, (match) => {
      const posNum = Number(match[1]);
      return posNum === 1 ? 'bb-endDate' : `bb-position-${posNum - 2}`;
    }],
    [/end date must be after start date/i, 'bb-endDate'],
    [/job title/i, 'bb-jobTitle'],
    [/company name/i, 'bb-company'],
  ],
  3: [
    [/liquid capital/i, 'fc-capital'],
    [/source of investment|investment sources/i, 'fc-investmentSources'],
  ],
  4: [
    [/why.*interested/i, 'ba-whyInterested'],
    [/personal values/i, 'ba-personalValues'],
    [/3 brand values|brand values format/i, 'ba-brandValues'],
    [/explaining your brand values|brand values explanation/i, 'ba-explanation'],
    [/discovery day/i, 'ba-discoveryDay'],
  ],
  5: [
    [/franchise package|selected package/i, 'fp-selectedPackage'],
    [/target region/i, 'fp-targetRegion'],
    [/target city/i, 'fp-city'],
    [/site type/i, 'fp-siteTypes'],
    [/specific location/i, 'fp-hasSpecificLocation'],
    [/alternative location|open to alternative/i, 'fp-openToAlternative'],
    [/opening timeline/i, 'fp-planOpeningTimeline'],
  ],
  6: [
    [/govIdFront|ID \(Front\)/i, 'doc-govIdFront'],
    [/govIdBack|ID \(Back\)/i, 'doc-govIdBack'],
    [/proofOfBilling|Proof of Billing/i, 'doc-proofOfBilling'],
    [/proofOfFunds|Proof of Funds/i, 'doc-proofOfFunds'],
    [/idPhoto|2x2 ID Photo/i, 'doc-idPhoto'],
    [/dtiSecCert|DTI or SEC/i, 'doc-dtiSecCert'],
    [/businessPermit|Business Permit/i, 'doc-businessPermit'],
    [/resumeCv|Resume or CV/i, 'doc-resumeCv'],
    [/characterRef|Character Reference/i, 'doc-characterRef'],
    [/siteProposal|Site Proposal/i, 'doc-siteProposal'],
  ],
  7: [
    [/nda/i, 'consent-nda'],
    [/background check/i, 'consent-backgroundCheck'],
    [/accuracy/i, 'consent-accuracy'],
    [/privacy/i, 'consent-privacy'],
  ],
  8: [
    [/accuracy confirmation|checklist_accurate/i, 'checklist-accurate'],
    [/nda confirmation|checklist_nda/i, 'checklist-nda'],
    [/documents confirmation|checklist_documents/i, 'checklist-documents'],
    [/no-guarantee|checklist_noGuarantee/i, 'checklist-noGuarantee'],
  ],
};

const DEFAULT_STEP_ID = {
  0: 'pq-step-title',
  1: 'personal-step-title',
  2: 'bb-step-title',
  3: 'fc-step-title',
  4: 'ba-step-title',
  5: 'fp-step-title',
  6: 'doc-step-title',
  7: 'legal-step-title',
  8: 'review-step-title',
};

export function stepFeedback(stepIndex, data) {
  const rules = STEP_MAPPINGS[stepIndex] || [];
  const fallbackId = DEFAULT_STEP_ID[stepIndex] || 'error-summary-title';

  return validateStep(stepIndex, data).map((message) => {
    for (const [pattern, target] of rules) {
      const match = pattern.exec(message);
      if (match) {
        const id = typeof target === 'function' ? target(match) : target;
        return { message, id };
      }
    }
    return { message, id: fallbackId };
  });
}

export function personalFeedback(data) {
  return stepFeedback(1, data);
}
