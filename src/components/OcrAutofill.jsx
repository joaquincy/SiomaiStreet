import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { BiScan, BiCheck, BiX } from 'react-icons/bi';
import './OcrAutofill.css';

/**
 * "Read from ID" button and confirmation dialog. Lazy-loads Tesseract.js
 * on demand, runs OCR entirely on-device, and lets the applicant confirm or
 * edit each extracted field before it is written to formData.
 *
 * OCR analysis stays on-device. Confirmed documents are uploaded separately
 * on application submission. Suggestions only change answers after confirmation.
 */
export default function OcrAutofill({ file, formData, updateField }) {
  const id = useId();
  const [state, setState] = useState('idle'); // idle | loading | results | error
  const [fields, setFields] = useState({ firstName: '', lastName: '', middleName: '', idNumber: '' });
  const [edits, setEdits] = useState({});
  const abortRef = useRef(null);
  const resultFile = useRef(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    resultFile.current = null;
    setState('idle');
    setFields({ firstName: '', lastName: '', middleName: '', idNumber: '' });
    setEdits({});
    setConfirmed(false);
    return () => { abortRef.current?.abort(); };
  }, [file]);

  useEffect(() => { setConfirmed(false); }, [formData.firstName, formData.middleName, formData.lastName, formData.govIdNumber]);

  const run = useCallback(async () => {
    if (!file?.type?.startsWith('image/') || abortRef.current) return;
    setState('loading');
    setEdits({});
    setConfirmed(false);

    const controller = new AbortController();
    abortRef.current = controller;
    // Include the lazy module download in the deadline. Import itself cannot be
    // cancelled, so ignore its eventual result after cancellation or expiry.
    const deadline = setTimeout(() => {
      if (!controller.signal.aborted && abortRef.current === controller) {
        controller.abort();
        abortRef.current = null;
        setState('error');
      }
    }, 45_000);
    const clearDeadline = () => clearTimeout(deadline);
    controller.signal.addEventListener('abort', clearDeadline, { once: true });

    try {
      const { recognizeText, extractIdFields } = await import('../utils/documentOcr');
      if (controller.signal.aborted) return;
      const result = await recognizeText(file, controller.signal);

      if (controller.signal.aborted) return;
      if (!result || !result.lines.length) {
        setState('error');
        return;
      }

      const extracted = extractIdFields(result.lines);
      resultFile.current = file;
      setFields(extracted);
      setEdits(extracted);
      setState('results');
    } catch {
      if (!controller.signal.aborted) setState('error');
    } finally {
      clearTimeout(deadline);
      controller.signal.removeEventListener('abort', clearDeadline);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [file]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    resultFile.current = null;
    setState('idle');
    setFields({ firstName: '', lastName: '', middleName: '', idNumber: '' });
    setEdits({});
    setConfirmed(false);
  }, []);

  const applyFields = useCallback(() => {
    if (!confirmed || resultFile.current !== file) return;
    const final = { ...fields, ...edits };
    // Only update fields that have a value; warn if overwriting
    if (final.firstName.trim()) updateField('firstName', final.firstName.trim());
    if (final.lastName.trim()) updateField('lastName', final.lastName.trim());
    if (final.middleName.trim()) updateField('middleName', final.middleName.trim());
    if (final.idNumber.trim()) updateField('govIdNumber', final.idNumber.trim());
    cancel();
  }, [fields, edits, updateField, confirmed, file, cancel]);

  const updateEdit = useCallback((key, value) => {
    setEdits(prev => ({ ...prev, [key]: value }));
    setConfirmed(false);
  }, []);

  const hasAnyValue = Object.values({ ...fields, ...edits }).some(v => v.trim());

  if (!file?.type?.startsWith('image/')) return <p className="ocr-privacy-note">ID reading supports photos. For a PDF, enter your details manually.</p>;

  if (state === 'idle') {
    return (
      <div className="ocr-autofill">
        <button type="button" className="ocr-trigger" onClick={run} disabled={!file}>
          <BiScan aria-hidden="true" />
          <span>Read from ID</span>
          <span className="ocr-trigger-hint">Auto-fill name &amp; ID number</span>
        </button>
        <p className="ocr-privacy-note">
          Optional. The reading tools download when you start. Analysis stays on this device; you can always type your details manually.
        </p>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="ocr-autofill">
        <div className="ocr-loading" role="status">
          <span className="ocr-spinner" aria-hidden="true" />
          <span>Reading your ID… The first run may take longer while the tools download. Cancel any time to enter details manually.</span>
        </div>
        <button type="button" className="ocr-cancel" onClick={cancel}>Cancel</button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="ocr-autofill">
        <p className="ocr-error" role="status">
          ID reading could not finish. Your document and answers are unchanged. Try a clearer photo or enter your details manually.
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
  if (editedFields.middleName && formData.middleName && formData.middleName !== editedFields.middleName) existingOverlap.push('Middle Name');
  if (editedFields.idNumber && formData.govIdNumber && formData.govIdNumber !== editedFields.idNumber) existingOverlap.push('ID Number');

  return (
    <div className="ocr-autofill ocr-results">
      <div className="ocr-results-header">
        <BiScan aria-hidden="true" />
        <strong>Review extracted details</strong>
        <button type="button" className="ocr-close" onClick={cancel} aria-label="Dismiss OCR results"><BiX aria-hidden="true" /></button>
      </div>
      <p className="ocr-results-note" role="status">{hasAnyValue ? 'Suggestions are ready. Compare them with your ID and correct any mistakes.' : 'Text was read, but no reliable name or ID number was identified. Enter the details manually.'} This does not verify your identity. Empty fields keep your existing answers.</p>
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
              maxLength={100}
              autoComplete="off"
            />
            {formData[key === 'idNumber' ? 'govIdNumber' : key] && <span className="ocr-current-answer">Current: {formData[key === 'idNumber' ? 'govIdNumber' : key]}</span>}
          </label>
        ))}
      </div>
      {existingOverlap.length > 0 && (
        <p className="ocr-overwrite-warning" role="status">
          This will replace existing values for: {existingOverlap.join(', ')}.
        </p>
      )}
      <label className="ocr-confirmation" htmlFor={`${id}-confirm`}>
        <input id={`${id}-confirm`} type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        <span>I checked these details against my ID and want to use them{existingOverlap.length ? ', replacing the current answers listed above' : ''}.</span>
      </label>
      <div className="ocr-results-actions">
        <button type="button" className="ocr-apply" onClick={applyFields} disabled={!hasAnyValue || !confirmed || resultFile.current !== file}>
          <BiCheck aria-hidden="true" /> Use these details
        </button>
        <button type="button" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}

