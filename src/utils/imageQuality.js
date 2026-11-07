/**
 * On-device photo quality check (brightness, blur, glare, resolution).
 *
 * Runs after capture/editing or on occasional small camera samples.
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
const ID_SIDES = new Set(['govIdFront', 'govIdBack']);

// Average small blocks before looking for contours or strokes. Sensor noise
// and JPEG grain otherwise make an out-of-focus scene look artificially sharp.
function structureSample(gray, width, height) {
  const step = Math.max(1, Math.ceil(Math.max(width, height) / 160));
  if (step === 1) return { pixels: gray, width, height };
  const w = Math.ceil(width / step), h = Math.ceil(height / step);
  const pixels = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const right = Math.min(width, (x + 1) * step), bottom = Math.min(height, (y + 1) * step);
      let sum = 0;
      for (let row = y * step; row < bottom; row++) {
        for (let col = x * step; col < right; col++) sum += gray[row * width + col];
      }
      pixels[y * w + x] = sum / ((bottom - y * step) * (right - x * step));
    }
  }
  return { pixels, width: w, height: h };
}

// Fit an oriented rectangle around a connected light/dark region. Size,
// area coverage and aspect are geometric cues only. Text, borders and an
// ID-shaped object in the background can all affect this measurement.
function rectangleCandidate(indices, count, w, h) {
  const area = count / (w * h);
  if (area < .018 || area > .95) return null;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, edges = 0;
  for (let i = 0; i < count; i++) {
    const x = indices[i] % w, y = Math.floor(indices[i] / w);
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    if (x === 0) edges |= 1;
    if (x === w - 1) edges |= 2;
    if (y === 0) edges |= 4;
    if (y === h - 1) edges |= 8;
  }
  // Opposite frame edges often describe the background or a full-bleed scan.
  if ((edges & 3) === 3 || (edges & 12) === 12) return null;
  const cx = sx / count, cy = sy / count;
  const angle = .5 * Math.atan2(2 * (sxy / count - cx * cy), sxx / count - cx * cx - syy / count + cy * cy);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = indices[i] % w - cx, y = Math.floor(indices[i] / w) - cy;
    const u = x * cos + y * sin, v = y * cos - x * sin;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  const a = maxU - minU + 1, b = maxV - minV + 1;
  const aspect = Math.max(a, b) / Math.min(a, b);
  const fill = count / (a * b);
  if (aspect < 1.12 || aspect > 2.45 || fill < .71) return null;
  return { area: a * b / (w * h), clipped: edges !== 0, score: area * fill, cx, cy, cos, sin, minU, maxU, minV, maxV };
}

function cardRegion(pixels, w, h) {
  const perimeter = [];
  for (let x = 0; x < w; x += 2) perimeter.push(pixels[x], pixels[(h - 1) * w + x]);
  for (let y = 0; y < h; y += 2) perimeter.push(pixels[y * w], pixels[y * w + w - 1]);
  perimeter.sort((a, b) => a - b);
  const percentile = p => perimeter[Math.floor((perimeter.length - 1) * p)];
  const background = percentile(.5);
  const separation = Math.max(24, (percentile(.85) - percentile(.15)) * .45);
  const total = w * h, mask = new Uint8Array(total), queue = new Int32Array(total);
  let best = null;
  for (const sign of [1, -1]) {
    for (let i = 0; i < total; i++) mask[i] = (pixels[i] - background) * sign > separation ? 1 : 0;
    for (let i = 0; i < total; i++) {
      if (!mask[i]) continue;
      let read = 0, count = 1;
      queue[0] = i; mask[i] = 0;
      while (read < count) {
        const k = queue[read++], x = k % w;
        if (x && mask[k - 1]) { mask[k - 1] = 0; queue[count++] = k - 1; }
        if (x + 1 < w && mask[k + 1]) { mask[k + 1] = 0; queue[count++] = k + 1; }
        if (k >= w && mask[k - w]) { mask[k - w] = 0; queue[count++] = k - w; }
        if (k + w < total && mask[k + w]) { mask[k + w] = 0; queue[count++] = k + w; }
      }
      const candidate = rectangleCandidate(queue, count, w, h);
      if (candidate && (!best || candidate.score > best.score)) best = candidate;
    }
  }
  return best;
}

function inspectIdStructure(gray, width, height) {
  const { pixels, width: w, height: h } = structureSample(gray, width, height);
  const region = cardRegion(pixels, w, h);
  // Count short contrasting strokes between similar neighbors, inside the
  // candidate when possible. A sharp outer rectangle alone is insufficient.
  let strokes = 0, observed = 0, light = 0;
  let outside = 0, outsideLight = 0, outsideStrokes = 0, textBands = 0;
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      let inside = true;
      if (region) {
        const dx = x - region.cx, dy = y - region.cy;
        const u = dx * region.cos + dy * region.sin, v = dy * region.cos - dx * region.sin;
        inside = u >= region.minU + 2 && u <= region.maxU - 2 && v >= region.minV + 2 && v <= region.maxV - 2;
      }
      const i = y * w + x, value = pixels[i];
      const left = pixels[i - 2], right = pixels[i + 2];
      const above = pixels[i - 2 * w], below = pixels[i + 2 * w];
      const darkStroke = Math.max(Math.min(left, right) - value, Math.min(above, below) - value);
      const lightStroke = Math.max(value - Math.max(left, right), value - Math.max(above, below));
      const stroke = Math.max(darkStroke, lightStroke) >= 25;
      if (inside) {
        observed++;
        if (value > 215) light++;
        if (stroke) strokes++;
      } else {
        outside++;
        if (value > 215) outsideLight++;
        if (stroke) {
          outsideStrokes++;
          textBands |= 1 << Math.floor(y * 4 / h);
        }
      }
    }
  }
  // A headshot or logo inside a full-bleed scan can itself be rectangular.
  // Sharp lettering on a bright page extending past it makes a move-closer
  // cue unreliable. Acknowledge that uncertainty and keep manual inspection.
  if (outside > .35 * w * h && outsideLight / outside > .7 && outsideStrokes / outside > .012
      && (textBands & (textBands - 1)) !== 0) {
    return { region: null, lowDetail: false, lightPage: true };
  }
  return { region, lowDetail: !observed || strokes / observed < .004, lightPage: observed > 0 && light / observed > .65 };
}

export function analyzeDocumentSample(gray, sampleWidth, sampleHeight, { docKey, width, height }) {
  const metrics = analyzeLuminance(gray, sampleWidth, sampleHeight);
  const issues = qualityIssues(metrics, { docKey, width, height });
  if (!ID_SIDES.has(docKey)) return { metrics, issues };
  const { region, lowDetail, lightPage } = inspectIdStructure(gray, sampleWidth, sampleHeight);
  if (!issues.some(issue => issue.code === 'dark') && metrics.brightness < 105 && lowDetail && metrics.contrast < 40) {
    issues.unshift({ code: 'dark', message: 'The image looks dim and fine details are hard to distinguish. Move into even light and retake.' });
  }
  if (region?.clipped) issues.push({ code: 'frame-cutoff', message: 'A possible document edge meets the frame. Leave a little space around all four corners.' });
  else if (region && region.area < .18) issues.push({ code: 'frame-small', message: 'The possible document area looks small. Move closer while keeping all four corners visible.' });
  else if (!region && !(lightPage && !lowDetail)) issues.push({ code: 'frame-unclear', message: 'The ID outline is unclear. Place the whole ID or passport page on a contrasting surface and check all four corners.' });
  if (lowDetail && !issues.some(issue => ['bright', 'blurry', 'dark'].includes(issue.code))) {
    issues.push({ code: 'detail', message: 'Fine lettering is hard to distinguish. Hold steady, refocus on the ID and check the enlarged text.' });
  }
  return { metrics, issues };
}

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
export function sampleGrayscale(source, sourceWidth, sourceHeight, maxEdge = QUALITY_SAMPLE_EDGE, reusableCanvas) {
  if (![sourceWidth, sourceHeight, maxEdge].every(v => Number.isFinite(v) && v > 0)) return null;
  const scale = Math.min(1, Math.min(maxEdge, QUALITY_SAMPLE_EDGE) / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = reusableCanvas || document.createElement('canvas');
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(source, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; p < gray.length; i += 4, p++) gray[p] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    return { gray, width, height };
  } finally { if (!reusableCanvas) canvas.width = canvas.height = 0; }
}

/**
 * Check a captured image or occasional camera sample. A null result lets
 * the caller offer manual inspection when pixel access is unavailable.
 */
export function assessDocumentQuality(source, width, height, docKey, maxEdge = QUALITY_SAMPLE_EDGE, reusableCanvas) {
  try {
    const sample = sampleGrayscale(source, width, height, maxEdge, reusableCanvas);
    if (!sample) return null;
    return analyzeDocumentSample(sample.gray, sample.width, sample.height, { docKey, width, height });
  } catch { return null; }
}

