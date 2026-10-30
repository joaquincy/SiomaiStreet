import {
  BiShield,
  BiFile,
  BiChevronUp,
  BiChevronDown,
} from 'react-icons/bi';
import { useState } from 'react';
import { RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';
import './Steps.css';

const ConsentCard = ({ id, title, content, agreed, onToggle }) => {
  const [expanded, setExpanded] = useState(true);
  const feedback = useApplicationFeedback();
  const errors = feedback.errorsFor(id);
  const hasError = errors.length > 0;

  return (
    <div className={`consent-card ${agreed ? 'agreed' : ''} ${hasError ? 'has-errors' : ''}`}>
      <button
        type="button"
        className="consent-card-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="consent-card-title-group">
          <BiFile className="section-icon" aria-hidden="true" />
          <span className="consent-card-title">{title}</span>
          <RequirementBadge required />
        </div>
        {expanded ? (
          <BiChevronUp className="consent-chevron" aria-hidden="true" />
        ) : (
          <BiChevronDown className="consent-chevron" aria-hidden="true" />
        )}
      </button>
      {expanded && (
        <div className="consent-card-body">
          <div className="consent-text-box">{content}</div>
          <label className="legal-checkbox-label" htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              className="legal-checkbox"
              checked={agreed}
              aria-required="true"
              aria-invalid={hasError}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span className="legal-checkbox-text">I have read and agree to the terms</span>
          </label>
          <FieldErrorList id={id} errors={errors} />
        </div>
      )}
    </div>
  );
};

const LegalConsents = ({ formData, updateField }) => {
  const feedback = useApplicationFeedback();
  const privacyErrors = feedback.errorsFor('consent-privacy');

  return (
    <div className="step-content">
      <header className="step-intro">
        <div className="step-intro-icon charcoal" aria-hidden="true">
          <BiShield />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 08 · Confidentiality &amp; Declarations</span>
          <h2 id="legal-step-title" tabIndex={-1} className="step-intro-title">
            Legal Declarations &amp; <span className="title-highlight">Consents</span>
          </h2>
          <p className="step-intro-subtitle">
            Review each declaration carefully. All <strong>four consent checkboxes</strong> are unselected by default and must be explicitly checked before proceeding.
          </p>
        </div>
      </header>

      <section className="form-section">
        <h3 className="section-title">
          <BiShield className="section-icon" aria-hidden="true" />
          <span>Consent &amp; Agreements</span>
        </h3>

        <div className="legal-agreements-list">
          <ConsentCard
            id="consent-nda"
            title="Non - Disclosure Agreement (NDA)"
            content="This Non-Disclosure Agreement ('Agreement') is entered into to prevent the unauthorized disclosure of Confidential Information. The Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party. The Receiving Party shall carefully restrict access to Confidential Information to employees, contractors and third parties as is reasonably required."
            agreed={!!formData.consent_nda}
            onToggle={(checked) => updateField('consent_nda', checked)}
          />
          <ConsentCard
            id="consent-backgroundCheck"
            title="Authorization for Background Check"
            content="I hereby authorize the franchisor and its designated agents and representatives to conduct a comprehensive review of my background causing a consumer report and/or an investigative consumer report to be generated for employment and/or franchise qualification purposes."
            agreed={!!formData.consent_backgroundCheck}
            onToggle={(checked) => updateField('consent_backgroundCheck', checked)}
          />
          <ConsentCard
            id="consent-accuracy"
            title="Declaration of Accuracy & Truthfulness"
            content="I declare that all information and documents provided in this application are true, accurate, and complete. I understand that any misrepresentation may result in the immediate cancellation of my application or franchise agreement."
            agreed={!!formData.consent_accuracy}
            onToggle={(checked) => updateField('consent_accuracy', checked)}
          />
        </div>
      </section>

      <section className="form-section">
        <div className={`privacy-box ${privacyErrors.length ? 'has-errors' : ''}`}>
          <div className="privacy-box-header">
            <span className="consent-card-title">Data Processing &amp; Local Draft Notice</span>
            <RequirementBadge required />
          </div>
          <p className="privacy-notice-pending">
            This form collects contact and identity details, business and financial information, and supporting documents for application review. Draft answers and files may remain in this browser; submission sends them to the server. Official privacy contacts, retention periods, reviewer access and the final privacy notice still require confirmation before public use. Use synthetic information for development testing. Do not submit real identity or financial documents until those arrangements are confirmed.
          </p>
          <label className="legal-checkbox-label" htmlFor="consent-privacy">
            <input
              id="consent-privacy"
              type="checkbox"
              className="legal-checkbox"
              checked={!!formData.consent_privacy}
              aria-required="true"
              aria-invalid={privacyErrors.length > 0}
              onChange={(e) => updateField('consent_privacy', e.target.checked)}
            />
            <span className="legal-checkbox-text">
              I have reviewed the data notice above and consent to the processing of my personal data for my franchise application.
            </span>
          </label>
          <FieldErrorList id="consent-privacy" errors={privacyErrors} />
        </div>
      </section>
    </div>
  );
};

export default LegalConsents;
