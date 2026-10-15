import {
  BiDollar,
  BiTrendingUp,
  BiShield,
  BiLockAlt,
  BiWallet,
  BiBuildingHouse,
  BiHomeAlt,
  BiBriefcase,
} from 'react-icons/bi';
import {
  ToggleGroup,
  ToggleOption,
  CardSelector,
} from '../../../components/FormElements';
import './Steps.css';

const INVESTMENT_SOURCES = [
  { key: 'personal-savings', icon: BiWallet, title: 'Personal Savings' },
  { key: 'bank-loan', icon: BiBuildingHouse, title: 'Bank Loan' },
  { key: 'family-support', icon: BiHomeAlt, title: 'Family Support' },
  { key: 'business-partner', icon: BiBriefcase, title: 'Business Partner' },
  { key: 'other', icon: () => <span style={{ width: 14 }}></span>, title: 'Other' },
];

const FinancialCapability = ({ formData, updateField }) => {
  const investmentSources = formData.investmentSources || [];

  const toggleSource = (key) => {
    const updated = investmentSources.includes(key)
      ? investmentSources.filter((s) => s !== key)
      : [...investmentSources, key];
    updateField('investmentSources', updated);
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="step-header-centered">
        <div className="step-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
          <BiDollar />
        </div>
        <h2 className="step-title">Your Financial Readiness</h2>
        <p className="step-subtitle">Understanding your financial capacity helps us guide you better</p>
        <div className="confidential-badge mt-3">
          <BiLockAlt /> Financial details you enter here remain in your browser session only
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title">
          <BiTrendingUp className="section-icon" /> Available Capital
        </h3>

        <div className="highlight-box">
          <div className="form-field">
            <label htmlFor="fc-capital">Total liquid capital available for this investment <span className="text-red">*</span></label>
            <input
              id="fc-capital"
              type="text"
              className="form-input"
              placeholder="₱"
              value={formData.totalLiquidCapital || ''}
              onChange={(e) => updateField('totalLiquidCapital', e.target.value)}
            />
            <span className="upload-hint text-left">Enter the total amount you have readily available to invest.</span>
          </div>

          <div className="form-field mt-4">
            <label>Source of investment funds <span className="text-red">*</span> <span className="font-normal text-gray">(Select all that apply)</span></label>
            <div className="card-selector-group two-cols-mobile mt-2">
              {INVESTMENT_SOURCES.slice(0, 4).map((src) => (
                <CardSelector
                  key={src.key}
                  icon={src.icon}
                  iconStyle="red"
                  title={src.title}
                  selected={investmentSources.includes(src.key)}
                  onClick={() => toggleSource(src.key)}
                />
              ))}
            </div>
            <div className="mt-3">
              <CardSelector
                icon={INVESTMENT_SOURCES[4].icon}
                iconStyle="red"
                title="Other"
                selected={investmentSources.includes('other')}
                onClick={() => toggleSource('other')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title">
          <BiShield className="section-icon" /> Financial Situation
        </h3>

        <div className="highlight-box">
          <div className="form-field">
            <label className="mb-2">Do you currently have an active source of income aside from this investment?</label>
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

          <div className="form-field mt-4">
            <label className="mb-2">Will this franchise be your primary income source after launch?</label>
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

          <div className="form-field mt-4">
            <label className="mb-2">Do you have existing debts or financial obligations that may affect your investment?</label>
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
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title">
          <BiShield className="section-icon" /> Financial Declarations
        </h3>

        <div className="highlight-box">
          <div className="form-field">
            <label className="mb-2">I have never filed for bankruptcy or insolvency</label>
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

          <div className="form-field mt-4">
            <label className="mb-2">I have no pending legal cases related to financial fraud or business misconduct</label>
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
        </div>
      </div>

    </div>
  );
};

export default FinancialCapability;
