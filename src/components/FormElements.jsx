import { BiCheck, BiUpload } from 'react-icons/bi';
import './FormElements.css';

/* ─── Chip Selectors ─── */
export const ChipGroup = ({ children }) => (
  <div className="chip-group">{children}</div>
);

export const Chip = ({ label, selected, onClick }) => (
  <button
    type="button"
    className={`chip ${selected ? 'selected' : ''}`}
    onClick={onClick}
    aria-pressed={selected}
  >
    {label}
  </button>
);

/* ─── Card Selectors ─── */
export const CardSelectorGroup = ({ children }) => (
  <div className="card-selector-group">{children}</div>
);

export const CardSelector = ({ icon: Icon, iconStyle, title, subtitle, selected, onClick }) => (
  <button
    type="button"
    className={`card-selector ${selected ? 'selected' : ''}`}
    onClick={onClick}
    aria-pressed={selected}
  >
    <div className={`card-selector-icon ${iconStyle || ''}`}>
      <Icon />
    </div>
    <div className="card-selector-text">
      <span className="card-selector-title">{title}</span>
      {subtitle && <span className="card-selector-subtitle">{subtitle}</span>}
    </div>
  </button>
);

/* ─── Toggle (Yes/No) ─── */
export const ToggleGroup = ({ children }) => (
  <div className="toggle-group" role="group">{children}</div>
);

export const ToggleOption = ({ label, selected, onClick }) => (
  <button
    type="button"
    className={`toggle-option ${selected ? 'selected' : ''}`}
    onClick={onClick}
    aria-pressed={selected}
  >
    {label}
  </button>
);

/* ─── Radio Options ─── */
export const RadioGroup = ({ children }) => (
  <div className="radio-group" role="radiogroup">{children}</div>
);

export const RadioOption = ({ label, selected, onClick }) => (
  <button
    type="button"
    className={`radio-option ${selected ? 'selected' : ''}`}
    onClick={onClick}
    role="radio"
    aria-checked={selected}
  >
    <span className="radio-circle" />
    <span className="radio-option-label">{label}</span>
  </button>
);

/* ─── Select Dropdown ─── */
export const FormSelect = ({ value, onChange, placeholder, options, icon: Icon }) => (
  <div className="form-select-wrapper">
    {Icon && <Icon className="select-icon" />}
    <select
      className="form-select"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        {placeholder || 'Select an option'}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

/* ─── File Upload ─── */
export const FileUploadZone = ({ label, hint }) => (
  <div className="file-upload-zone">
    <div className="upload-icon">
      <BiUpload />
    </div>
    <p className="upload-text">
      <strong>Click to upload</strong> or drag and drop
    </p>
    {label && <p className="upload-text">{label}</p>}
    {hint && <p className="upload-hint">{hint}</p>}
  </div>
);

/* ─── Consent Checkbox ─── */
export const ConsentItem = ({ checked, onClick, children }) => (
  <button
    type="button"
    className={`consent-item ${checked ? 'checked' : ''}`}
    onClick={onClick}
    aria-pressed={checked}
  >
    <span className="consent-checkbox">{checked && <BiCheck />}</span>
    <span className="consent-text">{children}</span>
  </button>
);

/* ─── Question Block ─── */
export const QuestionBlock = ({ number, label, required, children }) => (
  <div className="form-question">
    <div className="question-header">
      <span className="question-number">{number}</span>
      <label className="question-label">
        {label}
        {required && <span className="required"> *</span>}
      </label>
    </div>
    {children}
  </div>
);
