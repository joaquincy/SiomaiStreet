import {
  BiTargetLock,
  BiStore,
  BiMap,
  BiCalendarEvent,
  BiCart,
  BiRestaurant,
} from 'react-icons/bi';
import {
  ToggleGroup,
  ToggleOption,
  FormSelect,
  ChipGroup,
  Chip,
} from '../../../components/FormElements';
import { REGIONS } from '../../../data/stepsConfig';
import './Steps.css';

const SITE_TYPES = [
  'SM Mall', 'Robinsons Mall', 'Puregold', 'Wet Market', 'Public Market',
  'School', 'University', 'Office Building', 'Hospital', 'Roadside',
  'Residential Area', 'Transport Terminal', 'Others',
];

const FranchisePlan = ({ formData, updateField }) => {
  const siteTypes = formData.siteTypes || [];

  const toggleSiteType = (type) => {
    const updated = siteTypes.includes(type)
      ? siteTypes.filter((t) => t !== type)
      : [...siteTypes, type];
    updateField('siteTypes', updated);
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="step-header-centered">
        <div className="step-icon-wrapper" style={{ background: 'rgba(245, 166, 35, 0.15)', color: '#f5a623' }}>
          <BiTargetLock />
        </div>
        <h2 className="step-title">Your Franchise Vision</h2>
        <p className="step-subtitle">Tell us where and how you want to build your branch</p>
      </div>

      <div className="form-section mt-2">
        <h3 className="section-title">
          <BiStore className="section-icon" /> Package Selection
        </h3>

        <div className="highlight-box">
          <div className="form-field">
            <label className="mb-3">Which franchise package are you applying for?</label>
            <div className="package-cards-grid">
              {/* Food Cart Package */}
              <div
                className={`package-card ${formData.selectedPackage === 'food-cart' ? 'selected' : ''}`}
                onClick={() => updateField('selectedPackage', 'food-cart')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateField('selectedPackage', 'food-cart'); } }}
                aria-pressed={formData.selectedPackage === 'food-cart'}
              >
                <div className="package-card-icon">
                  <BiCart />
                </div>
                <h4 className="package-title">Food Cart</h4>
                <p className="package-desc">Compact, mobile-ready, perfect for events and markets</p>
                <div className="package-price">₱150,000</div>
                <ul className="package-features">
                  <li>Mobile setup</li>
                  <li>Quick deployment</li>
                  <li>Low overhead</li>
                </ul>
              </div>

              {/* Kiosk Package */}
              <div
                className={`package-card ${formData.selectedPackage === 'kiosk' ? 'selected' : ''}`}
                onClick={() => updateField('selectedPackage', 'kiosk')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateField('selectedPackage', 'kiosk'); } }}
                aria-pressed={formData.selectedPackage === 'kiosk'}
              >
                <div className="package-card-icon">
                  <BiStore />
                </div>
                <h4 className="package-title">Kiosk</h4>
                <p className="package-desc">Semi-permanent, high foot traffic areas</p>
                <div className="package-price">₱300,000</div>
                <ul className="package-features">
                  <li>Semi-permanent</li>
                  <li>Mall ready</li>
                  <li>Higher capacity</li>
                </ul>
              </div>

              {/* Casual Dining Package */}
              <div
                className={`package-card ${formData.selectedPackage === 'casual-dining' ? 'selected' : ''}`}
                onClick={() => updateField('selectedPackage', 'casual-dining')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateField('selectedPackage', 'casual-dining'); } }}
                aria-pressed={formData.selectedPackage === 'casual-dining'}
              >
                <div className="package-card-icon">
                  <BiRestaurant />
                </div>
                <h4 className="package-title">Casual Dining</h4>
                <p className="package-desc">Full dining experience, sit-in customers</p>
                <div className="package-price">₱500,000</div>
                <ul className="package-features">
                  <li>Complete setup</li>
                  <li>Dine-in experience</li>
                  <li>Premium branding</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title">
          <BiMap className="section-icon" /> Location Details
        </h3>

        <div className="highlight-box">
          <div className="form-row two-cols">
            <div className="form-field">
              <label>Target Region <span className="text-red">*</span></label>
              <FormSelect
                options={REGIONS}
                placeholder="Select region"
                value={formData.targetRegion}
                onChange={(val) => updateField('targetRegion', val)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="fp-city">Target City / Municipality <span className="text-red">*</span></label>
              <input
                id="fp-city"
                type="text"
                className="form-input"
                placeholder="e.g., Quezon City, Metro Manila"
                value={formData.targetCity || ''}
                onChange={(e) => updateField('targetCity', e.target.value)}
              />
            </div>
          </div>

          <div className="form-field mt-4">
            <label className="mb-2">Proposed Site Type <span className="font-normal text-gray">(Select all that apply)</span></label>
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
          </div>

          <div className="highlight-box-blue mt-4">
            <div className="form-field">
              <label className="mb-2">Do you already have a specific location or space in mind?</label>
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
            </div>
          </div>

          <div className="form-field mt-4">
            <label className="mb-2">Are you open to our team recommending an alternative location?</label>
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
          </div>
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title">
          <BiCalendarEvent className="section-icon" /> Timeline &amp; Future Plans
        </h3>

        <div className="highlight-box">
          <div className="form-field">
            <label className="mb-2">When are you hoping to open? <span className="text-red">*</span></label>
            <div className="card-selector-group four-cols-mobile">
              <ToggleOption
                label="Within 3 months"
                selected={formData.planOpeningTimeline === 'within-3-months'}
                onClick={() => updateField('planOpeningTimeline', 'within-3-months')}
              />
              <ToggleOption
                label="3 - 6 months"
                selected={formData.planOpeningTimeline === '3-6-months'}
                onClick={() => updateField('planOpeningTimeline', '3-6-months')}
              />
              <ToggleOption
                label="6 - 12 months"
                selected={formData.planOpeningTimeline === '6-12-months'}
                onClick={() => updateField('planOpeningTimeline', '6-12-months')}
              />
              <ToggleOption
                label="Just planning for now"
                selected={formData.planOpeningTimeline === 'just-planning'}
                onClick={() => updateField('planOpeningTimeline', 'just-planning')}
              />
            </div>
          </div>

          <div className="form-field mt-4">
            <label className="mb-2">Are you interested in opening more than one branch in the future?</label>
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

          <div className="form-field mt-4">
            <label htmlFor="fp-additional" className="mb-2">Any other details you'd like us to know about your plan? (Optional)</label>
            <textarea
              id="fp-additional"
              className="form-textarea"
              rows="4"
              placeholder="Share any additional information about your franchise plans..."
              value={formData.additionalPlanDetails || ''}
              onChange={(e) => updateField('additionalPlanDetails', e.target.value)}
            ></textarea>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FranchisePlan;
