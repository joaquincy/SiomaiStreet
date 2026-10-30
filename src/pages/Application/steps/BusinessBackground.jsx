import {
  BiBriefcase,
  BiTrendingUp,
  BiPlus,
  BiTrash,
} from 'react-icons/bi';
import {
  ToggleGroup,
  ToggleOption,
  FormSelect,
  ChipGroup,
  Chip,
} from '../../../components/FormElements';
import { RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import DatePickerInput from '../../../components/DatePickerInput';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';
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
  const positions = formData.additionalPositions || [];
  const feedback = useApplicationFeedback();

  const updatePosition = (index, patch) =>
    updateField(
      'additionalPositions',
      positions.map((position, i) => (i === index ? { ...position, ...patch } : position))
    );

  const toggleOperational = (area) => {
    const updated = operationalExperience.includes(area)
      ? operationalExperience.filter((a) => a !== area)
      : [...operationalExperience, area];
    updateField('operationalExperience', updated);
  };

  const historyErrors = feedback.errorsFor('bb-employmentHistory');
  const jobTitleErrors = feedback.errorsFor('bb-jobTitle');
  const companyErrors = feedback.errorsFor('bb-company');
  const startDateErrors = feedback.errorsFor('bb-startDate');
  const endDateErrors = feedback.errorsFor('bb-endDate');

  return (
    <div className="step-content">
      <header className="step-intro">
        <div className="step-intro-icon red" aria-hidden="true">
          <BiBriefcase />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 03 · Experience &amp; Operations</span>
          <h2 id="bb-step-title" tabIndex={-1} className="step-intro-title">
            Tell Us About Your <span className="title-highlight">Professional Journey</span>
          </h2>
          <p className="step-intro-subtitle">
            Share your work, management, or business history so we can tailor operational training and support. <strong>First-time applicants</strong> without prior employment history are welcome.
          </p>
        </div>
      </header>

      <section className="form-section" id="bb-employmentHistory" tabIndex={-1}>
        <h3 className="section-title">
          <BiBriefcase className="section-icon" aria-hidden="true" />
          <span>Section A: Employment History</span>
          <RequirementBadge conditional="Conditional" />
        </h3>
        <p className="field-help">
          Include employment or self-employment if applicable. You do not need to invent a job to apply; if you provide history, Job Title and Company Name are required.
        </p>

        <ToggleGroup>
          <ToggleOption
            label="Provide employment or self-employment history"
            selected={formData.employmentHistory !== 'none'}
            onClick={() => updateField('employmentHistory', 'provided')}
          />
          <ToggleOption
            label="No employment history (clears employment entries)"
            selected={formData.employmentHistory === 'none'}
            onClick={() => {
              updateField('employmentHistory', 'none');
              for (const field of ['jobTitle', 'company', 'jobStartDate', 'jobEndDate', 'industry', 'keyResponsibilities']) {
                updateField(field, '');
              }
              updateField('currentEmployment', false);
              updateField('additionalPositions', []);
            }}
          />
        </ToggleGroup>
        <FieldErrorList id="bb-employmentHistory" errors={historyErrors} />

        {formData.employmentHistory !== 'none' && (
          <>
            <div className="employment-box">
              <div className="form-row two-cols">
                <div className={`form-field ${jobTitleErrors.length ? 'has-errors' : ''}`}>
                  <label htmlFor="bb-jobTitle">
                    <span className="field-label-row">
                      <span>Job Title / Self-employed Role</span>
                      <RequirementBadge required />
                    </span>
                  </label>
                  <p className="field-help">For example Store Manager, Operations Supervisor, or Business Owner.</p>
                  <input
                    id="bb-jobTitle"
                    name="jobTitle"
                    type="text"
                    className="form-input"
                    aria-required="true"
                    aria-invalid={jobTitleErrors.length > 0}
                    value={formData.jobTitle || ''}
                    onChange={(e) => updateField('jobTitle', e.target.value)}
                  />
                  <FieldErrorList id="bb-jobTitle" errors={jobTitleErrors} />
                </div>

                <div className={`form-field ${companyErrors.length ? 'has-errors' : ''}`}>
                  <label htmlFor="bb-company">
                    <span className="field-label-row">
                      <span>Company / Business Name</span>
                      <RequirementBadge required />
                    </span>
                  </label>
                  <p className="field-help">Enter the registered or trade name of the organization.</p>
                  <input
                    id="bb-company"
                    name="company"
                    type="text"
                    className="form-input"
                    aria-required="true"
                    aria-invalid={companyErrors.length > 0}
                    value={formData.company || ''}
                    onChange={(e) => updateField('company', e.target.value)}
                  />
                  <FieldErrorList id="bb-company" errors={companyErrors} />
                </div>
              </div>

              <div className="form-row three-cols">
                <div className={`form-field ${startDateErrors.length ? 'has-errors' : ''}`}>
                  <label htmlFor="bb-startDate">
                    <span className="field-label-row">
                      <span>Start Date</span>
                      <RequirementBadge required={false} />
                    </span>
                  </label>
                  <DatePickerInput
                    id="bb-startDate"
                    name="jobStartDate"
                    ariaInvalid={startDateErrors.length > 0}
                    value={formData.jobStartDate || ''}
                    onChange={(val) => updateField('jobStartDate', val)}
                  />
                  <FieldErrorList id="bb-startDate" errors={startDateErrors} />
                </div>

                <div className={`form-field ${endDateErrors.length ? 'has-errors' : ''}`}>
                  <label htmlFor="bb-endDate">
                    <span className="field-label-row">
                      <span>End Date</span>
                      <RequirementBadge required={false} />
                    </span>
                  </label>
                  <DatePickerInput
                    id="bb-endDate"
                    name="jobEndDate"
                    disabled={formData.currentEmployment === true}
                    ariaInvalid={endDateErrors.length > 0}
                    value={formData.jobEndDate || ''}
                    onChange={(val) => updateField('jobEndDate', val)}
                  />
                  <FieldErrorList id="bb-endDate" errors={endDateErrors} />
                </div>

                <div className="form-field">
                  <label htmlFor="bb-industry">
                    <span className="field-label-row">
                      <span>Industry</span>
                      <RequirementBadge required={false} />
                    </span>
                  </label>
                  <input
                    id="bb-industry"
                    name="industry"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Food & Beverage, Retail"
                    value={formData.industry || ''}
                    onChange={(e) => updateField('industry', e.target.value)}
                  />
                </div>
              </div>

              <label className="native-radio">
                <input
                  type="checkbox"
                  checked={formData.currentEmployment === true}
                  onChange={(event) => {
                    updateField('currentEmployment', event.target.checked);
                    if (event.target.checked) updateField('jobEndDate', '');
                  }}
                />
                <span>I currently work here (clears End Date)</span>
              </label>

              <div className="form-field">
                <label htmlFor="bb-responsibilities">
                  <span className="field-label-row">
                    <span>Key Responsibilities</span>
                    <RequirementBadge required={false} />
                  </span>
                </label>
                <p className="field-help">Summarize your core duties, team oversight, or operational scope.</p>
                <textarea
                  id="bb-responsibilities"
                  name="keyResponsibilities"
                  className="form-textarea"
                  rows="3"
                  value={formData.keyResponsibilities || ''}
                  onChange={(e) => updateField('keyResponsibilities', e.target.value)}
                />
              </div>
            </div>

            {positions.map((position, index) => {
              const posId = `bb-position-${index}`;
              const posErrors = feedback.errorsFor(posId);
              return (
                <fieldset
                  id={posId}
                  tabIndex={-1}
                  className={`employment-box additional-position-box ${posErrors.length ? 'has-errors' : ''}`}
                  key={position.id}
                >
                  <legend className="position-legend">
                    <span>Additional Position {index + 1}</span>
                    <button
                      type="button"
                      className="btn-text-red"
                      aria-label={`Remove additional position ${index + 1}`}
                      onClick={() =>
                        updateField(
                          'additionalPositions',
                          positions.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <BiTrash aria-hidden="true" />
                      <span>Remove Position</span>
                    </button>
                  </legend>

                  <div className="form-row two-cols">
                    {[
                      ['jobTitle', 'Job Title', 'text', true],
                      ['company', 'Company Name', 'text', true],
                      ['startDate', 'Start Date', 'date', false],
                      ['endDate', 'End Date', 'date', false],
                      ['industry', 'Industry', 'text', false],
                    ].map(([field, label, type, req]) => (
                      <div className="form-field" key={field}>
                        <label htmlFor={`position-${position.id}-${field}`}>
                          <span className="field-label-row">
                            <span>{label}</span>
                            <RequirementBadge required={req} />
                          </span>
                        </label>
                        {type === 'date' ? (
                          <DatePickerInput
                            id={`position-${position.id}-${field}`}
                            disabled={field === 'endDate' && position.current === true}
                            value={position[field] || ''}
                            onChange={(val) => updatePosition(index, { [field]: val })}
                          />
                        ) : (
                          <input
                            id={`position-${position.id}-${field}`}
                            className="form-input"
                            type={type}
                            disabled={field === 'endDate' && position.current === true}
                            value={position[field] || ''}
                            onChange={(event) => updatePosition(index, { [field]: event.target.value })}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <label className="native-radio">
                    <input
                      type="checkbox"
                      checked={position.current === true}
                      onChange={(event) =>
                        updatePosition(index, {
                          current: event.target.checked,
                          ...(event.target.checked ? { endDate: '' } : {}),
                        })
                      }
                    />
                    <span>I currently work here</span>
                  </label>

                  <div className="form-field">
                    <label htmlFor={`position-${position.id}-responsibilities`}>
                      <span className="field-label-row">
                        <span>Key Responsibilities</span>
                        <RequirementBadge required={false} />
                      </span>
                    </label>
                    <textarea
                      id={`position-${position.id}-responsibilities`}
                      className="form-textarea"
                      rows="3"
                      value={position.keyResponsibilities || ''}
                      onChange={(event) => updatePosition(index, { keyResponsibilities: event.target.value })}
                    />
                  </div>

                  <FieldErrorList id={posId} errors={posErrors} />
                </fieldset>
              );
            })}

            <div className="position-actions-row">
              <button
                type="button"
                className="btn-text-red add-position-btn"
                disabled={positions.length >= 20}
                onClick={() =>
                  updateField('additionalPositions', [
                    ...positions,
                    { id: crypto.randomUUID(), current: false },
                  ])
                }
              >
                <BiPlus aria-hidden="true" />
                <span>Add Another Position</span>
              </button>
              {positions.length >= 20 && (
                <p className="field-help">Maximum of 20 additional positions reached.</p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <span>Section B: Prior Business Ownership</span>
          <RequirementBadge required={false} />
        </h3>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Have you previously owned or co-owned a business?</span>
            <RequirementBadge required={false} />
          </span>
          <div className="radio-inline-group">
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
        </div>

        <div className="form-field">
          <label htmlFor="bb-priorBusinessDesc">
            <span className="field-label-row">
              <span>Prior Business Summary</span>
              <RequirementBadge required={false} />
            </span>
          </label>
          <p className="field-help">If applicable, briefly describe the nature, size, and years of operation of your business.</p>
          <textarea
            id="bb-priorBusinessDesc"
            name="priorBusinessDescription"
            className="form-textarea"
            placeholder="Briefly describe your business..."
            rows="3"
            value={formData.priorBusinessDescription || ''}
            onChange={(e) => updateField('priorBusinessDescription', e.target.value)}
          />
        </div>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Do you have experience in the food service or hospitality industry?</span>
            <RequirementBadge required={false} />
          </span>
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
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <span>Section C: Management &amp; Operations Experience</span>
          <RequirementBadge required={false} />
        </h3>

        <div className="form-row two-cols">
          <div className="form-field">
            <label htmlFor="bb-teamSize">
              <span className="field-label-row">
                <span>Largest team size managed</span>
                <RequirementBadge required={false} />
              </span>
            </label>
            <p className="field-help">For example 5 staff members, 15 employees, or None yet.</p>
            <input
              id="bb-teamSize"
              name="largestTeamSize"
              type="text"
              className="form-input"
              value={formData.largestTeamSize || ''}
              onChange={(e) => updateField('largestTeamSize', e.target.value)}
            />
          </div>

          <div className="form-field">
            <span className="field-label-row">
              <span className="field-label-text">Years of management experience</span>
              <RequirementBadge required={false} />
            </span>
            <p className="field-help">Total years supervising people, projects, or store operations.</p>
            <FormSelect
              id="bb-managementYears"
              options={['Less than 1 year', '1-3 years', '3-5 years', '5+ years']}
              placeholder="Select experience range"
              value={formData.managementYears}
              onChange={(val) => updateField('managementYears', val)}
              ariaLabel="Years of management experience"
            />
          </div>
        </div>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Operational experience areas (select all that apply)</span>
            <RequirementBadge required={false} />
          </span>
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
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <BiTrendingUp className="section-icon" aria-hidden="true" />
          <span>Section D: Lifestyle &amp; Commitment</span>
          <RequirementBadge required={false} />
        </h3>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Are you planning to personally operate the business day-to-day?</span>
            <RequirementBadge required={false} />
          </span>
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

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">How many hours per week can you dedicate to the business?</span>
            <RequirementBadge required={false} />
          </span>
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
      </section>
    </div>
  );
};

export default BusinessBackground;
