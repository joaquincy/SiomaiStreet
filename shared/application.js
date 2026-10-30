/* ─── Required documents list (must match DocumentUpload.jsx) ─── */
import { FRANCHISE_PACKAGES } from './franchiseCatalogue.js';
export const APPLICATION_DOCUMENTS = [
  { key: 'govIdFront', label: 'Valid Government-Issued ID (Front)', required: true },
  { key: 'govIdBack', label: 'Valid Government-Issued ID (Back)', required: true },
  { key: 'proofOfBilling', label: 'Proof of Billing / Address', required: true },
  { key: 'proofOfFunds', label: 'Proof of Funds (bank certificate or statement)', required: true },
  { key: 'idPhoto', label: '2x2 ID Photo (white background, recent)', required: true },
  { key: 'dtiSecCert', label: 'DTI or SEC Certificate (if business owner)', required: false },
  { key: 'businessPermit', label: 'Business Permit (latest)', required: false },
  { key: 'resumeCv', label: 'Resume or CV', required: false },
  { key: 'characterRef', label: 'Character Reference Letter', required: false },
  { key: 'siteProposal', label: 'Site Proposal or Location Photos', required: false },
];
export const REQUIRED_DOC_KEYS = APPLICATION_DOCUMENTS.filter(doc => doc.required).map(doc => doc.key);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidPhone = (value) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

const isAtLeastAge = (dateOfBirth, minimumAge) => {
  if (!validDate(dateOfBirth)) return false;
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday = today.getMonth() > birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  return age > minimumAge || (age === minimumAge && hasHadBirthday);
};

const hasMinimumWords = (value, minimum) => {
  const words = value?.trim().split(/\s+/).filter(Boolean) || [];
  return words.length >= minimum;
};

const isPositiveCurrency = (value) => {
  const numericValue = parseAmount(value);
  return Number.isFinite(numericValue) && numericValue > 0;
};

/* ─── H2: Per-step validation ─── */
const validateExistingStep = (stepIndex, formData) => {
  const errors = [];
  switch (stepIndex) {
    case 0: // Pre-Qualification
      if (!formData.liquidCapital) errors.push('Available Liquid Capital');
      if (!formData.ownedBusiness) errors.push('Business Ownership');
      if (!formData.franchiseType) errors.push('Franchise Type');
      if (!formData.territory) errors.push('Preferred Territory');
      if (!formData.ownershipIntention) errors.push('Ownership Intention');
      if (!formData.openingTimeline) errors.push('Target Opening Timeline');
      break;
    case 1: // Personal Info
      if (!formData.firstName?.trim()) errors.push('First Name');
      if (!formData.lastName?.trim()) errors.push('Last Name');
      if (!formData.dateOfBirth) errors.push('Date of Birth');
      if (formData.dateOfBirth && !isAtLeastAge(formData.dateOfBirth, 18)) errors.push('Applicant must be at least 18 years old');
      if (!formData.citizenship) errors.push('Citizenship');
      if (!formData.address?.trim()) errors.push('Residential Address');
      if (!formData.primaryPhone?.trim()) errors.push('Primary Phone');
      if (formData.primaryPhone && !isValidPhone(formData.primaryPhone)) errors.push('Valid Primary Phone');
      if (!formData.email?.trim()) errors.push('Email Address');
      if (!formData.confirmEmail?.trim()) errors.push('Confirm Email');
      if (formData.email && !EMAIL_PATTERN.test(formData.email)) errors.push('Valid Email Address');
      if (formData.email && formData.confirmEmail && formData.email.trim().toLowerCase() !== formData.confirmEmail.trim().toLowerCase()) errors.push('Email addresses must match');
      if (!formData.govIdType) errors.push('Government ID Type');
      if (!formData.govIdNumber?.trim()) errors.push('Government ID Number');
      if (!formData.maritalStatus) errors.push('Marital Status');
      if (formData.hasCoApplicant === 'yes') {
        const coApplicant = formData.coApplicant || {};
        if (!coApplicant.firstName?.trim()) errors.push('Co-applicant First Name');
        if (!coApplicant.lastName?.trim()) errors.push('Co-applicant Last Name');
        if (!coApplicant.email?.trim() || !EMAIL_PATTERN.test(coApplicant.email)) errors.push('Valid Co-applicant Email');
        if (!coApplicant.phone?.trim() || !isValidPhone(coApplicant.phone)) errors.push('Valid Co-applicant Phone');
      }
      break;
    case 2: // Business Background — minimal required
      if (formData.employmentHistory !== 'none' && !formData.jobTitle?.trim()) errors.push('Job Title');
      if (formData.employmentHistory !== 'none' && !formData.company?.trim()) errors.push('Company Name');
      if (!formData.currentEmployment && formData.jobStartDate && formData.jobEndDate && formData.jobStartDate > formData.jobEndDate) errors.push('Employment end date must be after start date');
      (formData.additionalPositions || []).forEach((position, index) => {
        if (!position.jobTitle?.trim() || !position.company?.trim()) {
          errors.push(`Job Title and Company Name for additional position ${index + 1}`);
        }
        if (!position.current && position.startDate && position.endDate && position.startDate > position.endDate) {
          errors.push(`Valid dates for additional position ${index + 1}`);
        }
      });
      break;
    case 3: // Financial Capability
      if (!formData.totalLiquidCapital?.trim()) errors.push('Total Liquid Capital');
      if (formData.totalLiquidCapital && !isPositiveCurrency(formData.totalLiquidCapital)) errors.push('Valid Total Liquid Capital');
      if (!formData.investmentSources?.length) errors.push('Source of Investment Funds');
      break;
    case 4: // Brand Alignment
      if (!formData.whyInterested?.trim()) errors.push('Why interested in this franchise');
      if (!formData.personalValues?.trim()) errors.push('Personal values');
      if (!hasMinimumWords(formData.whyInterested, 100)) errors.push('At least 100 words for why you are interested');
      if (!hasMinimumWords(formData.personalValues, 50)) errors.push('At least 50 words about your personal values');
      if (formData.brandValues?.length !== 3) errors.push('Exactly 3 brand values');
      if (!hasMinimumWords(formData.brandValuesExplanation, 100)) errors.push('At least 100 words explaining your brand values');
      if (!formData.discoveryDayInterest) errors.push('Discovery Day preference');
      break;
    case 5: // Franchise Plan
      if (!formData.selectedPackage) errors.push('Franchise Package');
      if (!formData.targetRegion) errors.push('Target Region');
      if (!formData.targetCity?.trim()) errors.push('Target City');
      if (formData.hasSpecificLocation === 'yes' && !formData.siteTypes?.length) errors.push('Proposed Site Type for your identified location');
      if (!formData.hasSpecificLocation) errors.push('Specific Location preference');
      if (!formData.openToAlternative) errors.push('Alternative Location preference');
      if (!formData.planOpeningTimeline) errors.push('Opening Timeline');
      break;
    case 6: { // Document Upload
      const docs = formData.documents || {};
      APPLICATION_DOCUMENTS.filter(doc => doc.required && !docs[doc.key]).forEach(doc => errors.push(`Upload ${doc.label}`));
      break;
    }
    case 7: // Legal Consents
      if (!formData.consent_nda) errors.push('NDA consent');
      if (!formData.consent_backgroundCheck) errors.push('Background Check consent');
      if (!formData.consent_accuracy) errors.push('Accuracy declaration');
      if (!formData.consent_privacy) errors.push('Privacy consent');
      break;
    case 8: // Review & Submit
      if (!formData.checklist_accurate) errors.push('Accuracy confirmation');
      if (!formData.checklist_nda) errors.push('NDA confirmation');
      if (!formData.checklist_documents) errors.push('Documents confirmation');
      if (!formData.checklist_noGuarantee) errors.push('No-guarantee acknowledgment');
      break;
    default:
      break;
  }
  return errors;
};

export const APPLICATION_ENDPOINT = '/api/franchise-applications';
export const CONTRACT_VERSION = 1;
export const DOCUMENT_KEYS = APPLICATION_DOCUMENTS.map(doc => doc.key);
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const documentTypes = key => key === 'idPhoto' ? ['image/jpeg', 'image/png'] : DOCUMENT_TYPES;
export const documentFormatLabel = key => key === 'idPhoto' ? 'JPG or PNG' : 'PDF, JPG or PNG';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fieldsByStep = [
  'liquidCapital ownedBusiness franchiseType territory ownershipIntention openingTimeline',
  'firstName middleName lastName dateOfBirth citizenship address primaryPhone secondaryPhone email confirmEmail govIdType govIdNumber emergencyName emergencyRelationship emergencyPhone hasCoApplicant maritalStatus coApplicant',
  'employmentHistory jobTitle company jobStartDate jobEndDate currentEmployment industry keyResponsibilities additionalPositions priorBusinessOwned priorBusinessDescription foodIndustryExperience largestTeamSize managementYears operationalExperience personallyOperate weeklyHours',
  'totalLiquidCapital investmentSources activeIncome primaryIncomeSource existingDebts neverBankruptcy noPendingCases',
  'whyInterested personalValues brandValues brandValuesExplanation discoveryDayInterest',
  'selectedPackage targetRegion targetCity siteTypes hasSpecificLocation openToAlternative planOpeningTimeline multipleUnits additionalPlanDetails',
  'documents',
  'consent_nda consent_backgroundCheck consent_accuracy consent_privacy',
  'checklist_accurate checklist_nda checklist_documents checklist_noGuarantee',
].map(fields => fields.split(' '));
const booleans = new Set(['currentEmployment', ...fieldsByStep[7], ...fieldsByStep[8]]);
const arrays = new Set(['operationalExperience', 'investmentSources', 'brandValues', 'siteTypes']);
const coFields = ['firstName', 'lastName', 'email', 'phone'];
const positionFields = ['id', 'jobTitle', 'company', 'startDate', 'endDate', 'industry', 'keyResponsibilities'];
const stringsOnly = (value, keys) => Object.fromEntries(keys.filter(key => typeof value?.[key] === 'string').map(key => [key, value[key].slice(0, 20000)]));

// Only known, correctly typed fields can reach React or the persistence layer.
export function sanitizeApplication(input) {
  if (!object(input)) return {};
  const result = {};
  for (const key of fieldsByStep.flat()) {
    const value = input[key];
    if (key === 'documents') {
      result.documents = Object.fromEntries(DOCUMENT_KEYS.filter(k => typeof File !== 'undefined' && input.documents?.[k] instanceof File).map(k => [k, input.documents[k]]));
    } else if (key === 'coApplicant') {
      if (object(value)) result[key] = stringsOnly(value, coFields);
    } else if (key === 'additionalPositions') {
      if (Array.isArray(value)) result[key] = value.slice(0, 20).filter(object).map((position, index) => ({...stringsOnly(position, positionFields), id: typeof position.id === 'string' ? position.id : `restored-${index}`, current: position.current === true}));
    } else if (arrays.has(key)) {
      if (Array.isArray(value)) result[key] = [...new Set(value.filter(v => typeof v === 'string' && v.length <= 100))].slice(0, 30);
    } else if (booleans.has(key)) {
      if (typeof value === 'boolean') result[key] = value;
    } else if (typeof value === 'string') result[key] = value.slice(0, 20000);
  }
  return result;
}

export function parseAmount(value) {
  if (typeof value !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value.trim())) return NaN;
  const number = Number(value.trim().replaceAll(',', ''));
  return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER / 100 ? number : NaN;
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const regions = ['Metro Manila (NCR)', 'Central Luzon', 'CALABARZON', 'Ilocos Region', 'Cagayan Valley', 'Bicol Region', 'Western Visayas', 'Central Visayas', 'Eastern Visayas', 'Zamboanga Peninsula', 'Northern Mindanao', 'Davao Region', 'SOCCSKSARGEN', 'Caraga', 'BARMM', 'CAR (Cordillera)', 'MIMAROPA'];
const choices = {
  liquidCapital: ['below50k','50k-150k','150k-250k','250k-500k','above500k'],
  franchiseType: ['food-cart','kiosk','casual-dining','not-sure'],
  territory: regions, targetRegion: regions,
  ownershipIntention: ['full-time','passive','multi-unit'],
  openingTimeline: ['within-6-months','6-12-months','1-2-years','just-exploring'],
  citizenship: ['Filipino Citizen','Dual Citizen','Foreign National (with Alien Certificate of Registration)','Other'],
  govIdType: ['Passport',"Driver's License",'UMID','PhilID (National ID)','Postal ID',"Voter's ID",'Other'],
  maritalStatus: ['Single','Married','Widowed','Separated','Divorced'],
  managementYears: ['Less than 1 year','1-3 years','3-5 years','5+ years'],
  personallyOperate: ['yes','no','with-manager'], weeklyHours: ['less-than-20','20-40+','full-time'],
  primaryIncomeSource: ['yes','no','one-of-several'],
  discoveryDayInterest: ['yes-definitely','yes-remote','not-now'],
  selectedPackage: [...FRANCHISE_PACKAGES.map(pkg => pkg.id), 'not-sure'],
  employmentHistory: ['provided', 'none'],
  planOpeningTimeline: ['within-3-months','3-6-months','6-12-months','just-planning'], multipleUnits: ['yes','no','maybe'],
  investmentSources: ['personal-savings','bank-loan','family-support','business-partner','other'],
  brandValues: ['Excellence','Customer First','Integrity','Innovation','Community','Consistency'],
  operationalExperience: ['Inventory Management','HR & Staffing','Customer Service','Sales & Marketing','Financial Reporting','Supply Chain','Multi-Site Operations'],
  siteTypes: ['SM Mall','Robinsons Mall','Puregold','Wet Market','Public Market','School','University','Office Building','Hospital','Roadside','Residential Area','Transport Terminal','Others'],
};
for (const key of ['ownedBusiness','hasCoApplicant','priorBusinessOwned','foodIndustryExperience','activeIncome','existingDebts','neverBankruptcy','noPendingCases','hasSpecificLocation','openToAlternative']) choices[key] = ['yes','no'];
const label = key => key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ');

export function validateStep(step, input) {
  if (!fieldsByStep[step] || !object(input)) return ['Application data is invalid.'];
  const data = sanitizeApplication(input);
  const errors = [];
  for (const key of fieldsByStep[step]) {
    const value = input[key];
    if (value === undefined) continue;
    const correctType = key === 'documents' || key === 'coApplicant' ? object(value)
      : arrays.has(key) || key === 'additionalPositions' ? Array.isArray(value)
      : booleans.has(key) ? typeof value === 'boolean' : typeof value === 'string';
    if (!correctType) { errors.push(`Invalid ${label(key)} format`); continue; }
    if (typeof value === 'string' && value.length > 20000) errors.push(`${label(key)} is too long`);
    if (choices[key] && (Array.isArray(value) ? value.some(v => !choices[key].includes(v)) || new Set(value).size !== value.length : value !== '' && !choices[key].includes(value))) errors.push(`Choose a valid ${label(key)}`);
  }
  if (step === 1) {
    for (const field of ['email','confirmEmail']) if (data[field]) data[field] = data[field].trim().toLowerCase();
    for (const field of ['firstName','lastName']) if (data[field]?.trim().length > 100) errors.push(`${label(field)} must be at most 100 characters`);
    if (data.email?.length > 320) errors.push('Email must be at most 320 characters');
    if (data.hasCoApplicant === 'yes') {
      for (const key of coFields) if (input.coApplicant?.[key] !== undefined && typeof input.coApplicant[key] !== 'string') errors.push(`Invalid co-applicant ${label(key)}`);
      if (data.coApplicant?.email) data.coApplicant.email = data.coApplicant.email.trim().toLowerCase();
    }
  }
  if (step === 2) {
    if (data.employmentHistory === 'none' && (data.jobTitle?.trim() || data.company?.trim() || data.jobStartDate || data.jobEndDate || data.currentEmployment || data.industry?.trim() || data.keyResponsibilities?.trim() || data.additionalPositions?.length)) errors.push('Remove employment entries or choose to provide employment history');
    const today = new Date().toISOString().slice(0,10);
    const positions = [{startDate: data.jobStartDate, endDate: data.jobEndDate, current: data.currentEmployment}, ...(data.additionalPositions || [])];
    if (input.additionalPositions && (input.additionalPositions.length > 20 || input.additionalPositions.some(p => !object(p) || positionFields.some(k => p[k] !== undefined && typeof p[k] !== 'string') || (p.current !== undefined && typeof p.current !== 'boolean')))) errors.push('Additional positions contain invalid data (maximum 20)');
    positions.forEach((p,i) => {
      for (const key of ['startDate','endDate']) if (p[key] && (!validDate(p[key]) || p[key] > today)) errors.push(`Position ${i+1}: enter a valid ${key === 'startDate' ? 'start' : 'end'} date, not in the future`);
      if (p.current && p.endDate) errors.push(`Position ${i+1}: current employment cannot have an end date`);
    });
  }
  if (step === 6) {
    for (const [key,file] of Object.entries(input.documents || {})) {
      if (!DOCUMENT_KEYS.includes(key) || !(file instanceof File) || file.size === 0 || file.size > MAX_DOCUMENT_BYTES || !documentTypes(key).includes(file.type)) errors.push(`Invalid document: ${key}. Use a nonempty ${documentFormatLabel(key)} up to 10 MiB.`);
    }
  }
  return [...new Set([...errors, ...validateExistingStep(step, data)])];
}

export function validateApplication(input) {
  return fieldsByStep.flatMap((_, step) => validateStep(step, input).map(message => ({step, message})));
}

export function isValidReceipt(receipt, requestId) {
  return object(receipt) && receipt.version === CONTRACT_VERSION && receipt.id === requestId
    && UUID_PATTERN.test(receipt.id) && receipt.status === 'submitted'
    && typeof receipt.submittedAt === 'string' && Number.isFinite(Date.parse(receipt.submittedAt));
}

