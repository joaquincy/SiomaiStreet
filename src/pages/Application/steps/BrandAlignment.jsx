import { BiHeart } from 'react-icons/bi';
import {
  ToggleOption,
  RadioGroup,
  RadioOption,
} from '../../../components/FormElements';
import './Steps.css';
import { WordCounter, RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';

const BRAND_VALUES = [
  'Excellence',
  'Customer First',
  'Integrity',
  'Innovation',
  'Community',
  'Consistency',
];

const BrandAlignment = ({ formData, updateField }) => {
  const brandValues = formData.brandValues || [];
  const feedback = useApplicationFeedback();

  const whyErrors = feedback.errorsFor('ba-whyInterested');
  const personalValuesErrors = feedback.errorsFor('ba-personalValues');
  const brandValuesErrors = feedback.errorsFor('ba-brandValues');
  const explanationErrors = feedback.errorsFor('ba-explanation');
  const discoveryErrors = feedback.errorsFor('ba-discoveryDay');

  const toggleBrandValue = (value) => {
    if (brandValues.includes(value)) {
      updateField('brandValues', brandValues.filter((v) => v !== value));
    } else if (brandValues.length < 3) {
      updateField('brandValues', [...brandValues, value]);
    }
  };

  return (
    <div className="step-content">
      <header className="step-intro">
        <div className="step-intro-icon saffron" aria-hidden="true">
          <BiHeart />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 05 · Values &amp; Leadership</span>
          <h2 id="ba-step-title" tabIndex={-1} className="step-intro-title">
            Brand Alignment &amp; <span className="title-highlight">Partnership Fit</span>
          </h2>
          <p className="step-intro-subtitle">
            Share your <strong>motivation</strong>, <strong>leadership principles</strong>, and how you plan to uphold Siomai Street standards in your community.
          </p>
        </div>
      </header>

      <section className="form-section">
        <div className={`form-field ${whyErrors.length ? 'has-errors' : ''}`}>
          <label htmlFor="ba-whyInterested">
            <span className="field-label-row">
              <span>Why are you interested in this specific franchise?</span>
              <RequirementBadge required />
            </span>
          </label>
          <p className="field-help">
            Write at least 100 words explaining your motivation, local market opportunity, and long-term goals with Siomai Street.
          </p>
          <textarea
            id="ba-whyInterested"
            name="whyInterested"
            className="form-textarea"
            rows="5"
            placeholder="Share your motivation and goals (minimum 100 words)..."
            aria-required="true"
            aria-invalid={whyErrors.length > 0}
            value={formData.whyInterested || ''}
            onChange={(e) => updateField('whyInterested', e.target.value)}
          />
          <WordCounter value={formData.whyInterested} minimum={100} />
          <FieldErrorList id="ba-whyInterested" errors={whyErrors} />
        </div>

        <div className={`form-field ${personalValuesErrors.length ? 'has-errors' : ''}`}>
          <label htmlFor="ba-personalValues">
            <span className="field-label-row">
              <span>What personal values or business principles make you the right franchisee?</span>
              <RequirementBadge required />
            </span>
          </label>
          <p className="field-help">
            Write at least 50 words describing how you lead teams, serve customers, and handle day-to-day accountability.
          </p>
          <textarea
            id="ba-personalValues"
            name="personalValues"
            className="form-textarea"
            rows="4"
            placeholder="Describe your leadership and business principles (minimum 50 words)..."
            aria-required="true"
            aria-invalid={personalValuesErrors.length > 0}
            value={formData.personalValues || ''}
            onChange={(e) => updateField('personalValues', e.target.value)}
          />
          <WordCounter value={formData.personalValues} minimum={50} />
          <FieldErrorList id="ba-personalValues" errors={personalValuesErrors} />
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <span>Brand Values Alignment</span>
        </h3>

        <div id="ba-brandValues" tabIndex={-1} className={`form-field ${brandValuesErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">Select your top 3 values and explain why they matter to you</span>
            <RequirementBadge required />
          </span>
          <p role="status" className={`selection-limit-status ${brandValues.length === 3 ? 'complete' : ''}`}>
            {brandValues.length} of 3 selected.{' '}
            {brandValues.length === 3
              ? 'Limit reached. Deselect a value before choosing another.'
              : `Choose ${3 - brandValues.length} more.`}
          </p>
          <div className="card-selector-group three-cols">
            {BRAND_VALUES.map((value) => {
              const isSelected = brandValues.includes(value);
              const limitReached = brandValues.length >= 3 && !isSelected;
              return (
                <ToggleOption
                  key={value}
                  label={value}
                  selected={isSelected}
                  disabled={limitReached}
                  onClick={() => toggleBrandValue(value)}
                />
              );
            })}
          </div>
          <FieldErrorList id="ba-brandValues" errors={brandValuesErrors} />
        </div>

        <div className={`form-field ${explanationErrors.length ? 'has-errors' : ''}`}>
          <label htmlFor="ba-explanation">
            <span className="field-label-row">
              <span>Explain your selected brand values</span>
              <RequirementBadge required />
            </span>
          </label>
          <p className="field-help">
            Write at least 100 words showing how you will put your 3 chosen values into practice in your branch.
          </p>
          <textarea
            id="ba-explanation"
            name="brandValuesExplanation"
            className="form-textarea"
            rows="5"
            placeholder="Explain how your 3 selected values guide your operations (minimum 100 words)..."
            aria-required="true"
            aria-invalid={explanationErrors.length > 0}
            value={formData.brandValuesExplanation || ''}
            onChange={(e) => updateField('brandValuesExplanation', e.target.value)}
          />
          <WordCounter value={formData.brandValuesExplanation} minimum={100} />
          <FieldErrorList id="ba-explanation" errors={explanationErrors} />
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <span>Discovery Day Interest</span>
        </h3>
        <div id="ba-discoveryDay" tabIndex={-1} className={`form-field ${discoveryErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">Would you be willing to attend a Discovery Day or orientation session with our team?</span>
            <RequirementBadge required />
          </span>
          <RadioGroup>
            <RadioOption
              label="Yes, definitely"
              description="Available to attend an in-person orientation session."
              selected={formData.discoveryDayInterest === 'yes-definitely'}
              onClick={() => updateField('discoveryDayInterest', 'yes-definitely')}
            />
            <RadioOption
              label="Yes, but remotely preferred"
              description="Prefer an online video briefing first."
              selected={formData.discoveryDayInterest === 'yes-remote'}
              onClick={() => updateField('discoveryDayInterest', 'yes-remote')}
            />
            <RadioOption
              label="Not at this time"
              description="Would like to review initial application feedback before scheduling."
              selected={formData.discoveryDayInterest === 'not-now'}
              onClick={() => updateField('discoveryDayInterest', 'not-now')}
            />
          </RadioGroup>
          <FieldErrorList id="ba-discoveryDay" errors={discoveryErrors} />
        </div>
      </section>
    </div>
  );
};

export default BrandAlignment;
