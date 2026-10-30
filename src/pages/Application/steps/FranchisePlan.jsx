import {
  BiTargetLock,
  BiStore,
  BiMap,
  BiCalendarEvent,
  BiCart,
  BiRestaurant,
  BiCheck,
} from 'react-icons/bi';
import {
  ToggleGroup,
  ToggleOption,
  FormSelect,
  ChipGroup,
  Chip,
} from '../../../components/FormElements';
import { REGIONS } from '../../../data/stepsConfig';
import { RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';
import './Steps.css';
import {
  FRANCHISE_PACKAGES,
  PRICING_NOTICE,
  QUOTATION_GUIDANCE,
  QUOTATION_CHECKLIST,
} from '../../../../shared/franchiseCatalogue.js';

const SITE_TYPES = [
  'SM Mall', 'Robinsons Mall', 'Puregold', 'Wet Market', 'Public Market',
  'School', 'University', 'Office Building', 'Hospital', 'Roadside',
  'Residential Area', 'Transport Terminal', 'Others',
];

const FranchisePlan = ({ formData, updateField }) => {
  const siteTypes = formData.siteTypes || [];
  const feedback = useApplicationFeedback();

  const packageErrors = feedback.errorsFor('fp-selectedPackage');
  const regionErrors = feedback.errorsFor('fp-targetRegion');
  const cityErrors = feedback.errorsFor('fp-city');
  const locationErrors = feedback.errorsFor('fp-hasSpecificLocation');
  const siteTypeErrors = feedback.errorsFor('fp-siteTypes');
  const altErrors = feedback.errorsFor('fp-openToAlternative');
  const timelineErrors = feedback.errorsFor('fp-planOpeningTimeline');

  const toggleSiteType = (type) => {
    const updated = siteTypes.includes(type)
      ? siteTypes.filter((t) => t !== type)
      : [...siteTypes, type];
    updateField('siteTypes', updated);
  };

  const siteTypeConditionalLabel =
    formData.hasSpecificLocation === 'yes'
      ? 'Required for an identified location'
      : 'Optional until you identify a location';

  return (
    <div className="step-content">
      <header className="step-intro">
        <div className="step-intro-icon red" aria-hidden="true">
          <BiTargetLock />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 06 · Format &amp; Territory Strategy</span>
          <h2 id="fp-step-title" tabIndex={-1} className="step-intro-title">
            Your <span className="title-highlight">Franchise Vision</span> &amp; Location Plan
          </h2>
          <p className="step-intro-subtitle">
            Select your <strong>preferred store format</strong> and <strong>target territory</strong>. You may apply even if you have not yet secured a specific commercial space.
          </p>
        </div>
      </header>

      <section className="form-section">
        <h3 className="section-title">
          <BiStore className="section-icon" aria-hidden="true" />
          <span>Package Selection</span>
        </h3>

        <div id="fp-selectedPackage" tabIndex={-1} className={`form-field ${packageErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">Which franchise format interests you?</span>
            <RequirementBadge required />
          </span>
          <p className="field-help">{QUOTATION_GUIDANCE}</p>

          <details className="quotation-checklist-details">
            <summary>Items to confirm in your written quotation ({QUOTATION_CHECKLIST.length})</summary>
            <ul>
              {QUOTATION_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>

          <div className="package-cards-grid">
            {FRANCHISE_PACKAGES.map((pkg, index) => {
              const Icon = [BiCart, BiStore, BiRestaurant][index];
              const isSelected = formData.selectedPackage === pkg.id;
              return (
                <button
                  type="button"
                  key={pkg.id}
                  className={`package-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => updateField('selectedPackage', pkg.id)}
                  aria-pressed={isSelected}
                >
                  <span className="package-card-top">
                    <span className="package-card-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="package-card-check" aria-hidden="true">
                      {isSelected && <BiCheck />}
                    </span>
                  </span>
                  <span className="package-title">{pkg.name}</span>
                  <span className="package-desc">{pkg.description}</span>
                  <span className="package-quote-badge">{PRICING_NOTICE}</span>
                </button>
              );
            })}
          </div>

          <div className="undecided-package-row">
            <ToggleGroup>
              <ToggleOption
                label="Not sure yet; discuss options"
                selected={formData.selectedPackage === 'not-sure'}
                onClick={() => updateField('selectedPackage', 'not-sure')}
              />
            </ToggleGroup>
          </div>

          <FieldErrorList id="fp-selectedPackage" errors={packageErrors} />
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <BiMap className="section-icon" aria-hidden="true" />
          <span>Location Details</span>
        </h3>

        <div className="form-row two-cols">
          <div id="fp-targetRegion" tabIndex={-1} className={`form-field ${regionErrors.length ? 'has-errors' : ''}`}>
            <span className="field-label-row">
              <span className="field-label-text">Target Region</span>
              <RequirementBadge required />
            </span>
            <p className="field-help">Select the region for your proposed branch.</p>
            <FormSelect
              id="fp-targetRegion-select"
              options={REGIONS}
              placeholder="Select region"
              value={formData.targetRegion}
              onChange={(val) => updateField('targetRegion', val)}
              ariaLabel="Target Region"
            />
            <FieldErrorList id="fp-targetRegion" errors={regionErrors} />
          </div>

          <div className={`form-field ${cityErrors.length ? 'has-errors' : ''}`}>
            <label htmlFor="fp-city">
              <span className="field-label-row">
                <span>Target City / Municipality</span>
                <RequirementBadge required />
              </span>
            </label>
            <p className="field-help">Enter the city or municipality, for example Quezon City.</p>
            <input
              id="fp-city"
              name="targetCity"
              type="text"
              className="form-input"
              placeholder="e.g., Quezon City, Metro Manila"
              aria-required="true"
              aria-invalid={cityErrors.length > 0}
              value={formData.targetCity || ''}
              onChange={(e) => updateField('targetCity', e.target.value)}
            />
            <FieldErrorList id="fp-city" errors={cityErrors} />
          </div>
        </div>

        <div id="fp-hasSpecificLocation" tabIndex={-1} className={`form-field ${locationErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">Do you already have a specific location or space in mind?</span>
            <RequirementBadge required />
          </span>
          <p className="field-help">
            Select No if you are still scouting sites; Proposed Site Type below will remain optional until a site is identified.
          </p>
          <ToggleGroup>
            <ToggleOption
              label="Yes"
              selected={formData.hasSpecificLocation === 'yes'}
              onClick={() => updateField('hasSpecificLocation', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.hasSpecificLocation === 'no'}
              onClick={() => updateField('hasSpecificLocation', 'no')}
            />
          </ToggleGroup>
          <FieldErrorList id="fp-hasSpecificLocation" errors={locationErrors} />
        </div>

        <div id="fp-siteTypes" tabIndex={-1} className={`form-field ${siteTypeErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">Proposed Site Type (select all that apply)</span>
            <RequirementBadge
              required={formData.hasSpecificLocation === 'yes'}
              conditional={siteTypeConditionalLabel}
            />
          </span>
          <p className="field-help">
            {formData.hasSpecificLocation === 'yes'
              ? 'Because you have a specific location in mind, select at least one site type.'
              : 'Optional if you have not yet identified a specific location.'}
          </p>
          <ChipGroup>
            {SITE_TYPES.map((type) => (
              <Chip
                key={type}
                label={type}
                selected={siteTypes.includes(type)}
                onClick={() => toggleSiteType(type)}
              />
            ))}
          </ChipGroup>
          <FieldErrorList id="fp-siteTypes" errors={siteTypeErrors} />
        </div>

        <div id="fp-openToAlternative" tabIndex={-1} className={`form-field ${altErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">Are you open to our team recommending an alternative location?</span>
            <RequirementBadge required />
          </span>
          <ToggleGroup>
            <ToggleOption
              label="Yes"
              selected={formData.openToAlternative === 'yes'}
              onClick={() => updateField('openToAlternative', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.openToAlternative === 'no'}
              onClick={() => updateField('openToAlternative', 'no')}
            />
          </ToggleGroup>
          <FieldErrorList id="fp-openToAlternative" errors={altErrors} />
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <BiCalendarEvent className="section-icon" aria-hidden="true" />
          <span>Timeline &amp; Future Plans</span>
        </h3>

        <div id="fp-planOpeningTimeline" tabIndex={-1} className={`form-field ${timelineErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">When are you hoping to open?</span>
            <RequirementBadge required />
          </span>
          <div className="card-selector-group four-cols-mobile">
            <ToggleOption
              label="Within 3 months"
              selected={formData.planOpeningTimeline === 'within-3-months'}
              onClick={() => updateField('planOpeningTimeline', 'within-3-months')}
            />
            <ToggleOption
              label="3 to 6 months"
              selected={formData.planOpeningTimeline === '3-6-months'}
              onClick={() => updateField('planOpeningTimeline', '3-6-months')}
            />
            <ToggleOption
              label="6 to 12 months"
              selected={formData.planOpeningTimeline === '6-12-months'}
              onClick={() => updateField('planOpeningTimeline', '6-12-months')}
            />
            <ToggleOption
              label="Just planning for now"
              selected={formData.planOpeningTimeline === 'just-planning'}
              onClick={() => updateField('planOpeningTimeline', 'just-planning')}
            />
          </div>
          <FieldErrorList id="fp-planOpeningTimeline" errors={timelineErrors} />
        </div>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Are you interested in opening more than one branch in the future?</span>
            <RequirementBadge required={false} />
          </span>
          <div className="card-selector-group three-cols">
            <ToggleOption
              label="Yes"
              selected={formData.multipleUnits === 'yes'}
              onClick={() => updateField('multipleUnits', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.multipleUnits === 'no'}
              onClick={() => updateField('multipleUnits', 'no')}
            />
            <ToggleOption
              label="Maybe"
              selected={formData.multipleUnits === 'maybe'}
              onClick={() => updateField('multipleUnits', 'maybe')}
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="fp-additional">
            <span className="field-label-row">
              <span>Any other details you would like us to know about your plan?</span>
              <RequirementBadge required={false} />
            </span>
          </label>
          <p className="field-help">Optional notes on foot traffic, lease status, or local market observations.</p>
          <textarea
            id="fp-additional"
            name="additionalPlanDetails"
            className="form-textarea"
            rows="4"
            placeholder="Share any additional information about your franchise plans..."
            value={formData.additionalPlanDetails || ''}
            onChange={(e) => updateField('additionalPlanDetails', e.target.value)}
          />
        </div>
      </section>
    </div>
  );
};

export default FranchisePlan;
