import { BiEdit, BiCheckSquare } from 'react-icons/bi';
import './Steps.css';

/* ─── Label/value maps for Pre-Qualification ─── */
const PRE_QUAL_FIELDS = {
  liquidCapital: {
    label: 'Liquid Capital',
    values: { below50k: 'Below ₱50k', '50k-150k': '₱50k – ₱150k', '150k-250k': '₱150k – ₱250k', '250k-500k': '₱250k – ₱500k', above500k: 'Above ₱500k' },
  },
  ownedBusiness: {
    label: 'Owned Business Before',
    values: { yes: 'Yes', no: 'No' },
  },
  franchiseType: {
    label: 'Franchise Type',
    values: { 'food-cart': 'Food Cart', kiosk: 'Kiosk', 'casual-dining': 'Casual Dining', 'not-sure': 'Not Sure Yet' },
  },
  territory: { label: 'Preferred Territory' },
  ownershipIntention: {
    label: 'Ownership Intention',
    values: { 'full-time': 'Full-time Owner-Operator', passive: 'Passive Investor with Manager', 'multi-unit': 'Multi-Unit Developer' },
  },
  openingTimeline: {
    label: 'Opening Timeline',
    values: { 'within-6-months': 'Within 6 months', '6-12-months': '6–12 months', '1-2-years': '1–2 years', 'just-exploring': 'Just exploring' },
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
    fields: ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'citizenship', 'address', 'primaryPhone', 'secondaryPhone', 'email', 'govIdType', 'govIdNumber', 'emergencyName', 'emergencyRelationship', 'emergencyPhone', 'hasCoApplicant', 'maritalStatus'],
  },
  {
    stepIndex: 2,
    title: 'Business Background',
    fields: ['jobTitle', 'company', 'industry', 'managementYears', 'foodIndustryExperience', 'personallyOperate', 'weeklyHours'],
  },
  {
    stepIndex: 3,
    title: 'Financial Capability',
    fields: ['totalLiquidCapital', 'investmentSources', 'activeIncome', 'primaryIncomeSource', 'existingDebts', 'neverBankruptcy', 'noPendingCases'],
  },
  {
    stepIndex: 4,
    title: 'Brand Alignment',
    fields: ['whyInterested', 'personalValues', 'brandValues', 'discoveryDayInterest'],
  },
  {
    stepIndex: 5,
    title: 'Franchise Plan',
    fields: ['selectedPackage', 'targetRegion', 'targetCity', 'siteTypes', 'hasSpecificLocation', 'openToAlternative', 'planOpeningTimeline', 'multipleUnits'],
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
  documents: 'Documents',
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

  // Pre-qualification mapped values
  if (PRE_QUAL_FIELDS[key]?.values) {
    return PRE_QUAL_FIELDS[key].values[value] || value;
  }

  // Boolean-like yes/no
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.join(', ');
  }

  // Documents object
  if (key === 'documents' && typeof value === 'object') {
    const count = Object.keys(value).length;
    return count > 0 ? `${count} file(s) selected` : null;
  }

  // Simple string values with known mappings
  const SIMPLE_MAPS = {
    'food-cart': 'Food Cart',
    kiosk: 'Kiosk',
    'casual-dining': 'Casual Dining',
    'full-time': 'Full-time',
    'with-manager': 'With Manager',
    'less-than-20': 'Less than 20',
    '20-40+': '20–40+',
    'one-of-several': 'One of Several',
    'yes-definitely': 'Yes, definitely',
    'yes-remote': 'Yes, but remotely',
    'not-now': 'Not at this time',
    'within-3-months': 'Within 3 months',
    '3-6-months': '3–6 months',
    '6-12-months': '6–12 months',
    'just-planning': 'Just planning',
    maybe: 'Maybe',
  };

  return SIMPLE_MAPS[value] || String(value);
};

/* ─── Truncate long text for review ─── */
const truncate = (text, max = 120) => {
  if (!text || text.length <= max) return text;
  return text.substring(0, max) + '…';
};

const ReviewSubmit = ({ formData, updateField, onEditStep }) => {
  return (
    <>
      {/* Step Header */}
      <div className="step-intro">
        <div className="step-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', margin: '0 auto 24px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h2 className="step-intro-title">You're Almost There — Review Your Application</h2>
        <p className="step-intro-subtitle">
          Please review all your answers carefully before submitting.
          You can go back to any section to make changes.
        </p>
      </div>

      {/* ─── H3 FIX: Show actual formData for all steps ─── */}
      {REVIEW_SECTIONS.map((section) => (
        <div className="review-section" key={section.title}>
          <div className="review-card">
            <div className="review-card-header no-border">
              <span className="review-card-title">
                {section.title}
              </span>
              <button
                type="button"
                className="review-edit-btn"
                onClick={() => onEditStep(section.stepIndex)}
              >
                <BiEdit /> Edit
              </button>
            </div>
            <div className="review-card-body">
              {section.fields.map((field) => {
                const raw = formData[field];
                const display = formatValue(field, raw);
                const label = FIELD_LABELS[field] || field;
                return (
                  <div className="review-item" key={field}>
                    <span className="review-item-label">{label}</span>
                    <span className={`review-item-value ${!display ? 'empty' : ''}`}>
                      {field === 'whyInterested' || field === 'personalValues'
                        ? truncate(display) || 'Not answered'
                        : display || 'Not answered'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* ─── H4 FIX: Checklist lifted to formData ─── */}
      <div className="form-section mt-4 mb-4">
        <div className="highlight-box">
          <h3 className="section-title mb-3">
            <BiCheckSquare className="section-icon" /> Final Checklist
          </h3>

          <div className="legal-agreements-list">
            <label className="legal-checkbox-label">
              <input
                type="checkbox"
                className="legal-checkbox"
                checked={!!formData.checklist_accurate}
                onChange={(e) => updateField('checklist_accurate', e.target.checked)}
              />
              <span className="legal-checkbox-text">I confirm all information provided is accurate and truthful.</span>
            </label>
            <label className="legal-checkbox-label">
              <input
                type="checkbox"
                className="legal-checkbox"
                checked={!!formData.checklist_nda}
                onChange={(e) => updateField('checklist_nda', e.target.checked)}
              />
              <span className="legal-checkbox-text">I have signed the NDA and background check authorization.</span>
            </label>
            <label className="legal-checkbox-label">
              <input
                type="checkbox"
                className="legal-checkbox"
                checked={!!formData.checklist_documents}
                onChange={(e) => updateField('checklist_documents', e.target.checked)}
              />
              <span className="legal-checkbox-text">I have uploaded all required documents.</span>
            </label>
            <label className="legal-checkbox-label">
              <input
                type="checkbox"
                className="legal-checkbox"
                checked={!!formData.checklist_noGuarantee}
                onChange={(e) => updateField('checklist_noGuarantee', e.target.checked)}
              />
              <span className="legal-checkbox-text">I understand this application does not guarantee approval.</span>
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReviewSubmit;
