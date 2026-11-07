import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
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

test('readable ID on a similarly colored surface or scanned against tinted paper needs no retake', () => {
  for (const portrait of [false, true]) {
    const pixels = image((x, y) => {
      if (x < 8 || y < 10 || x > 312 || y > 230) return 178;
      if (portrait && x > 18 && x < 98 && y > 30 && y < 168) return 72;
      const lettering = x > 108 && x < 288 && y > 27 && y < 205 && y % 18 < 7 && x % 9 < 4;
      return lettering ? 30 : 185;
    });
    for (const side of ['govIdFront', 'govIdBack']) assert.deepEqual(codes(pixels, side), []);
  }
});

test('a dark tabletop does not make a well-lit readable ID underexposed', () => {
  const pixels = card({ w: 173, h: 112 }).map(value => value === 52 ? 5 : value);
  assert.ok(analyzeLuminance(pixels, width, height).brightness < 60);
  assert.deepEqual(codes(pixels), []);
});

test('a moderate-resolution ID is assessed on visible detail while a very small upload still gets guidance', () => {
  const assess = (pixels, shortEdge) => analyzeDocumentSample(pixels, width, height, {
    docKey: 'govIdFront', width: Math.round(shortEdge * 1.5), height: shortEdge,
  }).issues.map(issue => issue.code);
  assert.deepEqual(assess(card(), 640), []);
  assert.ok(assess(card(), 260).includes('small'));
  assert.ok(assess(card({ ink: false }), 480).includes('small'));
});

test('compressed synthetic IDs with real lettering stay clear at live and final-preview sample sizes', async () => {
  const lines = ['SYNTHETIC SAMPLE', 'GOVERNMENT ID EXAMPLE', 'Surname: DELA CRUZ', 'Given names: JUAN', 'Birth date: 01 JAN 1990', 'ID number: AB1234567'];
  const scenes = [
    { name: 'white scan', background: '#fff', stock: '#fff', ink: '#333', font: 40 },
    { name: 'tinted card', background: '#b5ad9e', stock: '#c8c2b6', ink: '#333', font: 40 },
    { name: 'fine print', background: '#554c42', stock: '#ece7df', ink: '#343434', font: 22 },
    { name: 'dark card', background: '#ddd', stock: '#343434', ink: '#eee', font: 38 },
    { name: 'dark tabletop', background: '#090909', stock: '#eee9df', ink: '#333', font: 40 },
  ];
  for (const scene of scenes) {
    const text = lines.map((line, index) => `<text x="610" y="${240 + index * 85}" font-family="Arial" font-size="${scene.font}" fill="${scene.ink}">${line}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000">
      <rect width="1600" height="1000" fill="${scene.background}"/>
      <rect x="180" y="110" width="1240" height="780" rx="30" fill="${scene.stock}"/>
      <rect x="250" y="280" width="300" height="400" fill="#939393"/>${text}</svg>`;
    const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
    for (const edge of [256, 640]) {
      const { data, info } = await sharp(jpeg).resize({ width: edge }).greyscale().raw().toBuffer({ resolveWithObject: true });
      const result = analyzeDocumentSample(data, info.width, info.height, { docKey: 'govIdFront', width: 1600, height: 1000 });
      assert.deepEqual(result.issues, [], `${scene.name} at ${edge}px`);
    }
  }
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
