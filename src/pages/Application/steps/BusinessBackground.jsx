import {
  BiBriefcase,
  BiTrendingUp,
  BiPlus,
} from 'react-icons/bi';
import {
  ToggleGroup,
  ToggleOption,
  FormSelect,
  ChipGroup,
  Chip,
} from '../../../components/FormElements';
import './Steps.css';

const OPERATIONAL_AREAS = [
  'Inventory Management',
  'HR & Staffing',
  'Customer Service',
  'Sales & Marketing',
  'Financial Reporting',
  'Supply Chain',
  'Multi-Site Operations',
];

const BusinessBackground = ({ formData, updateField }) => {
  const operationalExperience = formData.operationalExperience || [];

  const toggleOperational = (area) => {
    const updated = operationalExperience.includes(area)
      ? operationalExperience.filter((a) => a !== area)
      : [...operationalExperience, area];
    updateField('operationalExperience', updated);
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="step-header-centered">
        <div className="step-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
          <BiBriefcase />
        </div>
        <h2 className="step-title">Tell us about your professional journey</h2>
        <p className="step-subtitle">Your experience helps us understand your management style.</p>
      </div>

      <div className="form-section">
        <h3 className="section-title">
          <BiBriefcase className="section-icon" /> Section A: Employment History
        </h3>

        <div className="highlight-box employment-box">
          <div className="form-row two-cols">
            <div className="form-field">
              <label htmlFor="bb-jobTitle">Job Title</label>
              <input
                id="bb-jobTitle"
                type="text"
                className="form-input"
                value={formData.jobTitle || ''}
                onChange={(e) => updateField('jobTitle', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="bb-company">Company Name</label>
              <input
                id="bb-company"
                type="text"
                className="form-input"
                value={formData.company || ''}
                onChange={(e) => updateField('company', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row three-cols mt-3">
            <div className="form-field">
              <label htmlFor="bb-startDate">Start Date</label>
              <input
                id="bb-startDate"
                type="date"
                className="form-input"
                value={formData.jobStartDate || ''}
                onChange={(e) => updateField('jobStartDate', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="bb-endDate">End Date</label>
              <input
                id="bb-endDate"
                type="date"
                className="form-input"
                value={formData.jobEndDate || ''}
                onChange={(e) => updateField('jobEndDate', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="bb-industry">Industry</label>
              <input
                id="bb-industry"
                type="text"
                className="form-input"
                value={formData.industry || ''}
                onChange={(e) => updateField('industry', e.target.value)}
              />
            </div>
          </div>

          <div className="form-field mt-3">
            <label htmlFor="bb-responsibilities">Key Responsibilities</label>
            <textarea
              id="bb-responsibilities"
              className="form-textarea"
              rows="3"
              value={formData.keyResponsibilities || ''}
              onChange={(e) => updateField('keyResponsibilities', e.target.value)}
            ></textarea>
          </div>
        </div>

        <button type="button" className="btn-text-red mt-2">
          <BiPlus /> Add Another Position
        </button>
      </div>

      <div className="form-section">
        <h3 className="section-title">Section B: Prior Business Ownership</h3>
        <hr className="section-divider" />

        <div className="radio-inline-group mt-2">
          <label className="native-radio">
            <input
              type="radio"
              name="priorBusiness"
              value="yes"
              checked={formData.priorBusinessOwned === 'yes'}
              onChange={() => updateField('priorBusinessOwned', 'yes')}
            />
            <span>Yes</span>
          </label>
          <label className="native-radio">
            <input
              type="radio"
              name="priorBusiness"
              value="no"
              checked={formData.priorBusinessOwned !== 'yes'}
              onChange={() => updateField('priorBusinessOwned', 'no')}
            />
            <span>No</span>
          </label>
        </div>

        <div className="form-field mt-3">
          <textarea
            className="form-textarea"
            placeholder="Briefly describe your business..."
            rows="3"
            value={formData.priorBusinessDescription || ''}
            onChange={(e) => updateField('priorBusinessDescription', e.target.value)}
          ></textarea>
        </div>

        <div className="highlight-box-yellow mt-3">
          <div className="form-field">
            <label className="mb-2">Do you have experience in the food industry?</label>
            <ToggleGroup>
              <ToggleOption
                label="Yes"
                selected={formData.foodIndustryExperience === 'yes'}
                onClick={() => updateField('foodIndustryExperience', 'yes')}
              />
              <ToggleOption
                label="No"
                selected={formData.foodIndustryExperience !== 'yes'}
                onClick={() => updateField('foodIndustryExperience', 'no')}
              />
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Section C: Management &amp; Operations Experience</h3>

        <div className="form-row two-cols mt-2">
          <div className="form-field">
            <label htmlFor="bb-teamSize">Largest team size managed</label>
            <input
              id="bb-teamSize"
              type="text"
              className="form-input"
              value={formData.largestTeamSize || ''}
              onChange={(e) => updateField('largestTeamSize', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Years of management experience</label>
            <FormSelect
              options={['Less than 1 year', '1-3 years', '3-5 years', '5+ years']}
              placeholder="Select..."
              value={formData.managementYears}
              onChange={(val) => updateField('managementYears', val)}
            />
          </div>
        </div>

        <div className="form-field mt-4">
          <label>Operational experience areas (select all that apply)</label>
          <ChipGroup>
            {OPERATIONAL_AREAS.map((area) => (
              <Chip
                key={area}
                label={area}
                selected={operationalExperience.includes(area)}
                onClick={() => toggleOperational(area)}
              />
            ))}
          </ChipGroup>
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title">
          <BiTrendingUp className="section-icon" /> Lifestyle &amp; Commitment
        </h3>

        <div className="form-field mt-3">
          <label className="mb-2">Are you planning to personally operate the business day-to-day?</label>
          <div className="card-selector-group three-cols">
            <ToggleOption
              label="Yes"
              selected={formData.personallyOperate === 'yes'}
              onClick={() => updateField('personallyOperate', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.personallyOperate === 'no'}
              onClick={() => updateField('personallyOperate', 'no')}
            />
            <ToggleOption
              label="With a trusted Manager"
              selected={formData.personallyOperate === 'with-manager'}
              onClick={() => updateField('personallyOperate', 'with-manager')}
            />
          </div>
        </div>

        <div className="form-field mt-4">
          <label className="mb-2">How many hours per week can you dedicate to the business?</label>
          <div className="card-selector-group three-cols">
            <ToggleOption
              label="Less than 20"
              selected={formData.weeklyHours === 'less-than-20'}
              onClick={() => updateField('weeklyHours', 'less-than-20')}
            />
            <ToggleOption
              label="20-40+"
              selected={formData.weeklyHours === '20-40+'}
              onClick={() => updateField('weeklyHours', '20-40+')}
            />
            <ToggleOption
              label="Full-time"
              selected={formData.weeklyHours === 'full-time'}
              onClick={() => updateField('weeklyHours', 'full-time')}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default BusinessBackground;
