import {
  BiHeart,
} from 'react-icons/bi';
import {
  ToggleOption,
  RadioGroup,
  RadioOption,
} from '../../../components/FormElements';
import './Steps.css';

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

  const toggleBrandValue = (value) => {
    if (brandValues.includes(value)) {
      updateField('brandValues', brandValues.filter((v) => v !== value));
    } else if (brandValues.length < 3) {
      updateField('brandValues', [...brandValues, value]);
    }
  };

  return (
    <div className="step-content animate-fade-in">
      <div className="step-header-centered">
        <div className="step-icon-wrapper" style={{ background: 'rgba(245, 166, 35, 0.15)', color: '#f5a623' }}>
          <BiHeart />
        </div>
        <h2 className="step-title">Tell us who you are and why you belong in our family</h2>
        <p className="step-subtitle">We want to partner with those who share our passion and vision.</p>
      </div>

      <div className="form-section mt-2">
        <div className="form-field">
          <label htmlFor="ba-whyInterested">Why are you interested in this specific franchise?</label>
          <textarea
            id="ba-whyInterested"
            className="form-textarea mt-1"
            rows="4"
            placeholder="Min 100 words..."
            value={formData.whyInterested || ''}
            onChange={(e) => updateField('whyInterested', e.target.value)}
          ></textarea>
        </div>

        <div className="form-field mt-4">
          <label htmlFor="ba-personalValues">What personal values or business principles make you the right franchisee?</label>
          <textarea
            id="ba-personalValues"
            className="form-textarea mt-1"
            rows="4"
            value={formData.personalValues || ''}
            onChange={(e) => updateField('personalValues', e.target.value)}
          ></textarea>
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title text-xl mb-1">Brand Values Alignment</h3>

        <div className="form-field">
          <label className="font-normal mb-2">Select your top 3 values and explain why they matter to you.</label>
          <div className="card-selector-group three-cols">
            {BRAND_VALUES.map((value) => (
              <ToggleOption
                key={value}
                label={value}
                selected={brandValues.includes(value)}
                onClick={() => toggleBrandValue(value)}
              />
            ))}
          </div>
        </div>

        <div className="form-field mt-3">
          <textarea
            className="form-textarea"
            rows="4"
            placeholder="Min 100 words..."
            value={formData.brandValuesExplanation || ''}
            onChange={(e) => updateField('brandValuesExplanation', e.target.value)}
          ></textarea>
        </div>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title text-xl mb-1">Discovery Day Interest</h3>
        <div className="form-field">
          <label className="font-normal mb-2">Would you be willing to attend a Discovery Day / site visit at our headquarters?</label>
          <div className="mt-1">
            <RadioGroup>
              <RadioOption
                label="Yes, definitely"
                selected={formData.discoveryDayInterest === 'yes-definitely'}
                onClick={() => updateField('discoveryDayInterest', 'yes-definitely')}
              />
              <RadioOption
                label="Yes, but remotely preferred"
                selected={formData.discoveryDayInterest === 'yes-remote'}
                onClick={() => updateField('discoveryDayInterest', 'yes-remote')}
              />
              <RadioOption
                label="Not at this time"
                selected={formData.discoveryDayInterest === 'not-now'}
                onClick={() => updateField('discoveryDayInterest', 'not-now')}
              />
            </RadioGroup>
          </div>
        </div>
      </div>

    </div>
  );
};

export default BrandAlignment;
