import {
  BiShield,
  BiFile,
  BiChevronUp,
  BiChevronDown,
} from 'react-icons/bi';
import { useState } from 'react';
import './Steps.css';

const ConsentCard = ({ title, content, agreed, onToggle }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="consent-card">
      <div
        className="consent-card-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="consent-card-title-group">
          <BiFile className="text-red text-lg" />
          <span className="consent-card-title">{title}</span>
        </div>
        {expanded ? (
          <BiChevronUp className="text-gray text-lg" />
        ) : (
          <BiChevronDown className="text-gray text-lg" />
        )}
      </div>
      {expanded && (
        <div className="consent-card-body">
          <div className="consent-text-box">
            {content}
          </div>
          <label className="legal-checkbox-label mt-3">
            <input
              type="checkbox"
              className="legal-checkbox"
              checked={agreed}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span className="legal-checkbox-text">I have read and agree to the terms</span>
          </label>
        </div>
      )}
    </div>
  );
};

const LegalConsents = ({ formData, updateField }) => {
  return (
    <div className="step-content animate-fade-in">
      <div className="step-header-centered">
        <div className="step-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
          {/* Using an SVG for the scale to match exactly if possible, or fallback to Shield */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h2 className="step-title">Legal Declarations &amp; Consents</h2>
        <p className="step-subtitle">Please read and consent to the following agreements.</p>
      </div>

      <div className="form-section mt-4">
        <h3 className="section-title">
          <BiShield className="section-icon" /> Consent &amp; Agreements
        </h3>

        <div className="legal-agreements-list mt-3">
          <ConsentCard
            title="Non - Disclosure Agreement (NDA)"
            content="This Non-Disclosure Agreement ('Agreement') is entered into to prevent the unauthorized disclosure of Confidential Information. The Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party. The Receiving Party shall carefully restrict access to Confidential Information to employees, contractors and third parties as is reasonably required."
            agreed={!!formData.consent_nda}
            onToggle={(checked) => updateField('consent_nda', checked)}
          />
          <ConsentCard
            title="Authorization for Background Check"
            content="I hereby authorize the franchisor and its designated agents and representatives to conduct a comprehensive review of my background causing a consumer report and/or an investigative consumer report to be generated for employment and/or franchise qualification purposes."
            agreed={!!formData.consent_backgroundCheck}
            onToggle={(checked) => updateField('consent_backgroundCheck', checked)}
          />
          <ConsentCard
            title="Declaration of Accuracy &amp; Truthfulness"
            content="I declare that all information and documents provided in this application are true, accurate, and complete. I understand that any misrepresentation may result in the immediate cancellation of my application or franchise agreement."
            agreed={!!formData.consent_accuracy}
            onToggle={(checked) => updateField('consent_accuracy', checked)}
          />
        </div>
      </div>

      <div className="form-section mt-4">
        <div className="highlight-box-blue privacy-box">
          <label className="legal-checkbox-label">
            <input
              type="checkbox"
              className="legal-checkbox"
              checked={!!formData.consent_privacy}
              onChange={(e) => updateField('consent_privacy', e.target.checked)}
            />
            <span className="legal-checkbox-text">
              I acknowledge that I have read the <span className="privacy-link-placeholder">Privacy Policy</span> and consent to the processing of my personal data.
            </span>
          </label>
          <p className="privacy-notice-pending">
            The full Privacy Policy document will be available before online submission is activated.
          </p>
        </div>
      </div>

    </div>
  );
};

export default LegalConsents;
