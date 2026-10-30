import { HiOutlineArrowRight, HiOutlineArrowLeft } from 'react-icons/hi';

const StepNav = ({ currentStep, totalSteps, onBack, onNext, nextLabel, disabled = false, busy = false }) => {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className={`step-nav ${isFirst ? 'first-step' : ''}`}>
      <div className="step-nav-left">
        {!isFirst && (
          <button type="button" className="step-nav-back" onClick={onBack} disabled={disabled}>
            <span className="btn-back-arrow" aria-hidden="true">
              <HiOutlineArrowLeft />
            </span>
            <span>Back</span>
          </button>
        )}
      </div>

      {typeof currentStep === 'number' && typeof totalSteps === 'number' && (
        <div className="step-nav-meta" aria-hidden="true">
          <span className="step-nav-meta-current">0{currentStep + 1}</span>
          <span className="step-nav-meta-sep">/</span>
          <span className="step-nav-meta-total">0{totalSteps}</span>
        </div>
      )}

      <div className="step-nav-right">
        <button
          type="button"
          className={`step-nav-continue ${isLast ? 'step-nav-submit' : ''}`}
          onClick={onNext}
          disabled={disabled}
          aria-busy={busy}
        >
          {isLast ? (
            <span>{busy ? 'Submitting…' : (nextLabel || 'Submit Application')}</span>
          ) : (
            <>
              <span>{nextLabel || 'Continue'}</span>
              <span className="btn-arrow-badge" aria-hidden="true">
                <HiOutlineArrowRight />
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StepNav;
