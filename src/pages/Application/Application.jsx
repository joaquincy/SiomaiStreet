import { useState, useEffect, useRef, Fragment } from 'react';
import { HiOutlineCheck } from 'react-icons/hi';
import useScrollReveal from '../../hooks/useScrollReveal';
import { APPLICATION_STEPS } from '../../data/stepsConfig';
import HelperSidebar from '../../components/HelperSidebar';
import StepNav from '../../components/StepNav';
import PreQualification from './steps/PreQualification';
import PersonalInfo from './steps/PersonalInfo';
import BusinessBackground from './steps/BusinessBackground';
import FinancialCapability from './steps/FinancialCapability';
import BrandAlignment from './steps/BrandAlignment';
import FranchisePlan from './steps/FranchisePlan';
import DocumentUpload from './steps/DocumentUpload';
import LegalConsents from './steps/LegalConsents';
import PlaceholderStep from './steps/PlaceholderStep';
import ReviewSubmit from './steps/ReviewSubmit';
import './Application.css';

/* ─── Sub-navigation tab config ─── */
const SUB_NAV_TABS = [
  { id: 'apply', label: 'Submit Application', active: true },
  { id: 'track', label: 'Track Status', disabled: true },
  { id: 'onboard', label: 'Onboarding', disabled: true },
];

/* ─── Required documents list (must match DocumentUpload.jsx) ─── */
const REQUIRED_DOC_KEYS = ['govIdFront', 'govIdBack', 'proofOfBilling', 'proofOfFunds', 'idPhoto'];

/* ─── H2: Per-step validation ─── */
const validateStep = (stepIndex, formData) => {
  const errors = [];
  switch (stepIndex) {
    case 0: // Pre-Qualification
      if (!formData.liquidCapital) errors.push('Available Liquid Capital');
      if (!formData.ownedBusiness) errors.push('Business Ownership');
      if (!formData.franchiseType) errors.push('Franchise Type');
      if (!formData.territory) errors.push('Preferred Territory');
      if (!formData.ownershipIntention) errors.push('Ownership Intention');
      break;
    case 1: // Personal Info
      if (!formData.firstName?.trim()) errors.push('First Name');
      if (!formData.lastName?.trim()) errors.push('Last Name');
      if (!formData.dateOfBirth) errors.push('Date of Birth');
      if (!formData.citizenship) errors.push('Citizenship');
      if (!formData.address?.trim()) errors.push('Residential Address');
      if (!formData.primaryPhone?.trim()) errors.push('Primary Phone');
      if (!formData.email?.trim()) errors.push('Email Address');
      if (!formData.confirmEmail?.trim()) errors.push('Confirm Email');
      if (formData.email && formData.confirmEmail && formData.email !== formData.confirmEmail) errors.push('Email addresses must match');
      if (!formData.govIdType) errors.push('Government ID Type');
      if (!formData.govIdNumber?.trim()) errors.push('Government ID Number');
      if (!formData.maritalStatus) errors.push('Marital Status');
      break;
    case 2: // Business Background — minimal required
      if (!formData.jobTitle?.trim()) errors.push('Job Title');
      if (!formData.company?.trim()) errors.push('Company Name');
      break;
    case 3: // Financial Capability
      if (!formData.totalLiquidCapital?.trim()) errors.push('Total Liquid Capital');
      if (!formData.investmentSources?.length) errors.push('Source of Investment Funds');
      break;
    case 4: // Brand Alignment
      if (!formData.whyInterested?.trim()) errors.push('Why interested in this franchise');
      if (!formData.personalValues?.trim()) errors.push('Personal values');
      break;
    case 5: // Franchise Plan
      if (!formData.selectedPackage) errors.push('Franchise Package');
      if (!formData.targetRegion) errors.push('Target Region');
      if (!formData.targetCity?.trim()) errors.push('Target City');
      if (!formData.planOpeningTimeline) errors.push('Opening Timeline');
      break;
    case 6: { // Document Upload
      const docs = formData.documents || {};
      const missing = REQUIRED_DOC_KEYS.filter((k) => !docs[k]);
      if (missing.length > 0) errors.push(`${missing.length} required document(s)`);
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

const ApplicationPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [stepErrors, setStepErrors] = useState([]);
  const stepperTrackRef = useRef(null);

  useScrollReveal();

  /* ─── H5 FIX: Progress starts at 0%, not 11% ─── */
  const progress = Math.round((currentStep / APPLICATION_STEPS.length) * 100);
  const currentStepConfig = APPLICATION_STEPS[currentStep];
  const nextStepLabel =
    currentStep < APPLICATION_STEPS.length - 1
      ? `Continue to ${APPLICATION_STEPS[currentStep + 1].label}`
      : 'Submit Application';

  /* ─── Form helpers ─── */
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user makes changes
    if (stepErrors.length > 0) setStepErrors([]);
  };

  const goToStep = (index) => {
    if (index < 0 || index >= APPLICATION_STEPS.length) return;
    setCurrentStep(index);
    setStepErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ─── H2: Validate before advancing ─── */
  const handleNext = async () => {
    const errors = validateStep(currentStep, formData);
    if (errors.length > 0) {
      setStepErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === APPLICATION_STEPS.length - 1) {
      setSubmitting(true);
      setSubmitError('');
      try {
        const payload = { ...formData };
        const documents = payload.documents || {};
        delete payload.documents;
        const body = new FormData();
        body.append('applicationData', JSON.stringify(payload));
        for (const [key, file] of Object.entries(documents)) {
          if (file instanceof File) body.append(key, file, file.name);
        }
        const response = await fetch('/api/franchise-applications', { method: 'POST', body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Your application could not be submitted. Please try again.');
        setSubmissionId(result.id || '');
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        setSubmitError(error.message || 'Your application could not be submitted. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    goToStep(currentStep + 1);
  };

  const handleBack = () => goToStep(currentStep - 1);

  /* ─── Auto-scroll active stepper step into view (mobile) ─── */
  useEffect(() => {
    const track = stepperTrackRef.current;
    if (track) {
      const activeEl = track.querySelector('.stepper-step.current');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentStep]);

  /* ─── Step state helper ─── */
  const getStepState = (index) => {
    if (index === currentStep) return 'current';
    if (index < currentStep) return 'completed';
    return 'pending';
  };

  /* ─── Step content renderer ─── */
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PreQualification formData={formData} updateField={updateField} />
        );
      case 1:
        return (
          <PersonalInfo formData={formData} updateField={updateField} />
        );
      case 2:
        return (
          <BusinessBackground formData={formData} updateField={updateField} />
        );
      case 3:
        return (
          <FinancialCapability formData={formData} updateField={updateField} />
        );
      case 4:
        return (
          <BrandAlignment formData={formData} updateField={updateField} />
        );
      case 5:
        return (
          <FranchisePlan formData={formData} updateField={updateField} />
        );
      case 6:
        return (
          <DocumentUpload formData={formData} updateField={updateField} />
        );
      case 7:
        return (
          <LegalConsents formData={formData} updateField={updateField} />
        );
      case 8:
        return (
          <ReviewSubmit
            formData={formData}
            updateField={updateField}
            onEditStep={goToStep}
          />
        );
      default:
        return <PlaceholderStep stepConfig={APPLICATION_STEPS[currentStep]} />;
    }
  };

  /* ─── C1 FIX: Honest "not connected" state ─── */
  if (submitted) {
    return (
      <main className="application-page">
        <div
          className="container"
          style={{
            paddingTop: 'var(--space-5xl)',
            paddingBottom: 'var(--space-5xl)',
          }}
        >
          <div className="app-form-card">
            <div className="submit-success">
              <div className="success-icon" style={{ background: 'rgba(245, 166, 35, 0.1)', color: '#f5a623' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2>Application Submitted</h2>
              <p>
                Thank you. Your franchise application and documents were submitted securely for review.
              </p>
              {submissionId && <p style={{ marginTop: '12px' }}>Your reference number is <strong>{submissionId}</strong>.</p>}
              <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-gray-500)' }}>
                We&apos;ll contact you at the email address in your application. For help, contact <strong>franchise@siomaistreet.ph</strong>.
              </p>
              <button
                type="button"
                className="step-nav-continue"
                style={{ marginTop: '24px' }}
                onClick={() => {
                  setSubmitted(false);
                  setCurrentStep(APPLICATION_STEPS.length - 1);
                }}
              >
                Return to Application
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="application-page">
      {/* ── Sub Navigation ── */}
      <nav className="app-subnav" id="app-subnav">
        <div className="app-subnav-inner">
          {SUB_NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`app-subnav-tab ${tab.active ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
              disabled={tab.disabled}
              id={`subnav-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Page Header ── */}
      <div className="app-page-header">
        <div className="app-header-left">
          <h1>Franchise Application</h1>
          <p>
            Complete all steps to be considered as an official franchise
            partner.{' '}
            <span className="time-estimate">~25–35 minutes</span>
          </p>
        </div>
        <div className="app-header-right">
          <div className="progress-label">Progress</div>
          <div className="progress-value">{progress}%</div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Progress Stepper ── */}
      <div className="app-stepper">
        <div className="stepper-track" ref={stepperTrackRef}>
          {APPLICATION_STEPS.map((step, i) => (
            <Fragment key={step.id}>
              {i > 0 && (
                <div
                  className={`stepper-connector ${i <= currentStep ? 'active' : ''}`}
                />
              )}
              <div className={`stepper-step ${getStepState(i)}`}>
                <div
                  className="stepper-circle"
                  onClick={() => i < currentStep && goToStep(i)}
                  role={i < currentStep ? 'button' : undefined}
                  tabIndex={i < currentStep ? 0 : undefined}
                  aria-label={i < currentStep ? `Go back to ${step.label}` : undefined}
                  onKeyDown={(e) => {
                    if (i < currentStep && (e.key === 'Enter' || e.key === ' ')) {
                      goToStep(i);
                    }
                  }}
                >
                  {i < currentStep ? <HiOutlineCheck /> : i + 1}
                </div>
                <span className="stepper-label">{step.label}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="app-content-wrapper">
        <div className="app-form-card">
          {/* ── H2: Validation error display ── */}
          {stepErrors.length > 0 && (
            <div className="step-errors" role="alert">
              <strong>Please complete the following before continuing:</strong>
              <ul>
                {stepErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="step-content" key={currentStep}>
            {renderStepContent()}
          </div>
          {submitError && <div className="step-errors" role="alert">{submitError}</div>}
          <StepNav
            currentStep={currentStep}
            totalSteps={APPLICATION_STEPS.length}
            onBack={handleBack}
            onNext={handleNext}
            nextLabel={nextStepLabel}
            disabled={submitting}
            busy={submitting}
          />
        </div>

        <HelperSidebar
          title={currentStepConfig.helperTitle}
          text={currentStepConfig.helperText}
        />
      </div>
    </main>
  );
};

export default ApplicationPage;
