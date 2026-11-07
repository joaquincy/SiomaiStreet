import {
  BiTargetLock,
  BiStore,
  BiMap,
  BiCalendarEvent,
  BiCart,
  BiRestaurant,
  BiCheck,
  BiReceipt,
} from 'react-icons/bi';
import {
  ToggleGroup,
  ToggleOption,
  ChipGroup,
  Chip,
  FormSelect,
} from '../../../components/FormElements';
import { RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';
import './Steps.css';
import { PLAN_TIMELINE_LABELS } from '../../../../shared/applicationAnswers.js';
import { REGIONS } from '../../../data/stepsConfig';
import ApplicationDisclosure from '../../../components/ApplicationDisclosure';
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
  const cityErrors = feedback.errorsFor('fp-city');
  const regionErrors = feedback.errorsFor('fp-targetRegion');
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
    <div className="step-content franchise-plan">
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
            Review or update your <strong>format, location and opening timeline</strong> here. Changes update the same answers throughout your application. You may apply without a secured commercial space.
          </p>
        </div>
      </header>

      <section className="form-section">
        <h3 className="section-title">
          <BiStore className="section-icon" aria-hidden="true" />
          <span>Package Selection</span>
        </h3>

        <div id="fp-selectedPackage" tabIndex={-1} role="group" aria-labelledby="fp-package-label" aria-describedby={`fp-package-hint${packageErrors.length ? ' fp-selectedPackage-error' : ''}`} className={`form-field ${packageErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span id="fp-package-label" className="field-label-text">Choose your franchise format</span>
            <RequirementBadge required />
          </span>
          <p id="fp-package-hint" className="field-help">Your current choice is highlighted. Select a different format to update it, or discuss the options with our team.</p>
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
          <p className="field-help">{QUOTATION_GUIDANCE}</p>
          <ApplicationDisclosure title={`Items to confirm in your written quotation (${QUOTATION_CHECKLIST.length})`} hint="Review the scope, costs and terms before committing." icon={BiReceipt}>
            <ol className="application-quotation-list">{QUOTATION_CHECKLIST.map(item => <li key={item}>{item}</li>)}</ol>
          </ApplicationDisclosure>
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <BiMap className="section-icon" aria-hidden="true" />
          <span>Location Details</span>
        </h3>

        <div className="form-row two-cols location-details-row">
          <div id="fp-targetRegion" tabIndex={-1} role="group" aria-labelledby="fp-region-label" aria-describedby={`fp-region-hint${regionErrors.length ? ' fp-targetRegion-error' : ''}`} className={`form-field ${regionErrors.length || (formData.territory && formData.targetRegion && formData.territory !== formData.targetRegion) ? 'has-errors' : ''}`}>
            <label id="fp-region-label" htmlFor="fp-region-select" className="field-label-row">
              <span>Target Region</span>
              <span className="field-label-badges">
                {formData.territory && formData.targetRegion === formData.territory && (
                  <span className="region-sync-pill synced">
                    <BiCheck aria-hidden="true" />
                    <span>Matched with Step 1</span>
                  </span>
                )}
                {formData.territory && formData.targetRegion && formData.territory !== formData.targetRegion && (
                  <span className="region-sync-pill mismatch">
                    <span>Step 1: {formData.territory}</span>
                  </span>
                )}
                <RequirementBadge required />
              </span>
            </label>
            <p id="fp-region-hint" className="field-help">Choose your region here. If you change it, review the city or municipality beside it too.</p>
            <FormSelect id="fp-region-select" value={formData.targetRegion} onChange={value => updateField('targetRegion', value)} options={REGIONS} placeholder="Select a region" icon={BiMap} ariaLabel="Target Region (required)" />
            {formData.territory && formData.targetRegion && formData.territory !== formData.targetRegion && (
              <div className="region-mismatch-card" role="status">
                <p className="region-mismatch-text">
                  Step 1 is set to <strong>{formData.territory}</strong>, while <strong>{formData.targetRegion}</strong> is selected here. Both steps must use the same region before continuing.
                </p>
                <div className="region-mismatch-actions">
                  <button
                    type="button"
                    className="region-mismatch-btn primary"
                    onClick={() => updateField('targetRegion', formData.territory)}
                  >
                    Use {formData.territory}
                  </button>
                  <button
                    type="button"
                    className="region-mismatch-btn secondary"
                    onClick={() => updateField('territory', formData.targetRegion)}
                  >
                    Update Step 1 to {formData.targetRegion}
                  </button>
                </div>
              </div>
            )}
            <FieldErrorList id="fp-targetRegion" errors={regionErrors} />
          </div>

          <div className={`form-field ${cityErrors.length ? 'has-errors' : ''}`}>
            <label htmlFor="fp-city">
              <span className="field-label-row">
                <span>Target City / Municipality</span>
                <RequirementBadge required />
              </span>
            </label>
            <p id="fp-city-hint" className="field-help">Enter a city or municipality within your selected region.</p>
            <input
              id="fp-city"
              name="targetCity"
              type="text"
              className="form-input"
              placeholder="Enter city or municipality"
              aria-required="true"
              aria-invalid={cityErrors.length > 0}
              aria-describedby={`fp-city-hint${cityErrors.length ? ' fp-city-error' : ''}`}
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

        <div id="fp-planOpeningTimeline" tabIndex={-1} role="group" aria-labelledby="fp-timeline-label" aria-describedby={`fp-timeline-hint${timelineErrors.length ? ' fp-planOpeningTimeline-error' : ''}`} className={`form-field ${timelineErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span id="fp-timeline-label" className="field-label-text">When would you like to open?</span>
            <RequirementBadge required />
          </span>
          <p id="fp-timeline-hint" className="field-help">Choose your current estimate. You can change it here, including if you are still exploring; this is not a confirmed opening date.</p>
          <div className="plan-timeline-options">
            {Object.entries(PLAN_TIMELINE_LABELS).map(([value, label]) => <ToggleOption
              key={value}
              label={label}
              selected={formData.planOpeningTimeline === value}
              onClick={() => updateField('planOpeningTimeline', value)}
            />)}
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
