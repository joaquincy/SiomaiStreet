import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDocumentSample, analyzeLuminance } from '../src/utils/imageQuality.js';

const width = 320;
const height = 240;
function image(valueAt) {
  const pixels = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixels[y * width + x] = valueAt(x, y);
  }
  return pixels;
}
function card({ cx = 160, cy = 120, w = 220, h = 142, degrees = 0, ink = true, inverted = false } = {}) {
  const theta = degrees * Math.PI / 180;
  return image((x, y) => {
    const u = (x - cx) * Math.cos(theta) + (y - cy) * Math.sin(theta) + w / 2;
    const v = (y - cy) * Math.cos(theta) - (x - cx) * Math.sin(theta) + h / 2;
    const inside = u > 0 && v > 0 && u < w && v < h;
    const glyph = ink && u > w * .12 && u < w * .86 && v > h * .2 && v < h * .8 && v % 15 < 7 && u % 9 < 4;
    const value = inside ? (glyph ? 30 : 220) : 52;
    return inverted ? 255 - value : value;
  });
}
const codes = (pixels, docKey = 'govIdFront') => analyzeDocumentSample(pixels, width, height, { docKey, width: 1600, height: 1200 }).issues.map(i => i.code);
const framing = list => list.filter(code => code.startsWith('frame-'));

test('horizontal, portrait, rotated and dark cards on contrasting surfaces avoid framing warnings', () => {
  for (const options of [{}, { degrees: 90 }, { degrees: 17 }, { degrees: -27 }, { inverted: true }]) {
    assert.deepEqual(framing(codes(card(options))), [], JSON.stringify(options));
  }
});

test('tiny and cut-off rectangular regions receive distinct framing guidance', () => {
  assert.ok(codes(card({ w: 92, h: 58 })).includes('frame-small'));
  assert.ok(codes(card({ cx: 88 })).includes('frame-cutoff'));
});

test('noisy, dim soft-focus scene produces a light and framing hint even with high Laplacian variance', () => {
  let rng = 824;
  const scene = image((x, y) => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return 80 + (rng / 4294967296 - .5) * 24 + 16 * Math.sin((x + y) / 34);
  });
  assert.ok(analyzeLuminance(scene, width, height).sharpness > 35);
  const issues = codes(scene);
  assert.ok(issues.includes('frame-unclear'));
  assert.ok(issues.includes('dark'));
});

test('bright blurred scene without card prompts inspection and outlines stay advisory', () => {
  const issues = codes(image((x, y) => 142 + Math.sin(x / 21 + y / 50) * 15));
  assert.ok(issues.includes('frame-unclear'));
  assert.ok(issues.includes('blurry') || issues.includes('detail'));
  // A sharp outer border alone cannot supply fine print.
  assert.ok(codes(card({ ink: false })).includes('detail'));
});

test('full-bleed light scan with crisp lettering needs no contrasting border', () => {
  const pixels = image((x, y) => y > 12 && y < 227 && x > 12 && x < 308 && y % 20 < 8 && x % 10 < 4 ? 38 : 246);
  assert.deepEqual(codes(pixels), []);
});

test('an internal portrait or logo on a readable scan is not treated as a blank distant ID', () => {
  const pixels = image((x, y) => {
    if (x > 8 && x < 89 && y > 25 && y < 174) return 85;
    const text = y > 18 && y < 182 && x > 100 && x < 308 && y % 20 < 8 && x % 10 < 4;
    return text ? 38 : 244;
  });
  assert.deepEqual(codes(pixels), []);
});

test('portrait and supporting evidence never receive ID-specific framing or stroke hints', () => {
  for (const key of ['idPhoto', 'proofOfFunds', 'proofOfBilling']) {
    const issues = codes(card({ w: 70, h: 45, ink: false }), key);
    assert.deepEqual(framing(issues), []);
    assert.ok(!issues.includes('detail'));
  }
  assert.ok(codes(card({ w: 70, h: 45 }), 'govIdBack').includes('frame-small'));
});
