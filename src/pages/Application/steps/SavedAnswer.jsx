import { BiCheckCircle, BiEditAlt, BiLinkAlt } from 'react-icons/bi';
import { FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';

export default function SavedAnswer({
  id,
  number,
  label,
  syncLabel = 'Synced with Step 1',
  value,
  onEdit,
  editLabel = 'Change in Step 1',
  children,
}) {
  const feedback = useApplicationFeedback();
  const errors = feedback.errorsFor(id);
  return (
    <div
      id={id}
      tabIndex={-1}
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={errors.length ? `${id}-error` : undefined}
      className={`form-field saved-answer-card ${number !== undefined ? 'saved-answer-question' : ''} ${errors.length ? 'has-errors' : ''}`.trim()}
    >
      <div className="saved-answer-header">
        <div className="saved-answer-title-group">
          {number !== undefined && (
            <span className="question-number" aria-hidden="true">
              {number}
            </span>
          )}
          <span id={`${id}-label`} className="field-label-text saved-answer-label">
            {label}
          </span>
          {syncLabel && (
            <span className="saved-answer-sync-pill">
              <BiLinkAlt aria-hidden="true" />
              <span>{syncLabel}</span>
            </span>
          )}
        </div>
        <button type="button" className="btn-text-red saved-answer-edit-btn" onClick={onEdit}>
          <BiEditAlt aria-hidden="true" />
          <span>{editLabel}</span>
        </button>
      </div>

      <div className="saved-answer-value-box">
        <span className="saved-answer-value-icon" aria-hidden="true">
          <BiCheckCircle />
        </span>
        <p className="saved-answer-value">
          <strong>{value || 'Not answered yet'}</strong>
        </p>
      </div>

      {children && <div className="saved-answer-body">{children}</div>}
      <FieldErrorList id={id} errors={errors} />
    </div>
  );
}
