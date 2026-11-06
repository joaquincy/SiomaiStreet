import { useState, useRef, useCallback } from 'react';
import { BiScan, BiCheck, BiX } from 'react-icons/bi';
import './OcrAutofill.css';

/**
 * "Read from ID" button and confirmation dialog. Lazy-loads Tesseract.js
 * on demand, runs OCR entirely on-device, and lets the applicant confirm or
 * edit each extracted field before it is written to formData.
 *
 * Privacy: the image never leaves the browser. OCR results are stored only
 * if the applicant explicitly confirms. Compliant with RA 10173.
 */
export default function OcrAutofill({ file, formData, updateField }) {
  const [state, setState] = useState('idle'); // idle | loading | results | error
  const [fields, setFields] = useState({ firstName: '', lastName: '', middleName: '', idNumber: '' });
  const [edits, setEdits] = useState({});
  const abortRef = useRef(null);

  const run = useCallback(async () => {
    if (!file || state === 'loading') return;
    setState('loading');
    setEdits({});

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { recognizeText, extractIdFields } = await import('../utils/documentOcr');
      const result = await recognizeText(file, controller.signal);

      if (controller.signal.aborted) return;
      if (!result || !result.lines.length) {
        setState('error');
        return;
      }

      const extracted = extractIdFields(result.lines);
      setFields(extracted);
      setEdits(extracted);
      setState('results');
    } catch {
      if (!controller.signal.aborted) setState('error');
    }
  }, [file, state]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setFields({ firstName: '', lastName: '', middleName: '', idNumber: '' });
    setEdits({});
  }, []);

  const applyFields = useCallback(() => {
    const final = { ...fields, ...edits };
    // Only update fields that have a value; warn if overwriting
    if (final.firstName) updateField('firstName', final.firstName);
    if (final.lastName) updateField('lastName', final.lastName);
    if (final.middleName) updateField('middleName', final.middleName);
    if (final.idNumber) updateField('govIdNumber', final.idNumber);
    setState('idle');
  }, [fields, edits, updateField]);

  const updateEdit = useCallback((key, value) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  }, []);

  const hasAnyValue = Object.values({ ...fields, ...edits }).some(v => v);

  if (state === 'idle') {
    return (
      <div className="ocr-autofill">
        <button type="button" className="ocr-trigger" onClick={run} disabled={!file}>
          <BiScan aria-hidden="true" />
          <span>Read from ID</span>
          <span className="ocr-trigger-hint">Auto-fill name &amp; ID number</span>
        </button>
        <p className="ocr-privacy-note">
          Runs on this device only — your photo is never sent to any server for reading.
        </p>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="ocr-autofill">
        <div className="ocr-loading" role="status">
          <span className="ocr-spinner" aria-hidden="true" />
          <span>Reading your ID… This may take a few seconds on some phones.</span>
        </div>
        <button type="button" className="ocr-cancel" onClick={cancel}>Cancel</button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="ocr-autofill">
        <p className="ocr-error" role="status">
          Could not read text from this photo. Please enter your details manually.
        </p>
        <div className="ocr-error-actions">
          <button type="button" onClick={run}><BiScan aria-hidden="true" /> Try again</button>
          <button type="button" onClick={cancel}>Dismiss</button>
        </div>
      </div>
    );
  }

  // state === 'results'
  const editedFields = { ...fields, ...edits };
  const existingOverlap = [];
  if (editedFields.firstName && formData.firstName && formData.firstName !== editedFields.firstName) existingOverlap.push('First Name');
  if (editedFields.lastName && formData.lastName && formData.lastName !== editedFields.lastName) existingOverlap.push('Last Name');
  if (editedFields.idNumber && formData.govIdNumber && formData.govIdNumber !== editedFields.idNumber) existingOverlap.push('ID Number');

  return (
    <div className="ocr-autofill ocr-results">
      <div className="ocr-results-header">
        <BiScan aria-hidden="true" />
        <strong>Review extracted details</strong>
        <button type="button" className="ocr-close" onClick={cancel} aria-label="Dismiss OCR results"><BiX aria-hidden="true" /></button>
      </div>
      <p className="ocr-results-note">Check and correct each field. Nothing is saved until you tap "Use these details".</p>
      <div className="ocr-fields">
        {[
          ['firstName', 'First Name'],
          ['middleName', 'Middle Name'],
          ['lastName', 'Last Name'],
          ['idNumber', 'ID Number'],
        ].map(([key, label]) => (
          <label key={key} className="ocr-field">
            <span className="ocr-field-label">{label}</span>
            <input
              type="text"
              value={edits[key] ?? fields[key] ?? ''}
              onChange={e => updateEdit(key, e.target.value)}
              placeholder={`No ${label.toLowerCase()} detected`}
            />
          </label>
        ))}
      </div>
      {existingOverlap.length > 0 && (
        <p className="ocr-overwrite-warning" role="status">
          This will replace existing values for: {existingOverlap.join(', ')}.
        </p>
      )}
      <div className="ocr-results-actions">
        <button type="button" className="ocr-apply" onClick={applyFields} disabled={!hasAnyValue}>
          <BiCheck aria-hidden="true" /> Use these details
        </button>
        <button type="button" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}

