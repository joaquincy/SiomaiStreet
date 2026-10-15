import { HiOutlineClipboardCheck } from 'react-icons/hi';
import './Steps.css';

const PlaceholderStep = ({ stepConfig }) => {
  const Icon = stepConfig.icon || HiOutlineClipboardCheck;

  return (
    <div className="step-placeholder">
      <div className="step-placeholder-icon">
        <Icon />
      </div>
      <h3>{stepConfig.label}</h3>
      <p>
        This step is ready for your content. The questions and form fields
        will appear here once configured.
      </p>
      <div className="step-placeholder-badge">
        <HiOutlineClipboardCheck />
        Content awaiting setup
      </div>
    </div>
  );
};

export default PlaceholderStep;
