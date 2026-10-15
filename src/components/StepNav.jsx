import { HiOutlineArrowRight } from 'react-icons/hi';

const StepNav = ({ currentStep, totalSteps, onBack, onNext, nextLabel }) => {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className={`step-nav ${isFirst ? 'first-step' : ''}`}>
      {!isFirst && (
        <button type="button" className="step-nav-back" onClick={onBack}>
          PREVIOUS
        </button>
      )}
      <button
        type="button"
        className={`step-nav-continue ${isLast ? 'step-nav-submit' : ''}`}
        onClick={onNext}
      >
        {isLast ? (
          <>
            Submit
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
