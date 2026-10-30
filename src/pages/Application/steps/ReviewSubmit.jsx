import { BiEdit, BiCheckSquare, BiCheckCircle, BiErrorCircle } from 'react-icons/bi';
import './Steps.css';
import { APPLICATION_DOCUMENTS, validateStep } from '../../../../shared/application.js';
import { FRANCHISE_PACKAGES, PRICING_NOTICE } from '../../../../shared/franchiseCatalogue.js';
import { RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';

/* ─── Label/value maps for Pre-Qualification ─── */
const PRE_QUAL_FIELDS = {
  liquidCapital: {
    label: 'Liquid Capital',
    values: {
      below50k: 'Below ₱50k',
      '50k-150k': '₱50k to ₱150k',
      '150k-250k': '₱150k to ₱250k',
      '250k-500k': '₱250k to ₱500k',
      above500k: 'Above ₱500k',
    },
  },
  ownedBusiness: {
    label: 'Owned Business Before',
    values: { yes: 'Yes', no: 'No' },
  },
  franchiseType: {
    label: 'Franchise Type',
    values: {
      'food-cart': 'Food Cart',
      kiosk: 'Kiosk',
      'casual-dining': 'Casual Dining',
      'not-sure': 'Not Sure Yet',
    },
  },
  territory: { label: 'Preferred Territory' },
  ownershipIntention: {
    label: 'Ownership Intention',
    values: {
      'full-time': 'Full-time Owner-Operator',
      passive: 'Passive Investor with Manager',
      'multi-unit': 'Multi-Unit Developer',
    },
  },
  openingTimeline: {
    label: 'Opening Timeline',
    values: {
      'within-6-months': 'Within 6 months',
      '6-12-months': '6 to 12 months',
      '1-2-years': '1 to 2 years',
      'just-exploring': 'Just exploring',
    },
  },
};

/* ─── Review sections config ─── */
const REVIEW_SECTIONS = [
  {
    stepIndex: 0,
    title: 'Pre-Qualification',
    fields: Object.keys(PRE_QUAL_FIELDS),
  },
  {
    stepIndex: 1,
    title: 'Personal Info',
    fields: [
      'firstName', 'middleName', 'lastName', 'dateOfBirth', 'citizenship',
      'address', 'primaryPhone', 'secondaryPhone', 'email', 'govIdType',
      'govIdNumber', 'emergencyName', 'emergencyRelationship', 'emergencyPhone',
      'hasCoApplicant', 'coApplicant', 'maritalStatus',
    ],
  },
  {
    stepIndex: 2,
    title: 'Business Background',
    fields: [
      'employmentHistory', 'jobTitle', 'company', 'jobStartDate', 'jobEndDate',
      'currentEmployment', 'industry', 'keyResponsibilities', 'additionalPositions',
      'priorBusinessOwned', 'priorBusinessDescription', 'largestTeamSize',
      'operationalExperience', 'managementYears', 'foodIndustryExperience',
      'personallyOperate', 'weeklyHours',
    ],
  },
  {
    stepIndex: 3,
    title: 'Financial Capability',
    fields: [
      'totalLiquidCapital', 'investmentSources', 'activeIncome',
      'primaryIncomeSource', 'existingDebts', 'neverBankruptcy', 'noPendingCases',
    ],
  },
  {
    stepIndex: 4,
    title: 'Brand Alignment',
    fields: [
      'whyInterested', 'personalValues', 'brandValues',
      'brandValuesExplanation', 'discoveryDayInterest',
    ],
  },
  {
    stepIndex: 5,
    title: 'Franchise Plan',
    fields: [
      'selectedPackage', 'targetRegion', 'targetCity', 'siteTypes',
      'hasSpecificLocation', 'openToAlternative', 'planOpeningTimeline',
      'multipleUnits', 'additionalPlanDetails',
    ],
  },
  {
    stepIndex: 6,
    title: 'Document Upload',
    fields: ['documents'],
  },
  {
    stepIndex: 7,
    title: 'Legal & Consents',
    fields: ['consent_nda', 'consent_backgroundCheck', 'consent_accuracy', 'consent_privacy'],
  },
];

/* ─── Human-readable field labels ─── */
const FIELD_LABELS = {
  employmentHistory: 'Employment History',
  priorBusinessOwned: 'Prior Business Ownership',
  priorBusinessDescription: 'Prior Business Details',
  largestTeamSize: 'Largest Team Managed',
  operationalExperience: 'Operational Experience',
  brandValuesExplanation: 'Brand Values Explanation',
  additionalPlanDetails: 'Additional Franchise Plans',
  coApplicant: 'Co-applicant Details',
  jobStartDate: 'Employment Start Date',
  jobEndDate: 'Employment End Date',
  currentEmployment: 'Currently Employed Here',
  keyResponsibilities: 'Key Responsibilities',
  additionalPositions: 'Additional Positions',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  dateOfBirth: 'Date of Birth',
  citizenship: 'Citizenship',
  address: 'Address',
  primaryPhone: 'Primary Phone',
  secondaryPhone: 'Secondary Phone',
  email: 'Email',
  govIdType: 'Gov ID Type',
  govIdNumber: 'Gov ID Number',
  emergencyName: 'Emergency Contact',
  emergencyRelationship: 'Emergency Relationship',
  emergencyPhone: 'Emergency Phone',
  hasCoApplicant: 'Co-Applicant',
  maritalStatus: 'Marital Status',
  jobTitle: 'Job Title',
  company: 'Company',
  industry: 'Industry',
  managementYears: 'Management Experience',
  foodIndustryExperience: 'Food Industry Exp.',
  personallyOperate: 'Personally Operate',
  weeklyHours: 'Weekly Hours',
  totalLiquidCapital: 'Liquid Capital',
  investmentSources: 'Investment Sources',
  activeIncome: 'Active Income',
  primaryIncomeSource: 'Primary Income Source',
  existingDebts: 'Existing Debts',
  neverBankruptcy: 'No Bankruptcy',
  noPendingCases: 'No Pending Cases',
  whyInterested: 'Why Interested',
  personalValues: 'Personal Values',
  brandValues: 'Brand Values',
  discoveryDayInterest: 'Discovery Day',
  selectedPackage: 'Package',
  targetRegion: 'Target Region',
  targetCity: 'Target City',
  siteTypes: 'Site Types',
  hasSpecificLocation: 'Has Location',
  openToAlternative: 'Open to Alternative',
  planOpeningTimeline: 'Opening Timeline',
  multipleUnits: 'Multiple Units',
  documents: 'Documents (Selected on Device)',
  consent_nda: 'NDA',
  consent_backgroundCheck: 'Background Check',
  consent_accuracy: 'Accuracy Declaration',
  consent_privacy: 'Privacy Consent',
  ...Object.fromEntries(
    Object.entries(PRE_QUAL_FIELDS).map(([k, v]) => [k, v.label])
  ),
};

/* ─── Format a value for display ─── */
const formatValue = (key, value) => {
  if (value === undefined || value === null || value === '') return null;
  if (key === 'employmentHistory') return value === 'none' ? 'No employment history' : 'History provided';
  if (key === 'selectedPackage') {
    return `${FRANCHISE_PACKAGES.find((pkg) => pkg.id === value)?.name || 'Not sure yet'}; ${PRICING_NOTICE}`;
  }
  if (key === 'coApplicant') {
    return ['firstName', 'lastName', 'email', 'phone']
      .map((field) => `${field}: ${value[field] || 'Not answered'}`)
      .join('; ');
  }
  if (key === 'additionalPositions') {
    return value
      .map(
        (position, index) =>
          `Position ${index + 1}: ${position.jobTitle || 'Not answered'}, ${position.company || 'Not answered'}; ${position.startDate || 'No start date'} to ${position.current ? 'Present' : position.endDate || 'No end date'}; Industry: ${position.industry || 'Not answered'}; Responsibilities: ${position.keyResponsibilities || 'Not answered'}`
      )
      .join(' | ');
  }

  if (PRE_QUAL_FIELDS[key]?.values) {
    return PRE_QUAL_FIELDS[key].values[value] || value;
  }

  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.join(', ');
  }

  if (key === 'documents' && typeof value === 'object') {
    return (
      APPLICATION_DOCUMENTS.filter((doc) => value[doc.key])
        .map((doc) => `${doc.label}: ${value[doc.key].name}`)
        .join('; ') || null
    );
  }

  const SIMPLE_MAPS = {
    'food-cart': 'Food Cart',
    kiosk: 'Kiosk',
    'casual-dining': 'Casual Dining',
    'full-time': 'Full-time',
    'with-manager': 'With Manager',
    'less-than-20': 'Less than 20',
    '20-40+': '20 to 40+',
    'one-of-several': 'One of Several',
    'yes-definitely': 'Yes, definitely',
    'yes-remote': 'Yes, but remotely',
    'not-now': 'Not at this time',
    'within-3-months': 'Within 3 months',
    '3-6-months': '3 to 6 months',
    '6-12-months': '6 to 12 months',
    'just-planning': 'Just planning',
    maybe: 'Maybe',
  };

  return SIMPLE_MAPS[value] || String(value);
};

const CHECKLIST_ITEMS = [
  {
    id: 'checklist-accurate',
    field: 'checklist_accurate',
    text: 'I confirm all information provided is accurate and truthful.',
  },
  {
    id: 'checklist-nda',
    field: 'checklist_nda',
    text: 'I have reviewed and selected the NDA and background-check acknowledgments in the previous step.',
  },
  {
    id: 'checklist-documents',
    field: 'checklist_documents',
    text: 'I have selected all required documents for submission.',
  },
  {
    id: 'checklist-noGuarantee',
    field: 'checklist_noGuarantee',
    text: 'I understand this application does not guarantee approval.',
  },
];

const ReviewSubmit = ({ formData, updateField, onEditStep }) => {
  const feedback = useApplicationFeedback();

  return (
    <div className="step-content">
      {/* Step Header */}
      <header className="step-intro">
        <div className="step-intro-icon red" aria-hidden="true">
          <BiCheckSquare />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 09 · Final Verification &amp; Submission</span>
          <h2 id="review-step-title" tabIndex={-1} className="step-intro-title">
            You Are Almost There: <span className="title-highlight">Review Your Application</span>
          </h2>
          <p className="step-intro-subtitle">
            Review every section below before submitting. Use the <strong>Edit</strong> button on any section to update an answer and return directly to this review.
          </p>
        </div>
      </header>

      {/* Review Sections */}
      <div className="review-sections-stack">
        {REVIEW_SECTIONS.map((section) => {
          const sectionIssues = validateStep(section.stepIndex, formData);
          const isComplete = sectionIssues.length === 0;

          return (
            <section className="review-section" key={section.title}>
              <div className={`review-card ${!isComplete ? 'review-card-attention' : ''}`}>
                <div className="review-card-header">
                  <div className="review-card-title-group">
                    <span className="review-step-number" aria-hidden="true">
                      {section.stepIndex + 1}
                    </span>
                    <h3 className="review-card-title">{section.title}</h3>
                    <span className={`review-status-pill ${isComplete ? 'complete' : 'attention'}`}>
                      {isComplete ? (
                        <>
                          <BiCheckCircle aria-hidden="true" />
                          <span>Complete</span>
                        </>
                      ) : (
                        <>
                          <BiErrorCircle aria-hidden="true" />
                          <span>Needs attention ({sectionIssues.length})</span>
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="review-edit-btn"
                    aria-label={`Edit ${section.title}`}
                    onClick={() => onEditStep(section.stepIndex)}
                  >
                    <BiEdit aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                </div>

                {!isComplete && (
                  <div className="review-missing-notice" role="status">
                    <strong>Needs attention before submitting:</strong>
                    <ul>
                      {sectionIssues.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="review-card-body">
                  {section.fields.map((field) => {
                    if (field === 'coApplicant' && formData.hasCoApplicant !== 'yes') return null;
                    if (
                      formData.employmentHistory === 'none' &&
                      [
                        'jobTitle', 'company', 'jobStartDate', 'jobEndDate',
                        'currentEmployment', 'industry', 'keyResponsibilities', 'additionalPositions',
                      ].includes(field)
                    ) {
                      return null;
                    }
                    const raw = formData[field];
                    const display = formatValue(field, raw);
                    const label = FIELD_LABELS[field] || field;
                    return (
                      <div className="review-item" key={field}>
                        <span className="review-item-label">{label}</span>
                        <span className={`review-item-value ${!display ? 'empty' : ''}`}>
                          {display || 'Not answered'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Final Checklist */}
      <section className="form-section">
        <div className="final-checklist-card">
          <div className="final-checklist-header">
            <h3 className="section-title">
              <BiCheckSquare className="section-icon" aria-hidden="true" />
              <span>Final Submission Checklist</span>
            </h3>
            <RequirementBadge required />
          </div>
          <p className="field-help">
            All four confirmations are required to submit your application to the server.
          </p>

          <div className="legal-agreements-list">
            {CHECKLIST_ITEMS.map(({ id, field, text }) => {
              const itemErrors = feedback.errorsFor(id);
              return (
                <div key={id} className={`checklist-item-row ${itemErrors.length ? 'has-errors' : ''}`}>
                  <label className="legal-checkbox-label" htmlFor={id}>
                    <input
                      id={id}
                      type="checkbox"
                      className="legal-checkbox"
                      checked={!!formData[field]}
                      aria-required="true"
                      aria-invalid={itemErrors.length > 0}
                      onChange={(e) => updateField(field, e.target.checked)}
                    />
                    <span className="legal-checkbox-text">{text}</span>
                  </label>
                  <FieldErrorList id={id} errors={itemErrors} />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReviewSubmit;
