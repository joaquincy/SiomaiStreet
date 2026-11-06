/**
 * On-device photo quality check (brightness, blur, glare, resolution).
 *
 * Runs entirely in the browser on a small grayscale copy (≤ 640 px), so it
 * costs a few milliseconds even on low-end phones and needs no library.
 * Results are advisory only: they never block submission and are never sent
 * to the server or stored.
 */

export const QUALITY_SAMPLE_EDGE = 640;

// Conservative thresholds: better to miss a borderline photo than to nag
// applicants with false warnings. A reviewer still checks every document.
const THRESHOLDS = {
  dark: 60,         // mean luminance (0–255) below this looks underexposed
  bright: 228,      // mean luminance above this looks washed out
  blurry: 35,       // variance of the Laplacian below this looks out of focus
  glare: 0.07,      // share of near-white pixels that suggests flash glare
  minShortEdge: 700 // processed photos smaller than this may be hard to read
};

const PORTRAIT_KEYS = new Set(['idPhoto']);

/** Pure analysis of a grayscale buffer (Uint8 luminance values). */
export function analyzeLuminance(gray, width, height) {
  const total = width * height;
  if (!total || gray.length < total) throw new Error('Invalid image sample');
  let sum = 0, bright = 0, dark = 0;
  for (let i = 0; i < total; i++) {
    const v = gray[i];
    sum += v;
    if (v >= 250) bright++;
    else if (v <= 20) dark++;
  }
  // Laplacian variance: a standard, cheap focus measure.
  let lapSum = 0, lapSq = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      lapSum += lap; lapSq += lap * lap; count++;
    }
  }
  const lapMean = count ? lapSum / count : 0;
  return {
    brightness: sum / total,
    sharpness: count ? lapSq / count - lapMean * lapMean : 0,
    glare: bright / total,
    shadow: dark / total,
  };
}

/** Turns raw metrics into plain-language, applicant-facing issues. */
export function qualityIssues(metrics, { docKey, width, height } = {}) {
  const portrait = PORTRAIT_KEYS.has(docKey);
  const issues = [];
  if (metrics.brightness < THRESHOLDS.dark) issues.push({ code: 'dark', message: 'This photo looks too dark. Move to brighter, even light and retake it.' });
  // Portraits need a white background, so brightness/glare rules would misfire.
  else if (!portrait && metrics.brightness > THRESHOLDS.bright) issues.push({ code: 'bright', message: 'This photo looks washed out. Avoid direct light or flash and retake it.' });
  if (metrics.sharpness < THRESHOLDS.blurry) issues.push({ code: 'blurry', message: 'This photo may be blurry. Hold the phone steady, tap to focus and retake it.' });
  if (!portrait && metrics.glare > THRESHOLDS.glare && metrics.brightness <= THRESHOLDS.bright) issues.push({ code: 'glare', message: 'There may be glare on the document. Tilt it slightly or turn off the flash.' });
  if (width && height && Math.min(width, height) < THRESHOLDS.minShortEdge) issues.push({ code: 'small', message: 'This photo is low resolution. Move closer so the document fills the frame.' });
  return issues;
}

/** Samples a canvas/bitmap/video frame into a small grayscale buffer. */
export function sampleGrayscale(source, sourceWidth, sourceHeight, maxEdge = QUALITY_SAMPLE_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(source, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; p < gray.length; i += 4, p++) gray[p] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    return { gray, width, height };
  } finally { canvas.width = canvas.height = 0; }
}

/**
 * Full check for a processed document image. Returns null if the device
 * cannot run it (the applicant simply sees no automatic hints).
 */
export function assessDocumentQuality(source, width, height, docKey) {
  try {
    const sample = sampleGrayscale(source, width, height);
    if (!sample) return null;
    const metrics = analyzeLuminance(sample.gray, sample.width, sample.height);
    return { metrics, issues: qualityIssues(metrics, { docKey, width, height }) };
  } catch { return null; }
}

