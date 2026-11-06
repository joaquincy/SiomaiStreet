/**
 * On-device OCR via Tesseract.js — lazy-loaded, Web Worker-based.
 *
 * Nothing leaves the browser: the WASM engine and English language model are
 * served from /ocr/ on our own domain (copied there by copy-ocr-assets.mjs).
 * The applicant can autofill name and ID number from a photo of their ID,
 * then confirm or edit the values before they are used.
 *
 * Performance notes:
 * - The engine (~3 MB WASM + ~2.9 MB language data) is downloaded only when
 *   the applicant taps "Read from ID", never on page load.
 * - Recognition runs in a Web Worker so the UI stays responsive.
 * - A 15-second timeout prevents indefinite blocking on slow devices.
 * - If the engine fails to load, the UI silently falls back to manual entry.
 */

let workerPromise = null;

async function getWorker() {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr',
      langPath: '/ocr/lang',
      cacheMethod: 'readOnly',  // use IndexedDB cache after first download
    });
    return worker;
  })();
  // If init fails, allow a retry next time
  workerPromise.catch(() => { workerPromise = null; });
  return workerPromise;
}

/**
 * Recognize text from an image blob/file. Returns the full text and an array
 * of lines, or null if OCR is unavailable.
 *
 * @param {Blob|File} image
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ text: string, lines: string[], confidence: number } | null>}
 */
export async function recognizeText(image, signal) {
  try {
    const worker = await Promise.race([
      getWorker(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OCR engine timed out')), 15_000)),
      ...(signal ? [new Promise((_, reject) => { signal.addEventListener('abort', () => reject(signal.reason), { once: true }); })] : []),
    ]);
    if (signal?.aborted) return null;
    const { data } = await worker.recognize(image);
    if (signal?.aborted) return null;
    return {
      text: data.text,
      lines: data.lines.map(l => l.text.trim()).filter(Boolean),
      confidence: data.confidence,
    };
  } catch {
    return null;
  }
}

/**
 * Extract candidate name and ID number from OCR lines.
 * These are best-effort guesses: the applicant always confirms.
 */
export function extractIdFields(lines) {
  const result = { firstName: '', lastName: '', middleName: '', idNumber: '' };
  if (!lines?.length) return result;

  // Look for lines that might contain an ID number (alphanumeric with dashes)
  for (const line of lines) {
    const idMatch = line.match(/\b([A-Z0-9]{2,4}[-\s]?[A-Z0-9]{4,}[-\s]?[A-Z0-9]{2,})\b/i);
    if (idMatch && !result.idNumber) {
      result.idNumber = idMatch[1].replace(/\s+/g, '');
    }
  }

  // Look for name patterns: "LAST NAME, FIRST NAME MIDDLE NAME" or similar
  for (const line of lines) {
    const commaName = line.match(/^([A-Z][A-Z\s]+),\s*([A-Z][A-Z\s]+?)(?:\s+([A-Z][A-Z\s]*?))?$/i);
    if (commaName) {
      result.lastName = titleCase(commaName[1]);
      const parts = commaName[2].trim().split(/\s+/);
      result.firstName = titleCase(parts[0] || '');
      result.middleName = titleCase(commaName[3]?.trim() || parts.slice(1).join(' '));
      break;
    }
  }

  return result;
}

function titleCase(s) {
  return s ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
}

/** Terminate the worker to free memory. Safe to call multiple times. */
export async function terminateOcr() {
  if (!workerPromise) return;
  try { const w = await workerPromise; await w.terminate(); } catch { /* already gone */ }
  workerPromise = null;
}

