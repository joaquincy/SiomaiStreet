import { requestTurnstile } from '../../utils/turnstile';
import { validateStep, validateApplication } from '../../../shared/application.js';
import { useState, useEffect, useRef, Fragment } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ApplicationStart from './ApplicationStart';
import ApplicationReceipt from './ApplicationReceipt';
import { HiOutlineCheck } from 'react-icons/hi';
import { stepFeedback } from '../../utils/personalFeedback';
import { ApplicationFeedbackContext } from '../../components/applicationFeedbackContext';
import {
  BiDevices,
  BiXCircle,
  BiArrowBack,
  BiRefresh,
} from 'react-icons/bi';
import { HiOutlineShieldExclamation } from 'react-icons/hi2';
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
import { submitFranchiseApplication } from '../../api';
import PageMeta from '../../components/PageMeta';
import {
  clearApplicationDraft,
  loadApplicationDraft,
  loadDraftDocuments,
  saveApplicationDraft,
  saveDraftDocuments,
} from '../../utils/applicationDraft';
import './Application.css';
import './ApplicationPilot.css';
import './ApplicationExperience.css';
import './ApplicationAccess.css';

/* ─── Sub-navigation tab config ─── */
const SUB_NAV_TABS = [
  { id: 'apply', label: 'Submit Application', active: true },
  { id: 'track', label: 'Track Status' },
  { id: 'onboard', label: 'Onboarding' },
];

const PACKAGE_LABELS = {
  'food-cart': 'Food Cart',
  kiosk: 'Mall / Inline Kiosk',
  'casual-dining': 'Full Casual Dining',
  'not-sure': 'Not Sure Yet',
};

const REVIEW_STEP_INDEX = APPLICATION_STEPS.length - 1;

const ApplicationPage = () => {
  const navigate = useNavigate();
  const [portalReceipt, setPortalReceipt] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPackageParam = searchParams.get('package');
  const requestedPackage =
    requestedPackageParam && Object.prototype.hasOwnProperty.call(PACKAGE_LABELS, requestedPackageParam)
      ? requestedPackageParam
      : null;

  const [savedDraft] = useState(() => loadApplicationDraft());
  const [currentStep, setCurrentStep] = useState(() =>
    Math.min(Math.max(savedDraft.currentStep, 0), APPLICATION_STEPS.length - 1)
  );
  const [formData, setFormData] = useState(() => {
    const baseData = savedDraft.formData || {};
    if (requestedPackage && !baseData.selectedPackage) {
      return {
        ...baseData,
        selectedPackage: requestedPackage,
        franchiseType: baseData.franchiseType || requestedPackage,
      };
    }
    return baseData;
  });
  const [pendingPackageChoice, setPendingPackageChoice] = useState(() =>
    requestedPackage &&
      savedDraft.formData?.selectedPackage &&
      savedDraft.formData.selectedPackage !== requestedPackage
      ? requestedPackage
      : null
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [stepErrors, setStepErrors] = useState([]);
  const [submissionError, setSubmissionError] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const submitLock = useRef(false);
  const requestId = useRef(savedDraft.requestId);
  const [saveStatus, setSaveStatus] = useState('Loading draft');
  const [attempted, setAttempted] = useState({});
  const [visited, setVisited] = useState({ [savedDraft.currentStep]: true });
  const summaryRef = useRef(null);
  const stepperRef = useRef(null);
  const restoreFailed = useRef(false);
  const documentWrite = useRef(Promise.resolve());
  const savedDocuments = useRef(null);

  useScrollReveal();

  useEffect(() => {
    const container = stepperRef.current;
    const active = container?.querySelector('[aria-current="step"]');
    if (container && active) {
      const offset = active.getBoundingClientRect().left - container.getBoundingClientRect().left;
      container.scrollLeft += offset - container.clientWidth / 2 + active.clientWidth / 2;
    }
  }, [currentStep]);

  useEffect(() => {
    let isActive = true;

    loadDraftDocuments(requestId.current)
      .then((documents) => {
        if (isActive && Object.keys(documents).length > 0) {
          setFormData((previous) => ({ ...previous, documents }));
        }
      })
      .catch(() => {
        restoreFailed.current = true;
        setSaveStatus('Save failed: saved files could not be restored. Keep this page open.');
      })
      .finally(() => {
        if (isActive) setDraftRestored(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!draftRestored || submitted) return;
    let active = true;
    setSaveStatus('Saving');
    const textSaved = saveApplicationDraft(currentStep, formData, requestId.current);
    documentWrite.current = documentWrite.current
      .catch(() => { })
      .then(async () => {
        if (restoreFailed.current) throw new Error('Saved documents could not be restored');
        if (savedDocuments.current !== formData.documents) {
          await saveDraftDocuments(formData.documents, requestId.current);
          savedDocuments.current = formData.documents;
        }
        if (!textSaved) throw new Error('Answers could not be saved');
      });
    documentWrite.current
      .then(() => {
        if (active) setSaveStatus('Saved on this device');
      })
      .catch(() => {
        if (active) {
          setSaveStatus(
            'Save failed. Keep this page open; your latest answers or files may not survive a reload.'
          );
        }
      });
    return () => {
      active = false;
    };
  }, [currentStep, draftRestored, formData, submitted]);

  /* ─── Progress & Current Step Feedback ─── */
  const stepChecks = APPLICATION_STEPS.map((_, index) => validateStep(index, formData));
  const completedStepsCount = stepChecks.filter((errors) => errors.length === 0).length;
  const progress = Math.round((completedStepsCount / APPLICATION_STEPS.length) * 100);
  const currentStepConfig = APPLICATION_STEPS[currentStep];
  const currentIssues = stepFeedback(currentStep, formData);
  const showCurrentStepErrors = !!attempted[currentStep] && currentIssues.length > 0;
  const isSaveFailed = saveStatus.startsWith('Save failed');

  const nextStepLabel =
    currentStep < APPLICATION_STEPS.length - 1
      ? `Continue to ${APPLICATION_STEPS[currentStep + 1].label}`
      : 'Submit Application';

  /* ─── Form helpers ─── */
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Client errors are derived from current answers. Server errors belong to the
    // submitted snapshot and must not reappear after that snapshot is edited.
    setStepErrors([]);
    setSaveStatus('Saving');
  };

  const cleanupDraft = async () => {
    setCleanupStatus('Clearing local draft…');
    try {
      await documentWrite.current.catch(() => { });
      await clearApplicationDraft();
      setCleanupStatus('Local draft cleared from this device.');
    } catch {
      setCleanupStatus('Cleanup failed. Your application was received, but answers or files may remain on this device. Retry cleanup or clear this site’s browser data after saving your private receipt.');
    }
  };

  const goToStep = (index, fromReview = false) => {
    if (submitLock.current || index < 0 || index >= APPLICATION_STEPS.length) return;
    if (fromReview) setReturnToReview(true);
    if (index === REVIEW_STEP_INDEX) setReturnToReview(false);
    setCurrentStep(index);
    setVisited((previous) => ({ ...previous, [index]: true }));
    setStepErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditFromReview = (stepIndex) => {
    goToStep(stepIndex, true);
  };

  const handleReturnToReview = () => {
    const currentStepValidation = validateStep(currentStep, formData);
    if (currentStepValidation.length > 0) {
      setAttempted((previous) => ({ ...previous, [currentStep]: true }));
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    goToStep(REVIEW_STEP_INDEX, false);
  };

  /* ─── Validate before advancing ─── */
  const handleNext = async () => {
    if (submitLock.current || !draftRestored) return;
    setSubmissionError('');
    const finalStep = currentStep === APPLICATION_STEPS.length - 1;
    const allErrors = finalStep
      ? validateApplication(formData)
      : validateStep(currentStep, formData).map((message) => ({ step: currentStep, message }));

    if (allErrors.length) {
      setAttempted((previous) => ({
        ...previous,
        ...Object.fromEntries(allErrors.map((error) => [error.step, true])),
      }));
      setCurrentStep(allErrors[0].step);
      setStepErrors([]);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    if (!finalStep) {
      goToStep(currentStep + 1);
      return;
    }

    // Synchronous lock closes the double-click window before React renders disabled controls.
    submitLock.current = true;
    setSubmitting(true);
    saveApplicationDraft(currentStep, formData, requestId.current);
    try {
      const turnstileToken = await requestTurnstile('application');
      const result = await submitFranchiseApplication({ turnstileToken, formData, requestId: requestId.current, onProgress: setTransferStatus });
      setPortalReceipt(result);
      setSubmitted(true);
      await cleanupDraft();
    } catch (error) {
      setSubmissionError(error.message || 'Your application could not be submitted. Please retry.');
      if (Array.isArray(error.validationErrors) && error.validationErrors.length) {
        const firstStep = error.validationErrors[0].step;
        if (
          Number.isInteger(firstStep) &&
          firstStep >= 0 &&
          firstStep < APPLICATION_STEPS.length
        ) {
          setCurrentStep(firstStep);
        }
        setAttempted((previous) => ({ ...previous, [firstStep]: true }));
        setStepErrors(
          error.validationErrors.map((item) => 'Step ' + (item.step + 1) + ': ' + item.message)
        );
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const handleBack = () => goToStep(currentStep - 1);

  /* ─── Step state helper ─── */
  const getStepState = (index) => {
    if (stepChecks[index].length === 0) return 'Complete';
    if (attempted[index]) return 'Needs attention';
    if (visited[index] || index === currentStep || index <= savedDraft.currentStep) return 'In progress';
    return 'Not started';
  };

  const feedbackContextValue = {
    showErrors: !!attempted[currentStep],
    issues: currentIssues,
    errorsFor: (id) =>
      attempted[currentStep]
        ? currentIssues.filter((issue) => issue.id === id).map((issue) => issue.message)
        : [],
  };

  /* ─── Step content renderer ─── */
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <PreQualification formData={formData} updateField={updateField} />;
      case 1:
        return (
          <PersonalInfo
            formData={formData}
            updateField={updateField}
            showErrors={!!attempted[1]}
          />
        );
      case 2:
        return <BusinessBackground formData={formData} updateField={updateField} />;
      case 3:
        return <FinancialCapability formData={formData} updateField={updateField} />;
      case 4:
        return <BrandAlignment formData={formData} updateField={updateField} />;
      case 5:
        return <FranchisePlan formData={formData} updateField={updateField} />;
      case 6:
        return <DocumentUpload formData={formData} updateField={updateField} saveStatus={saveStatus} />;
      case 7:
        return <LegalConsents formData={formData} updateField={updateField} />;
      case 8:
        return (
          <ReviewSubmit
            formData={formData}
            updateField={updateField}
            onEditStep={handleEditFromReview}
          />
        );
      default:
        return <PlaceholderStep stepConfig={APPLICATION_STEPS[currentStep]} />;
    }
  };

  /* ─── Receipt Screen (Only After Valid Server Receipt) ─── */
  if (submitted) {
    return (
      <main className="application-page application-receipt-page">
        <PageMeta
          title="Application Submitted"
          path="/application"
          description="Your Siomai Street franchise application has been submitted successfully."
        />
        <ApplicationReceipt
          receipt={portalReceipt}
          cleanupStatus={cleanupStatus}
          busy={submitting}
          onRetryCleanup={cleanupDraft}
          onNewApplication={() => {
            requestId.current = crypto.randomUUID();
            setFormData({});
            setCurrentStep(0);
            setPortalReceipt(null);
            setCleanupStatus('');
            savedDocuments.current = null;
            restoreFailed.current = false;
            setAttempted({});
            setVisited({ 0: true });
            setReturnToReview(false);
            setSubmitted(false);
          }}
        />
      </main>
    );
  }

  return (
    <main className="application-page">
      <PageMeta
        title="Franchise Application"
        path="/application"
        description="Apply for consideration as a Siomai Street franchise partner. Review your details before submitting; application receipt is not approval."
      />

      {/* ── Sub Navigation ── */}
      <nav className="app-subnav" id="app-subnav" aria-label="Application portal sections">
        <div className="app-subnav-inner">
          {SUB_NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`app-subnav-tab ${tab.active ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
              disabled={tab.disabled}
              id={`subnav-${tab.id}`}
              onClick={() => { if (tab.id === 'track') navigate('/application/status'); if (tab.id === 'onboard') navigate('/application/onboarding'); }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {submitting && <p role="status" aria-live="polite" className="application-preparation">{transferStatus}</p>}
      {/* ── Page Header ── */}
      <ApplicationStart ready={draftRestored} />
      <div className="app-page-header">
        <div className="app-header-left">
          <h1>Franchise Application</h1>
          <p>
            Complete all <strong>nine steps</strong> to be considered as an official{' '}
            <strong>Siomai Street</strong> franchise partner.{' '}
            <span className="time-estimate">About 25 to 35 minutes</span>
          </p>
        </div>

        <div className="app-header-right">
          <div className="progress-header-row">
            <div className="progress-label">Steps passing checks</div>
            <div className="progress-count-meta">
              {completedStepsCount} of {APPLICATION_STEPS.length} complete
            </div>
          </div>
          <div className="progress-value">{progress}%</div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Connected Red-and-Gold Progress Circles ── */}
      <nav className="app-stepper" aria-label="Application steps" ref={stepperRef}>
        <div className="stepper-track">
          {APPLICATION_STEPS.map((step, index) => {
            const status = getStepState(index);
            const stateClass =
              index === currentStep
                ? 'current'
                : status === 'Complete'
                  ? 'completed'
                  : status === 'Needs attention'
                    ? 'attention'
                    : 'pending';

            return (
              <Fragment key={step.id}>
                {index > 0 && (
                  <div
                    aria-hidden="true"
                    className={`stepper-connector ${index <= currentStep || status === 'Complete' ? 'active' : ''
                      }`}
                  />
                )}
                <div className={`stepper-step ${stateClass}`}>
                  <button
                    type="button"
                    className="stepper-circle"
                    aria-current={index === currentStep ? 'step' : undefined}
                    aria-label={`Step ${index + 1}: ${step.label}, ${status}`}
                    disabled={submitting || !draftRestored}
                    onClick={() => goToStep(index)}
                  >
                    {status === 'Complete' && index !== currentStep ? (
                      <HiOutlineCheck aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </button>
                  <span className="stepper-label">{step.label}</span>
                  <span
                    className={`stepper-status status-${status
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
                  >
                    {status}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </nav>

      {/* ── Content Area ── */}
      <div className="app-content-wrapper">
        <div className="app-form-card">
          {/* ── Draft Notice Banner ── */}
          <div
            className={`app-draft-notice ${isSaveFailed ? 'save-failed' : ''}`}
            role="status"
            aria-live="polite"
          >
            <div className="draft-notice-icon" aria-hidden="true">
              <BiDevices />
            </div>
            <div className="draft-notice-content">
              <span className="draft-notice-saved">{saveStatus}</span>
              <span className="draft-notice-warning">
                <HiOutlineShieldExclamation className="draft-warning-icon" aria-hidden="true" />
                <span>
                  {savedDraft.discarded && 'An expired or invalid draft was not restored. '}
                  Local answers and files expire seven days after the last save and are removed when you next open this application, or after confirmed submission. Avoid shared or public devices. If storage is blocked, cleanup may require clearing this site’s browser data.
                </span>
              </span>
            </div>
          </div>

          {/* ── Non-Destructive Package Preference Carry-Over Prompt ── */}
          {pendingPackageChoice && (
            <div className="package-carryover-bar" role="region" aria-label="Package selection preference">
              <div className="package-carryover-text">
                <strong>
                  Update package preference to {PACKAGE_LABELS[pendingPackageChoice]}?
                </strong>
                <span>
                  Your saved draft currently uses{' '}
                  {PACKAGE_LABELS[formData.selectedPackage] || formData.selectedPackage}.
                </span>
              </div>
              <div className="package-carryover-actions">
                <button
                  type="button"
                  className="package-carryover-apply"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      selectedPackage: pendingPackageChoice,
                      franchiseType: pendingPackageChoice,
                    }));
                    setPendingPackageChoice(null);
                    setSearchParams({}, { replace: true });
                  }}
                >
                  Use {PACKAGE_LABELS[pendingPackageChoice]}
                </button>
                <button
                  type="button"
                  className="package-carryover-keep"
                  onClick={() => {
                    setPendingPackageChoice(null);
                    setSearchParams({}, { replace: true });
                  }}
                >
                  Keep saved draft
                </button>
              </div>
            </div>
          )}

          {/* ── Return to Review Banner (when editing from Step 9) ── */}
          {(returnToReview || visited[REVIEW_STEP_INDEX]) && currentStep < REVIEW_STEP_INDEX && (
            <div className="return-to-review-bar">
              <div className="return-to-review-text">
                <strong>Editing Step {currentStep + 1}: {currentStepConfig.label}</strong>
                <span>{saveStatus}</span>
              </div>
              <button
                type="button"
                className="return-to-review-btn"
                onClick={handleReturnToReview}
                disabled={submitting || !draftRestored}
              >
                <BiArrowBack aria-hidden="true" />
                <span>Return to Review &amp; Submit</span>
              </button>
            </div>
          )}

          {/* ── Linked Error Summary (All 9 Steps) ── */}
          {(showCurrentStepErrors || stepErrors.length > 0) && (
            <div
              className="pilot-error-summary"
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              aria-labelledby="error-summary-title"
            >
              <h2 id="error-summary-title">
                Check your answers on Step {currentStep + 1} ({currentIssues.length || stepErrors.length})
              </h2>
              <p>
                Select an item below to move keyboard focus directly to that control. Unresolved items remain listed until corrected.
              </p>
              <ul>
                {currentIssues.length > 0
                  ? currentIssues.map((issue) => (
                    <li key={issue.message}>
                      <a
                        href={`#${issue.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          const target = document.getElementById(issue.id);
                          const focusTarget =
                            target?.matches('input, button, textarea, select, [tabindex]')
                              ? target
                              : target?.querySelector('input, button, textarea, select, [tabindex]') || target;
                          focusTarget?.focus();
                          (target || focusTarget)?.scrollIntoView({ block: 'center', behavior: 'auto' });
                        }}
                      >
                        {issue.message}
                      </a>
                    </li>
                  ))
                  : stepErrors.map((message) => <li key={message}>{message}</li>)}
              </ul>
            </div>
          )}

          {/* ── Submission Error & Safe Retry Card ── */}
          {submissionError && (
            <div className="submission-error-card" role="alert">
              <div className="submission-error-body">
                <div className="submission-error-icon-wrapper" aria-hidden="true">
                  <BiXCircle />
                </div>
                <div className="submission-error-content">
                  <strong>Submission unsuccessful</strong>
                  <p>{submissionError}</p>
                </div>
                <div className="submission-error-actions">
                  {currentStep === REVIEW_STEP_INDEX && (
                    <button
                      type="button"
                      className="submission-retry-btn"
                      onClick={handleNext}
                      disabled={submitting || !draftRestored}
                    >
                      <BiRefresh aria-hidden="true" />
                      <span>Retry safely</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="step-errors-dismiss"
                    onClick={() => setSubmissionError('')}
                    aria-label="Dismiss error"
                  >
                    <BiXCircle aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <ApplicationFeedbackContext.Provider value={feedbackContextValue}>
            <fieldset
              className="step-content application-fields"
              disabled={submitting || !draftRestored}
              key={currentStep}
            >
              <details className="application-requirements">
                <summary>
                  <span>Remaining checks for Step {currentStep + 1}: {currentStepConfig.label}</span>
                  <span className={`requirements-count-badge ${stepChecks[currentStep].length === 0 ? 'complete' : ''}`}>
                    {stepChecks[currentStep].length === 0
                      ? 'All checks passed'
                      : `${stepChecks[currentStep].length} remaining`}
                  </span>
                </summary>
                <div className="application-requirements-body">
                  {stepChecks[currentStep].length ? (
                    <ul>
                      {stepChecks[currentStep].map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>This step passes the current form checks. Review your answers for accuracy.</p>
                  )}
                  <p className="requirements-disclaimer">
                    Conditional checks update with your answers. Passing these checks does not establish franchise eligibility or approval.
                  </p>
                </div>
              </details>
              {renderStepContent()}
            </fieldset>
          </ApplicationFeedbackContext.Provider>

          <StepNav
            currentStep={currentStep}
            totalSteps={APPLICATION_STEPS.length}
            onBack={handleBack}
            onNext={handleNext}
            nextLabel={nextStepLabel}
            disabled={submitting || !draftRestored}
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
