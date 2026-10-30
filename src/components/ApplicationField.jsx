import { BiCheck } from 'react-icons/bi';
import { wordCount } from '../utils/wordCount';
import { useApplicationFeedback } from './applicationFeedbackContext';
import DatePickerInput from './DatePickerInput';

export function RequirementBadge({ required = false, conditional }) {
  const tone = conditional ? 'conditional' : required ? 'required' : 'optional';
  const text = conditional || (required ? 'Required' : 'Optional');
  return <span className={`field-requirement ${tone}`}>{text}</span>;
}

export function FieldErrorList({ id, errors = [] }) {
  if (!errors.length) return null;
  return (
    <ul id={id ? `${id}-error` : undefined} className="field-errors" role="alert">
      {errors.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

export function WordCounter({ value, minimum, maximum }) {
  const count = wordCount(value);
  const meetsMinimum = !minimum || count >= minimum;
  const remaining = minimum ? Math.max(minimum - count, 0) : 0;
  const progress = minimum ? Math.min(Math.round((count / minimum) * 100), 100) : 100;

  return (
    <div className={`word-counter ${meetsMinimum && count > 0 ? 'met' : ''}`} aria-live="polite">
      <div className="word-counter-row">
        <span className="word-counter-count">
          {count} {count === 1 ? 'word' : 'words'}
          {minimum ? `; minimum ${minimum}` : ''}
          {maximum ? `; maximum ${maximum}` : ''}
        </span>
        {minimum && (
          <span className="word-counter-status">
            {meetsMinimum
              ? `Minimum met (${count}/${minimum})`
              : `${remaining} more ${remaining === 1 ? 'word' : 'words'} needed`}
          </span>
        )}
      </div>
      {minimum && (
        <div className="word-counter-track" aria-hidden="true">
          <div className="word-counter-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export function ApplicationField({
  id,
  label,
  required = false,
  conditional,
  hint,
  errors,
  options,
  value,
  onChange,
  onBlur,
  ...inputProps
}) {
  const feedback = useApplicationFeedback();
  const resolvedErrors = errors !== undefined ? errors : feedback.errorsFor(id);
  const hasError = resolvedErrors.length > 0;
  const description = `${hint ? `${id}-hint ` : ''}${hasError ? `${id}-error` : ''}`.trim() || undefined;
  const caption = (
    <span className="field-label-row">
      <span className="field-label-text">{label}</span>
      <RequirementBadge required={required} conditional={conditional} />
    </span>
  );

  return (
    <div className={`application-field ${hasError ? 'has-errors' : ''}`}>
      {options ? (
        <fieldset id={id} tabIndex={-1} aria-describedby={description} aria-invalid={hasError}>
          <legend>{caption}</legend>
          {hint && (
            <p id={`${id}-hint`} className="field-help">
              {hint}
            </p>
          )}
          <div className="field-options">
            {options.map((option) => {
              const isSelected = value === option;
              return (
                <label key={option} className={isSelected ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name={id}
                    value={option}
                    checked={isSelected}
                    onChange={() => onChange(option)}
                    onBlur={onBlur}
                  />
                  <span className="field-option-indicator" aria-hidden="true">
                    {isSelected && <BiCheck />}
                  </span>
                  <span className="field-option-text">{option}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : inputProps.type === 'date' ? (
        <>
          <label htmlFor={id}>{caption}</label>
          {hint && (
            <p id={`${id}-hint`} className="field-help">
              {hint}
            </p>
          )}
          <DatePickerInput
            id={id}
            name={inputProps.name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={inputProps.disabled}
            required={required}
            ariaInvalid={hasError}
            ariaDescribedBy={description}
          />
        </>
      ) : (
        <>
          <label htmlFor={id}>{caption}</label>
          {hint && (
            <p id={`${id}-hint`} className="field-help">
              {hint}
            </p>
          )}
          <input
            {...inputProps}
            id={id}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={description}
          />
        </>
      )}
      <FieldErrorList id={id} errors={resolvedErrors} />
    </div>
  );
}
