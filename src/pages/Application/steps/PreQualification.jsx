import { BiCart, BiStore, BiMap } from 'react-icons/bi';
import { HiOutlineClipboardCheck, HiOutlineSparkles, HiOutlineQuestionMarkCircle } from 'react-icons/hi';
import {
  QuestionBlock,
  ChipGroup,
  Chip,
  CardSelectorGroup,
  CardSelector,
  ToggleGroup,
  ToggleOption,
  RadioGroup,
  RadioOption,
  FormSelect,
} from '../../../components/FormElements';
import { REGIONS } from '../../../data/stepsConfig';
import './Steps.css';

const CAPITAL_OPTIONS = [
  { value: 'below50k', label: 'Below ₱50k' },
  { value: '50k-150k', label: '₱50k – ₱150k' },
  { value: '150k-250k', label: '₱150k – ₱250k' },
  { value: '250k-500k', label: '₱250k – ₱500k' },
  { value: 'above500k', label: 'Above ₱500k' },
];

const FRANCHISE_TYPES = [
  { value: 'food-cart', icon: BiCart, iconStyle: 'warm', title: 'Food Cart', subtitle: 'Mobile and flexible' },
  { value: 'kiosk', icon: BiStore, iconStyle: 'red', title: 'Kiosk', subtitle: 'Semi-permanent space' },
  { value: 'casual-dining', icon: HiOutlineSparkles, iconStyle: 'charcoal', title: 'Casual Dining', subtitle: 'Full dining experience' },
  { value: 'not-sure', icon: HiOutlineQuestionMarkCircle, iconStyle: 'blue', title: 'Not Sure Yet', subtitle: 'Still exploring options' },
];

const TIMELINE_OPTIONS = [
  { value: 'within-6-months', label: 'Within 6 months' },
  { value: '6-12-months', label: '6–12 months' },
  { value: '1-2-years', label: '1–2 years' },
  { value: 'just-exploring', label: 'Just exploring' },
];

const PreQualification = ({ formData, updateField }) => {
  return (
    <>
      {/* Step Header */}
      <div className="step-intro">
        <div className="step-intro-icon red">
          <HiOutlineClipboardCheck />
        </div>
        <h2 className="step-intro-title">Let&apos;s Make Sure We&apos;re a Great Fit!</h2>
        <p className="step-intro-subtitle">
          Answer 6 quick questions to confirm you meet our minimum requirements.
        </p>
      </div>

      {/* Q1: Liquid Capital */}
      <QuestionBlock number={1} label="Available Liquid Capital" required>
        <ChipGroup>
          {CAPITAL_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={formData.liquidCapital === opt.value}
              onClick={() => updateField('liquidCapital', opt.value)}
            />
          ))}
        </ChipGroup>
      </QuestionBlock>

      {/* Q2: Business Ownership */}
      <QuestionBlock number={2} label="Have you owned a business before?" required>
        <ToggleGroup>
          <ToggleOption
            label="Yes"
            selected={formData.ownedBusiness === 'yes'}
            onClick={() => updateField('ownedBusiness', 'yes')}
          />
          <ToggleOption
            label="No"
            selected={formData.ownedBusiness === 'no'}
            onClick={() => updateField('ownedBusiness', 'no')}
          />
        </ToggleGroup>
      </QuestionBlock>

      {/* Q3: Franchise Type */}
      <QuestionBlock number={3} label="Which franchise type are you most interested in?" required>
        <CardSelectorGroup>
          {FRANCHISE_TYPES.map((type) => (
            <CardSelector
              key={type.value}
              icon={type.icon}
              iconStyle={type.iconStyle}
              title={type.title}
              subtitle={type.subtitle}
              selected={formData.franchiseType === type.value}
              onClick={() => updateField('franchiseType', type.value)}
            />
          ))}
        </CardSelectorGroup>
      </QuestionBlock>

      {/* Q4: Territory */}
      <QuestionBlock number={4} label="Preferred Territory / Region" required>
        <FormSelect
          value={formData.territory}
          onChange={(val) => updateField('territory', val)}
          placeholder="Select a region"
          options={REGIONS}
          icon={BiMap}
        />
      </QuestionBlock>

      {/* Q5: Ownership Intention */}
      <QuestionBlock number={5} label="Ownership Intention" required>
        <RadioGroup>
          <RadioOption
            label="Full-time Owner-Operator"
            selected={formData.ownershipIntention === 'full-time'}
            onClick={() => updateField('ownershipIntention', 'full-time')}
          />
          <RadioOption
            label="Passive Investor with Manager"
            selected={formData.ownershipIntention === 'passive'}
            onClick={() => updateField('ownershipIntention', 'passive')}
          />
          <RadioOption
            label="Multi-Unit Developer"
            selected={formData.ownershipIntention === 'multi-unit'}
            onClick={() => updateField('ownershipIntention', 'multi-unit')}
          />
        </RadioGroup>
      </QuestionBlock>

      {/* Q6: Timeline */}
      <QuestionBlock number={6} label="Target Opening Timeline">
        <ChipGroup>
          {TIMELINE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={formData.openingTimeline === opt.value}
              onClick={() => updateField('openingTimeline', opt.value)}
            />
          ))}
        </ChipGroup>
      </QuestionBlock>
    </>
  );
};

export default PreQualification;
