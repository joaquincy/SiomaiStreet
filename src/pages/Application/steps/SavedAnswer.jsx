import { FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';

export default function SavedAnswer({ id, label, value, onEdit, editLabel = 'Change in Step 1', children }) {
  const feedback = useApplicationFeedback();
  const errors = feedback.errorsFor(id);
  return (
    <div id={id} tabIndex={-1} role="group" aria-labelledby={`${id}-label`} aria-describedby={errors.length ? `${id}-error` : undefined} className={`form-field ${errors.length ? 'has-errors' : ''}`}>
      <span className="field-label-row"><span id={`${id}-label`} className="field-label-text">{label}</span></span>
      <p><strong>{value || 'Not answered yet'}</strong></p>
      {children}
      <button type="button" className="btn-text-red" onClick={onEdit}>{editLabel}</button>
      <FieldErrorList id={id} errors={errors} />
    </div>
  );
}
