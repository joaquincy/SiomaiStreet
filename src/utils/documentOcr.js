// Imported only after an applicant requests OCR. One short-lived job at a time.
// A host worker owns Tesseract's nested worker, so cancelling also stops a
// stalled initialization before the SDK has returned its worker handle.
export const OCR_TIMEOUT_MS = 45_000;

export function normalizeOcrResult(data) {
  const text = typeof data?.text === 'string' ? data.text.slice(0, 30_000) : '';
  return { text, lines: text.split(/\r?\n/).map(line => line.trim()).filter(Boolean), confidence: Number.isFinite(data?.confidence) ? data.confidence : 0 };
}

export function createOcrReader({ createWorker, timeoutMs = OCR_TIMEOUT_MS }) {
  let active = null;
  const cancel = () => active?.finish(null);
  const recognizeText = (image, signal) => {
    cancel();
    if (signal?.aborted || !image?.type?.startsWith('image/')) return Promise.resolve(null);
    return new Promise(resolve => {
      let host, timer, finished = false;
      const finish = value => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        if (host) {
          host.onmessage = host.onerror = host.onmessageerror = null;
          host.terminate();
        }
        if (active?.finish === finish) active = null;
        resolve(value);
      };
      const abort = () => finish(null);
      active = { finish };
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(abort, timeoutMs);
      try {
        host = createWorker();
        host.onmessage = event => finish(event.data?.ok ? normalizeOcrResult(event.data.result) : null);
        host.onerror = event => { event.preventDefault?.(); finish(null); };
        host.onmessageerror = abort;
        host.postMessage({ image });
      } catch { finish(null); }
    });
  };
  return { recognizeText, cancel };
}

const reader = createOcrReader({
  createWorker: () => new Worker(new URL('./documentOcr.worker.js', import.meta.url), { type: 'module', name: 'document-ocr' }),
});
export const recognizeText = reader.recognizeText;
export const terminateOcr = reader.cancel;

const NAME = /^[\p{L}][\p{L}\p{M} .’'-]{0,99}$/u;
const HEADING = /\b(republic|philippines|department|national|passport|identity|identification|address|surname|given names?|first name|last name|middle name|date|sex|gender|citizenship|signature)\b/i;
const NAME_LABELS = {
  firstName: /^(?:given names?|first names?|mga pangalan)\s*[:.]?\s*/i,
  lastName: /^(?:last name|surname|apelyido)\s*[:.]?\s*/i,
  middleName: /^(?:middle name|gitnang pangalan)\s*[:.]?\s*/i,
};
const ID_LABEL = /^(?:ID(?:entification)?\s*(?:number|no\.?|#)|passport\s*(?:number|no\.?)|license\s*(?:number|no\.?)|PCN|CRN)\s*[:.]?\s*/i;
const clean = value => value.trim().replace(/\s+/g, ' ');
const nameCandidate = value => NAME.test(value) && !HEADING.test(value) ? value : '';

// Prefer leaving an uncertain field empty over guessing a heading or date.
// No authenticity determination; applicants must inspect and confirm results.
export function extractIdFields(input) {
  const result = { firstName: '', lastName: '', middleName: '', idNumber: '' };
  const lines = Array.isArray(input) ? input.filter(line => typeof line === 'string').slice(0, 100).map(clean) : [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [field, label] of Object.entries(NAME_LABELS)) {
      if (result[field] || !label.test(line)) continue;
      const value = clean(line.replace(label, '')) || lines[i + 1] || '';
      result[field] = nameCandidate(value);
    }
    if (!result.idNumber && ID_LABEL.test(line)) {
      const value = clean(line.replace(ID_LABEL, '')) || lines[i + 1] || '';
      const compact = value.replace(/\s/g, '');
      if (/^[A-Z0-9-]{6,30}$/i.test(compact) && (compact.match(/\d/g) || []).length >= 5 && !/^\d{4}-\d{2}-\d{2}$/.test(compact)) result.idNumber = compact;
    }
  }
  // Do not invent a middle name or split a legitimate multi-part first name.
  if (!result.firstName && !result.lastName) {
    for (const line of lines) {
      const parts = line.split(',').map(clean);
      if (parts.length === 2 && parts.every(nameCandidate)) {
        [result.lastName, result.firstName] = parts;
        break;
      }
    }
  }
  return result;
}
