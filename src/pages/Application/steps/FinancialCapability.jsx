import {
  BiDollar,
  BiTrendingUp,
  BiShield,
  BiLockAlt,
  BiWallet,
  BiBuildingHouse,
  BiHomeAlt,
  BiBriefcase,
  BiLayer,
} from 'react-icons/bi';
import {
  ToggleGroup,
  ToggleOption,
  CardSelector,
} from '../../../components/FormElements';
import { RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';
import './Steps.css';

const INVESTMENT_SOURCES = [
  { key: 'personal-savings', icon: BiWallet, title: 'Personal Savings', subtitle: 'Cash deposits or liquid personal accounts' },
  { key: 'bank-loan', icon: BiBuildingHouse, title: 'Bank Loan', subtitle: 'Commercial credit line or business loan' },
  { key: 'family-support', icon: BiHomeAlt, title: 'Family Support', subtitle: 'Family-backed capital contribution' },
  { key: 'business-partner', icon: BiBriefcase, title: 'Business Partner', subtitle: 'Co-investor or equity partner funds' },
  { key: 'other', icon: BiLayer, title: 'Other', subtitle: 'Asset sale, dividends, or other verified funds' },
];

const FinancialCapability = ({ formData, updateField }) => {
  const investmentSources = formData.investmentSources || [];
  const feedback = useApplicationFeedback();
  const capitalErrors = feedback.errorsFor('fc-capital');
  const sourceErrors = feedback.errorsFor('fc-investmentSources');

  const toggleSource = (key) => {
    const updated = investmentSources.includes(key)
      ? investmentSources.filter((s) => s !== key)
      : [...investmentSources, key];
    updateField('investmentSources', updated);
  };

  return (
    <div className="step-content">
      <header className="step-intro">
        <div className="step-intro-icon saffron" aria-hidden="true">
          <BiDollar />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 04 · Capital &amp; Funding Structure</span>
          <h2 id="fc-step-title" tabIndex={-1} className="step-intro-title">
            Your <span className="title-highlight">Financial Readiness</span>
          </h2>
          <p className="step-intro-subtitle">
            Understanding your <strong>available capital</strong> and <strong>funding sources</strong> helps us recommend an appropriate franchise format.
          </p>
          <div className="confidential-badge">
            <BiLockAlt aria-hidden="true" />
            <span>Financial answers may be saved on this device and are sent to the server when you submit.</span>
          </div>
        </div>
      </header>

      <section className="form-section">
        <h3 className="section-title">
          <BiTrendingUp className="section-icon" aria-hidden="true" />
          <span>Available Capital</span>
        </h3>

        <div className={`form-field ${capitalErrors.length ? 'has-errors' : ''}`}>
          <label htmlFor="fc-capital">
            <span className="field-label-row">
              <span>Total liquid capital available for this investment (PHP)</span>
              <RequirementBadge required />
            </span>
          </label>
          <p className="field-help">
            Enter a positive amount in Philippine Pesos using digits and optional commas or decimals, for example 350,000 or 500000.00.
          </p>
          <input
            id="fc-capital"
            name="totalLiquidCapital"
            type="text"
            inputMode="decimal"
            className="form-input"
            placeholder="e.g., 350,000"
            aria-required="true"
            aria-invalid={capitalErrors.length > 0}
            value={formData.totalLiquidCapital || ''}
            onChange={(e) => updateField('totalLiquidCapital', e.target.value)}
          />
          <FieldErrorList id="fc-capital" errors={capitalErrors} />
        </div>

        <div id="fc-investmentSources" tabIndex={-1} className={`form-field ${sourceErrors.length ? 'has-errors' : ''}`}>
          <span className="field-label-row">
            <span className="field-label-text">Source of investment funds (select all that apply)</span>
            <RequirementBadge required />
          </span>
          <p className="field-help">
            Select at least one funding source. Currently selected: {investmentSources.length}.
          </p>
          <div className="card-selector-group two-cols-mobile">
            {INVESTMENT_SOURCES.map((src) => (
              <CardSelector
                key={src.key}
                icon={src.icon}
                iconStyle="red"
                title={src.title}
                subtitle={src.subtitle}
                selected={investmentSources.includes(src.key)}
                onClick={() => toggleSource(src.key)}
              />
            ))}
          </div>
          <FieldErrorList id="fc-investmentSources" errors={sourceErrors} />
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <BiShield className="section-icon" aria-hidden="true" />
          <span>Financial Situation</span>
          <RequirementBadge required={false} />
        </h3>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Do you currently have an active source of income aside from this investment?</span>
            <RequirementBadge required={false} />
          </span>
          <ToggleGroup>
            <ToggleOption
              label="Yes"
              selected={formData.activeIncome === 'yes'}
              onClick={() => updateField('activeIncome', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.activeIncome === 'no'}
              onClick={() => updateField('activeIncome', 'no')}
            />
          </ToggleGroup>
        </div>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Will this franchise be your primary income source after launch?</span>
            <RequirementBadge required={false} />
          </span>
          <div className="card-selector-group three-cols">
            <ToggleOption
              label="Yes"
              selected={formData.primaryIncomeSource === 'yes'}
              onClick={() => updateField('primaryIncomeSource', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.primaryIncomeSource === 'no'}
              onClick={() => updateField('primaryIncomeSource', 'no')}
            />
            <ToggleOption
              label="One of Several"
              selected={formData.primaryIncomeSource === 'one-of-several'}
              onClick={() => updateField('primaryIncomeSource', 'one-of-several')}
            />
          </div>
        </div>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">Do you have existing debts or financial obligations that may affect your investment?</span>
            <RequirementBadge required={false} />
          </span>
          <ToggleGroup>
            <ToggleOption
              label="Yes"
              selected={formData.existingDebts === 'yes'}
              onClick={() => updateField('existingDebts', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.existingDebts === 'no'}
              onClick={() => updateField('existingDebts', 'no')}
            />
          </ToggleGroup>
        </div>
      </section>

      <section className="form-section">
        <h3 className="section-title">
          <BiShield className="section-icon" aria-hidden="true" />
          <span>Financial Declarations</span>
          <RequirementBadge required={false} />
        </h3>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">I have never filed for bankruptcy or insolvency</span>
            <RequirementBadge required={false} />
          </span>
          <ToggleGroup>
            <ToggleOption
              label="Yes"
              selected={formData.neverBankruptcy === 'yes'}
              onClick={() => updateField('neverBankruptcy', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.neverBankruptcy === 'no'}
              onClick={() => updateField('neverBankruptcy', 'no')}
            />
          </ToggleGroup>
        </div>

        <div className="form-field">
          <span className="field-label-row">
            <span className="field-label-text">I have no pending legal cases related to financial fraud or business misconduct</span>
            <RequirementBadge required={false} />
          </span>
          <ToggleGroup>
            <ToggleOption
              label="Yes"
              selected={formData.noPendingCases === 'yes'}
              onClick={() => updateField('noPendingCases', 'yes')}
            />
            <ToggleOption
              label="No"
              selected={formData.noPendingCases === 'no'}
              onClick={() => updateField('noPendingCases', 'no')}
            />
          </ToggleGroup>
        </div>
      </section>
    </div>
  );
};

export default FinancialCapability;
