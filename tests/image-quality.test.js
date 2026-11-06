import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { analyzeLuminance, qualityIssues, QUALITY_SAMPLE_EDGE } from '../src/utils/imageQuality.js';
import { analyzeCompressedImage, renderDocumentImage } from '../src/utils/documentImage.js';

const width = 128, height = 96;
const options = { docKey: 'govIdFront', width: 1600, height: 1000 };
const codes = (pixels, settings = options) => qualityIssues(analyzeLuminance(pixels, width, height), settings).map(i => i.code);
function paperWithText() {
  const pixels = new Uint8Array(width * height).fill(255);
  for (let y = 20; y < 76; y += 12) {
    for (let x = 18; x < 100; x += 7) {
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 3; dx++) pixels[(y + dy) * width + x + dx] = 30;
    }
  }
  return pixels;
}

test('crisp small text on ordinary white paper does not trigger glare or exposure warnings', () => {
  const pixels = paperWithText();
  assert.ok(analyzeLuminance(pixels, width, height).brightness > 228);
  assert.deepEqual(codes(pixels), []);
});

test('dark, low-detail and washed-out samples give specific advisory recovery', async () => {
  assert.deepEqual(codes(new Uint8Array(width * height).fill(22)), ['dark']);
  assert.deepEqual(codes(new Uint8Array(width * height).fill(254)), ['bright']);
  const blurred = await sharp(paperWithText(), { raw: { width, height, channels: 1 } }).blur(3).greyscale().raw().toBuffer();
  assert.ok(codes(blurred).some(c => c === 'blurry' || c === 'bright'));
  const dimBlurred = await sharp(blurred, { raw: { width, height, channels: 1 } }).linear(.7).greyscale().raw().toBuffer();
  assert.ok(codes(dimBlurred).includes('blurry'));
});

test('localized highlight suggests inspection; white portrait backgrounds skip glare and exposure checks', () => {
  const reflective = new Uint8Array(width * height).fill(150);
  for (let y = 36; y < 48; y++) for (let x = 48; x < 64; x++) reflective[y * width + x] = 255;
  assert.ok(codes(reflective).includes('glare'));
  assert.ok(!codes(reflective, { ...options, docKey: 'idPhoto' }).includes('glare'));
  assert.ok(!codes(new Uint8Array(width * height).fill(255), { ...options, docKey: 'idPhoto' }).includes('bright'));
});

test('low resolution adds a size hint independently of crispness; malformed samples are rejected', () => {
  assert.deepEqual(codes(paperWithText(), { ...options, width: 300, height: 400 }), ['small']);
  for (const [w, h] of [[0, 1], [-1, 1], [NaN, 1], [1.5, 2], [Infinity, 2], [500, 500]]) {
    assert.throws(() => analyzeLuminance(new Uint8Array(100), w, h), /Invalid image sample/);
  }
});

test('assessment decodes the encoded JPEG at bounded size, passes portrait context and releases the bitmap', async t => {
  const old = globalThis.createImageBitmap;
  t.after(() => { if (old) globalThis.createImageBitmap = old; else delete globalThis.createImageBitmap; });
  const jpeg = new Blob(['synthetic encoded JPEG'], { type: 'image/jpeg' });
  let closed = false;
  const bitmap = { close() { closed = true; } };
  globalThis.createImageBitmap = async (source, settings) => {
    assert.equal(source, jpeg);
    assert.ok(Math.max(settings.resizeWidth, settings.resizeHeight) <= QUALITY_SAMPLE_EDGE);
    return bitmap;
  };
  const result = await analyzeCompressedImage(jpeg, 1200, 800, 'idPhoto', (source, w, h, key) => {
    assert.equal(source, bitmap); assert.equal(w, 1200); assert.equal(h, 800); assert.equal(key, 'idPhoto');
    return { issues: [] };
  });
  assert.deepEqual(result, { issues: [] }); assert.ok(closed);
});

test('optional quality failures release their bitmap and do not reject the document', async t => {
  const old = globalThis.createImageBitmap;
  t.after(() => { if (old) globalThis.createImageBitmap = old; else delete globalThis.createImageBitmap; });
  let closed = 0;
  globalThis.createImageBitmap = async () => ({ close() { closed++; } });
  assert.equal(await analyzeCompressedImage(new Blob(), 100, 100, 'govIdFront', () => { throw new Error('canvas blocked'); }), null);
  assert.equal(closed, 1);
  globalThis.createImageBitmap = async () => { throw new Error('decoder unavailable'); };
  assert.equal(await analyzeCompressedImage(new Blob(), 100, 100, 'govIdFront', () => {}), null);
});

test('image rendering assesses the final compressed bytes after freeing large canvases', async t => {
  const oldDocument = globalThis.document, oldBitmap = globalThis.createImageBitmap;
  t.after(() => {
    if (oldDocument) globalThis.document = oldDocument; else delete globalThis.document;
    if (oldBitmap) globalThis.createImageBitmap = oldBitmap; else delete globalThis.createImageBitmap;
  });
  const canvases = [];
  const jpeg = new Blob(['processed'], { type: 'image/jpeg' });
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, getContext: () => ({ fillRect() {}, translate() {}, rotate() {}, drawImage() {} }), toBlob: callback => callback(jpeg) };
    canvases.push(canvas); return canvas;
  } };
  globalThis.createImageBitmap = async blob => {
    assert.equal(blob, jpeg);
    assert.ok(canvases.every(c => c.width === 0 && c.height === 0));
    return { close() {} };
  };
  const result = await renderDocumentImage({ width: 4000, height: 3000 }, 90, undefined, {
    docKey: 'govIdFront', analyze: (_bitmap, w, h, key) => {
      assert.equal(w, 1800); assert.equal(h, 2400); assert.equal(key, 'govIdFront'); return { issues: [] };
    },
  });
  assert.equal(await result.file.text(), 'processed'); assert.deepEqual(result.quality, { issues: [] });
});
