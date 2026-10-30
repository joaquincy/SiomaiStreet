import { useState, useRef, useEffect, useId } from 'react';
import { BiCheck, BiChevronDown, BiUpload, BiSearch } from 'react-icons/bi';
import { RequirementBadge, FieldErrorList } from './ApplicationField';
import { useApplicationFeedback } from './applicationFeedbackContext';
import './FormElements.css';

/* ─── Chip Selectors ─── */
export const ChipGroup = ({ children }) => (
  <div className="chip-group" role="group">{children}</div>
);

export const Chip = ({ label, selected, onClick, disabled = false }) => (
  <button
    type="button"
    className={`chip ${selected ? 'selected' : ''}`}
    onClick={onClick}
    aria-pressed={selected}
    disabled={disabled}
  >
    {selected && <BiCheck className="chip-check-icon" aria-hidden="true" />}
    <span>{label}</span>
  </button>
);

/* ─── Card Selectors ─── */
export const CardSelectorGroup = ({ children, className = '' }) => (
  <div className={`card-selector-group ${className}`.trim()} role="group">{children}</div>
);

export const CardSelector = ({ icon: Icon, iconStyle, title, subtitle, selected, onClick }) => (
  <button
    type="button"
    className={`card-selector ${selected ? 'selected' : ''}`}
    onClick={onClick}
    aria-pressed={selected}
  >
    {Icon && (
      <div className={`card-selector-icon ${iconStyle || ''}`} aria-hidden="true">
        <Icon />
      </div>
    )}
    <div className="card-selector-text">
      <span className="card-selector-title">{title}</span>
      {subtitle && <span className="card-selector-subtitle">{subtitle}</span>}
    </div>
    <span className="card-selector-indicator" aria-hidden="true">
      {selected && <BiCheck />}
    </span>
  </button>
);

/* ─── Toggle (Yes/No & Option Buttons) ─── */
export const ToggleGroup = ({ children }) => (
  <div className="toggle-group" role="group">{children}</div>
);

export const ToggleOption = ({ label, selected, onClick, disabled = false }) => (
  <button
    type="button"
    className={`toggle-option ${selected ? 'selected' : ''}`}
    onClick={onClick}
    aria-pressed={selected}
    disabled={disabled}
  >
    {selected && <BiCheck className="toggle-check-icon" aria-hidden="true" />}
    <span>{label}</span>
  </button>
);

/* ─── Radio Options ─── */
export const RadioGroup = ({ children }) => (
  <div className="radio-group" role="radiogroup">{children}</div>
);

export const RadioOption = ({ label, description, selected, onClick }) => (
  <button
    type="button"
    className={`radio-option ${selected ? 'selected' : ''}`}
    onClick={onClick}
    role="radio"
    aria-checked={selected}
  >
    <span className="radio-circle" aria-hidden="true" />
    <span className="radio-option-content">
      <span className="radio-option-label">{label}</span>
      {description && <span className="radio-option-desc">{description}</span>}
    </span>
  </button>
);

/* ─── Accessible Custom Select Dropdown ─── */
export const FormSelect = ({ id, value, onChange, placeholder, options = [], icon: Icon, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const typeahead = useRef({ text: '', time: 0 });

  const filteredOptions = query.trim()
    ? options.filter((opt) => opt.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const activeOptionId = open && filteredOptions[activeIndex] !== undefined
    ? `${listId}-${activeIndex}` : undefined;

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [open, activeIndex, query]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const openMenu = (preferLast = false) => {
    setQuery('');
    const selectedIdx = options.indexOf(value);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : preferLast ? options.length - 1 : 0);
    setOpen(true);
  };

  const selectValue = (opt) => {
    onChange(opt);
    setOpen(false);
    setQuery('');
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMenu(event.key === 'ArrowUp');
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
      buttonRef.current?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (event.key === 'Home' && event.target.tagName !== 'INPUT') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && event.target.tagName !== 'INPUT') {
      event.preventDefault();
      setActiveIndex(Math.max(filteredOptions.length - 1, 0));
    } else if (event.key === 'Enter' || (event.key === ' ' && event.target.tagName !== 'INPUT')) {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        selectValue(filteredOptions[activeIndex]);
      }
    } else if (event.key.length === 1 && event.target.tagName !== 'INPUT' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text = (now - typeahead.current.time < 700 ? typeahead.current.text : '') + event.key.toLowerCase();
      typeahead.current = { text, time: now };
      const match = filteredOptions.findIndex(option => option.toLowerCase().startsWith(text));
      if (match >= 0) setActiveIndex(match);
    }
  };

  return (
    <div className={`form-select-wrapper custom-select ${open ? 'is-open' : ''}`} ref={wrapperRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery('');
        }
      }}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={`form-select ${!value ? 'is-placeholder' : ''} ${open ? 'is-active' : ''}`}
        aria-haspopup="listbox"
        role="combobox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeOptionId}
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? (setOpen(false), setQuery('')) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        {Icon && <Icon className="select-inline-icon" aria-hidden="true" />}
        <span className="form-select-text">{value || placeholder || 'Select an option'}</span>
        <span className="select-chevron-box" aria-hidden="true">
          <BiChevronDown className={`select-chevron ${open ? 'open' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="select-popover-panel">
          {options.length > 6 && (
            <div className="select-search-bar">
              <BiSearch className="select-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={activeOptionId}
                aria-autocomplete="list"
                className="select-search-input"
                placeholder="Filter options…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                aria-label="Filter options"
              />
            </div>
          )}
          <ul
            id={listId}
            ref={listRef}
            className="select-options"
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel || placeholder || 'Options'}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = value === opt;
                const isActive = idx === activeIndex;
                return (
                  <li
                    id={`${listId}-${idx}`}
                    key={opt}
                    role="option"
                    aria-selected={isSelected}
                    className={`select-option ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectValue(opt)}
                  >
                    <span>{opt}</span>
                    {isSelected && (
                      <span className="select-option-check" aria-hidden="true">
                        <BiCheck />
                      </span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="select-option-empty">No matching options</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

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
export const QuestionBlock = ({ id, number, label, required = false, conditional, hint, errors, children }) => {
  const feedback = useApplicationFeedback();
  const resolvedErrors = errors !== undefined ? errors : id ? feedback.errorsFor(id) : [];
  const hasError = resolvedErrors.length > 0;

  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      className={`form-question ${hasError ? 'has-errors' : ''}`}
      aria-invalid={hasError || undefined}
    >
      <div className="question-header">
        {number !== undefined && <span className="question-number" aria-hidden="true">{number}</span>}
        <div className="question-label-group">
          <span className="question-label">{label}</span>
          <RequirementBadge required={required} conditional={conditional} />
        </div>
      </div>
      {hint && (
        <p id={id ? `${id}-hint` : undefined} className="field-help question-hint">
          {hint}
        </p>
      )}
      <div className="question-control">{children}</div>
      <FieldErrorList id={id} errors={resolvedErrors} />
    </div>
  );
};
