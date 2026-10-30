import { useState, useRef, useEffect, useId } from 'react';
import { calendarNavigation } from '../utils/calendarNavigation';
import {
  BiCalendar,
  BiChevronLeft,
  BiChevronRight,
  BiChevronDown,
  BiX,
} from 'react-icons/bi';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return { year: y, month: m - 1, day: d };
}

function formatReadableDate(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return '';
  const shortMonth = MONTHS[parsed.month].slice(0, 3);
  return `${shortMonth} ${parsed.day}, ${parsed.year}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function DatePickerInput({
  id,
  name,
  value = '',
  onChange,
  onBlur,
  disabled = false,
  required = false,
  ariaInvalid,
  ariaDescribedBy,
}) {
  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState('days'); // 'days' | 'months' | 'years'
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const dialogId = useId();
  const needsFocus = useRef(false);
  const [focusDay, setFocusDay] = useState(1);

  const today = new Date();
  const currentYear = today.getFullYear();
  const parsed = parseIsoDate(value);

  const [viewYear, setViewYear] = useState(() => parsed?.year || currentYear - 24);
  const [viewMonth, setViewMonth] = useState(() =>
    parsed ? parsed.month : today.getMonth()
  );
  const [yearPageStart, setYearPageStart] = useState(() =>
    Math.floor((parsed?.year || currentYear - 24) / 12) * 12
  );

  useEffect(() => {
    const nextParsed = parseIsoDate(value);
    if (nextParsed) {
      setViewYear(nextParsed.year);
      setViewMonth(nextParsed.month);
      setYearPageStart(Math.floor(nextParsed.year / 12) * 12);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setPickerMode('days');
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        setPickerMode('days');
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
  const activeDay = Math.min(focusDay, daysInMonth);

  useEffect(() => {
    if (open && needsFocus.current) {
      dialogRef.current?.querySelector('[data-preferred-focus="true"]')?.focus();
      needsFocus.current = false;
    }
  }, [open, pickerMode, viewYear, viewMonth, yearPageStart, focusDay]);

  const closeCalendar = () => {
    setOpen(false);
    setPickerMode('days');
    triggerRef.current?.focus();
  };

  const handleDayKey = (event, day) => {
    const next = calendarNavigation(viewYear, viewMonth, day, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    needsFocus.current = true;
    setViewYear(next.year);
    setViewMonth(next.month);
    setFocusDay(next.day);
  };

  const handlePrev = () => {
    if (pickerMode === 'years') {
      setYearPageStart((start) => Math.max(1924, start - 12));
      return;
    }
    if (pickerMode === 'months') {
      setViewYear((y) => y - 1);
      return;
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (pickerMode === 'years') {
      setYearPageStart((start) => Math.min(currentYear + 12, start + 12));
      return;
    }
    if (pickerMode === 'months') {
      setViewYear((y) => y + 1);
      return;
    }
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (day) => {
    const iso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    onChange(iso);
    closeCalendar();
  };

  const selectToday = () => {
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setViewYear(y);
    setViewMonth(m);
    onChange(`${y}-${pad2(m + 1)}-${pad2(d)}`);
    closeCalendar();
  };

  const togglePopover = () => {
    if (disabled) return;
    if (open) { closeCalendar(); return; }
    needsFocus.current = true;
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    setFocusDay(parsed?.day || 1);
    setPickerMode('days');
    setOpen(true);
  };

  const readable = formatReadableDate(value);
  const yearGrid = Array.from({ length: 12 }, (_, i) => yearPageStart + i);

  return (
    <div
      ref={wrapperRef}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setPickerMode('days');
        }
      }}
      className={`modern-date-picker ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${ariaInvalid ? 'has-error' : ''}`}
    >
      <div className="date-picker-field-bar">
        <button
          type="button"
          className="date-picker-trigger-icon"
          onClick={togglePopover}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
        >
          <BiCalendar />
        </button>

        <input
          id={id}
          name={name}
          type="date"
          className="form-input date-picker-native-input"
          value={value || ''}
          disabled={disabled}
          aria-required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />

        {readable && !disabled && (
          <span className="date-picker-readable-badge" aria-hidden="true">
            {readable}
          </span>
        )}

        {value && !disabled && (
          <button
            type="button"
            className="date-picker-clear-btn"
            onClick={() => onChange('')}
            aria-label="Clear date"
            title="Clear date"
          >
            <BiX aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          className="date-picker-popover-btn"
          ref={triggerRef}
          onClick={togglePopover}
          disabled={disabled}
          aria-label="Open calendar picker"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? dialogId : undefined}
        >
          <BiCalendar aria-hidden="true" />
          <span>Pick date</span>
        </button>
      </div>

      {open && !disabled && (
        <div id={dialogId} ref={dialogRef} className="date-picker-popover" role="dialog" aria-label="Calendar date picker">
          <div className="date-picker-nav">
            <button
              type="button"
              className="date-nav-arrow"
              onClick={handlePrev}
              aria-label="Previous"
            >
              <BiChevronLeft />
            </button>

            <div className="date-picker-mode-pills" aria-live="polite" aria-atomic="true">
              <button
                type="button"
                className={`date-mode-pill ${pickerMode === 'months' ? 'active' : ''}`}
                onClick={() => { needsFocus.current = true; setPickerMode((m) => (m === 'months' ? 'days' : 'months')); }}
                aria-expanded={pickerMode === 'months'}
              >
                <span>{MONTHS[viewMonth]}</span>
                <BiChevronDown aria-hidden="true" />
              </button>

              <button
                type="button"
                className={`date-mode-pill ${pickerMode === 'years' ? 'active' : ''}`}
                onClick={() => {
                  needsFocus.current = true;
                  setYearPageStart(Math.floor(viewYear / 12) * 12);
                  setPickerMode((m) => (m === 'years' ? 'days' : 'years'));
                }}
                aria-expanded={pickerMode === 'years'}
              >
                <span>{viewYear}</span>
                <BiChevronDown aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              className="date-nav-arrow"
              onClick={handleNext}
              aria-label="Next"
            >
              <BiChevronRight />
            </button>
          </div>

          {pickerMode === 'months' && (
            <div className="date-picker-subgrid months-grid">
              {MONTHS.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  className={`date-subgrid-btn ${idx === viewMonth ? 'selected' : ''}`}
                  aria-label={m}
                  aria-pressed={idx === viewMonth}
                  data-preferred-focus={idx === viewMonth}
                  onClick={() => {
                    needsFocus.current = true;
                    setViewMonth(idx);
                    setPickerMode('days');
                  }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {pickerMode === 'years' && (
            <div className="date-picker-subgrid years-grid">
              {yearGrid.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`date-subgrid-btn ${y === viewYear ? 'selected' : ''}`}
                  aria-pressed={y === viewYear}
                  data-preferred-focus={y === viewYear}
                  onClick={() => {
                    needsFocus.current = true;
                    setViewYear(y);
                    setPickerMode('days');
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {pickerMode === 'days' && (
            <>
              <div className="date-picker-weekdays" aria-hidden="true">
                {WEEKDAYS.map((wd) => (
                  <span key={wd}>{wd}</span>
                ))}
              </div>

              <div className="date-picker-grid">
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <span key={`empty-${idx}`} className="date-day-empty" aria-hidden="true" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const isSelected =
                    parsed &&
                    parsed.year === viewYear &&
                    parsed.month === viewMonth &&
                    parsed.day === day;
                  const isToday =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      className={`date-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => selectDay(day)}
                      onKeyDown={(event) => handleDayKey(event, day)}
                      onFocus={() => setFocusDay(day)}
                      tabIndex={day === activeDay ? 0 : -1}
                      data-preferred-focus={day === activeDay}
                      aria-label={new Date(Date.UTC(viewYear, viewMonth, day)).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                      aria-current={isToday ? 'date' : undefined}
                      aria-pressed={!!isSelected}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="date-picker-footer">
            <button
              type="button"
              className="date-footer-btn"
              onClick={() => {
                onChange('');
                closeCalendar();
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="date-footer-btn date-footer-today"
              onClick={selectToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
