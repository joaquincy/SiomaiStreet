/**
 * On-device photo quality check (brightness, blur, glare, resolution).
 *
 * Runs after capture/editing on a small grayscale copy (at most 640 px).
 * These inexpensive heuristics need no additional library. They cannot prove
 * readability, the presence of a document, or authenticity.
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
  lowContrast: 18, // near-white paper with visible text must not trigger exposure hints
  minShortEdge: 700 // processed photos smaller than this may be hard to read
};

const PORTRAIT_KEYS = new Set(['idPhoto']);

/** Pure analysis of a grayscale buffer (Uint8 luminance values). */
export function analyzeLuminance(gray, width, height) {
  const total = width * height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || !gray || gray.length < total) throw new Error('Invalid image sample');
  let sum = 0, sumSq = 0, bright = 0, dark = 0;
  // Small spatial grid distinguishes a localized clipped highlight from a
  // normal white page. Global white-pixel percentage alone is not glare.
  const gridSize = 8;
  const tiles = Array.from({ length: gridSize * gridSize }, () => ({ count: 0, sum: 0, bright: 0 }));
  for (let i = 0; i < total; i++) {
    const v = gray[i];
    sum += v; sumSq += v * v;
    const x = i % width, y = Math.floor(i / width);
    const tile = tiles[Math.floor(y * gridSize / height) * gridSize + Math.floor(x * gridSize / width)];
    tile.count++; tile.sum += v;
    if (v >= 250) tile.bright++;
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
  let localizedHighlight = false;
  if (bright / total < .3) {
    for (let y = 1; y < gridSize - 1 && !localizedHighlight; y++) {
      for (let x = 1; x < gridSize - 1; x++) {
        const i = y * gridSize + x, tile = tiles[i];
        if (!tile.count || tile.bright / tile.count < .8 || tile.sum / tile.count < 247) continue;
        const neighbors = [tiles[i - 1], tiles[i + 1], tiles[i - gridSize], tiles[i + gridSize]];
        if (neighbors.filter(t => t.count && t.sum / t.count < 210).length >= 3) {
          localizedHighlight = true; break;
        }
      }
    }
  }
  return {
    brightness: sum / total,
    contrast: Math.sqrt(Math.max(0, sumSq / total - (sum / total) ** 2)),
    sharpness: count ? lapSq / count - lapMean * lapMean : 0,
    glare: bright / total,
    shadow: dark / total,
    localizedHighlight,
  };
}

/** Turns raw metrics into plain-language, applicant-facing issues. */
export function qualityIssues(metrics, { docKey, width, height } = {}) {
  const portrait = PORTRAIT_KEYS.has(docKey);
  const issues = [];
  if (metrics.brightness < THRESHOLDS.dark) issues.push({ code: 'dark', message: 'This photo looks too dark. Move to brighter, even light and retake it.' });
  // A white page with crisp text is expected. Only suggest checking exposure
  // when a bright sample also lacks contrast and fine detail.
  else if (!portrait && metrics.brightness > THRESHOLDS.bright && metrics.contrast < THRESHOLDS.lowContrast && metrics.sharpness < THRESHOLDS.blurry) issues.push({ code: 'bright', message: 'Very little detail is visible in this bright photo. Inspect the enlarged preview; if text is washed out, avoid flash and retake it.' });
  else if (metrics.sharpness < THRESHOLDS.blurry) issues.push({ code: 'blurry', message: 'Fine detail may be hard to read. Inspect the enlarged preview; if text or facial details are blurred, hold steady, tap to focus and retake.' });
  if (!portrait && metrics.localizedHighlight) issues.push({ code: 'glare', message: 'Check the bright area in the enlarged preview. If a reflection hides details, tilt the document slightly or turn off flash and retake.' });
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

