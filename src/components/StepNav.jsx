import { HiOutlineArrowRight } from 'react-icons/hi';

const StepNav = ({ currentStep, totalSteps, onBack, onNext, nextLabel, disabled = false, busy = false }) => {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className={`step-nav ${isFirst ? 'first-step' : ''}`}>
      {!isFirst && (
        <button type="button" className="step-nav-back" onClick={onBack} disabled={disabled}>
          PREVIOUS
        </button>
      )}
      <button
        type="button"
        className={`step-nav-continue ${isLast ? 'step-nav-submit' : ''}`}
        onClick={onNext}
        disabled={disabled}
      >
        {isLast ? (
          <>
            {busy ? 'Submitting…' : 'Submit'}
          </>
        ) : (
          <>
            {nextLabel || 'Continue'}
            <HiOutlineArrowRight />
          </>
        )}
      </button>
    </div>
  );
};

export default StepNav;
