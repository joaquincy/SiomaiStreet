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
  { value: '50k-150k', label: '₱50k to ₱150k' },
  { value: '150k-250k', label: '₱150k to ₱250k' },
  { value: '250k-500k', label: '₱250k to ₱500k' },
  { value: 'above500k', label: 'Above ₱500k' },
];

const FRANCHISE_TYPES = [
  { value: 'food-cart', icon: BiCart, iconStyle: 'warm', title: 'Food Cart', subtitle: 'Compact format for high-foot-traffic areas' },
  { value: 'kiosk', icon: BiStore, iconStyle: 'red', title: 'Kiosk', subtitle: 'Dedicated inline or mall commercial counter' },
  { value: 'casual-dining', icon: HiOutlineSparkles, iconStyle: 'charcoal', title: 'Casual Dining', subtitle: 'Full store format with dine-in seating' },
  { value: 'not-sure', icon: HiOutlineQuestionMarkCircle, iconStyle: 'blue', title: 'Not Sure Yet', subtitle: 'Compare formats with our franchise team' },
];

const TIMELINE_OPTIONS = [
  { value: 'within-6-months', label: 'Within 6 months' },
  { value: '6-12-months', label: '6 to 12 months' },
  { value: '1-2-years', label: '1 to 2 years' },
  { value: 'just-exploring', label: 'Just exploring' },
];

const PreQualification = ({ formData, updateField }) => {
  return (
    <div className="step-content">
      {/* Step Header */}
      <header className="step-intro">
        <div className="step-intro-icon red" aria-hidden="true">
          <HiOutlineClipboardCheck />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 01 · Initial Fit Assessment</span>
          <h2 id="pq-step-title" tabIndex={-1} className="step-intro-title">
            Let&apos;s Make Sure We&apos;re a <span className="title-highlight">Great Fit</span>
          </h2>
          <p className="step-intro-subtitle">
            Answer <strong>6 initial questions</strong> about your investment range, preferred format, and target timeline. All 6 questions are required to continue.
          </p>
        </div>
      </header>

      {/* Q1: Liquid Capital */}
      <QuestionBlock
        id="pq-liquidCapital"
        number={1}
        label="Available Liquid Capital"
        required
        hint="Select the cash or liquid funds you have readily available for this venture."
      >
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
      <QuestionBlock
        id="pq-ownedBusiness"
        number={2}
        label="Have you owned a business before?"
        required
        hint="First-time business owners are welcome. Your answer helps us tailor onboarding guidance."
      >
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
      <QuestionBlock
        id="pq-franchiseType"
        number={3}
        label="Which franchise type are you most interested in?"
        required
        hint="Select your preferred store format, or choose Not Sure Yet if you want to review options first."
      >
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
      <QuestionBlock
        id="pq-territory"
        number={4}
        label="Preferred Territory / Region"
        required
        hint="Choose the Philippine region where you intend to open your first branch."
      >
        <FormSelect
          id="pq-territory-select"
          value={formData.territory}
          onChange={(val) => updateField('territory', val)}
          placeholder="Select a region"
          options={REGIONS}
          icon={BiMap}
          ariaLabel="Preferred Territory or Region"
        />
      </QuestionBlock>

      {/* Q5: Ownership Intention */}
      <QuestionBlock
        id="pq-ownershipIntention"
        number={5}
        label="Ownership Intention"
        required
        hint="Indicate how you plan to manage store operations once launched."
      >
        <RadioGroup>
          <RadioOption
            label="Full-time Owner-Operator"
            description="You will personally oversee daily store operations and staff."
            selected={formData.ownershipIntention === 'full-time'}
            onClick={() => updateField('ownershipIntention', 'full-time')}
          />
          <RadioOption
            label="Passive Investor with Manager"
            description="A dedicated store manager will handle day-to-day operations."
            selected={formData.ownershipIntention === 'passive'}
            onClick={() => updateField('ownershipIntention', 'passive')}
          />
          <RadioOption
            label="Multi-Unit Developer"
            description="You plan to open and scale multiple branches across a territory."
            selected={formData.ownershipIntention === 'multi-unit'}
            onClick={() => updateField('ownershipIntention', 'multi-unit')}
          />
        </RadioGroup>
      </QuestionBlock>

      {/* Q6: Timeline */}
      <QuestionBlock
        id="pq-openingTimeline"
        number={6}
        label="Target Opening Timeline"
        required
        hint="Estimate when you would like to launch if your application is approved."
      >
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
    </div>
  );
};

export default PreQualification;
