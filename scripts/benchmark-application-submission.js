// Local synthetic benchmark, not a prediction of hosted submission latency.
// Baselines reproduce the scheduling and JPEG normalization at commit 60ec2fb.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { normalizeDocumentImage } from '../server/documentImages.js';
import { submitFranchiseApplication } from '../src/api/directUploads.js';
import { REQUIRED_DOC_KEYS } from '../shared/application.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const timed = async task => { const start = performance.now(); const value = await task(); return { ms: +(performance.now() - start).toFixed(1), value }; };
const fixture = JSON.parse(await readFile(new URL('../tests/fixtures/applicant.json', import.meta.url), 'utf8'));
const documents = Object.fromEntries(REQUIRED_DOC_KEYS.map(key => [key, new File(['synthetic'], key + '.jpg', { type: 'image/jpeg' })]));
const count = Object.keys(documents).length;
const uploadDelay = 50, checkDelay = 100;
const before = await timed(async () => {
  let next = 0;
  await Promise.all([0, 1].map(async () => { while (next < count) { next++; await delay(uploadDelay); } }));
  for (let i = 0; i < count; i++) await delay(checkDelay);
});
const requestId = randomUUID(), sessionId = randomUUID();
const after = await timed(() => submitFranchiseApplication({ formData: { ...fixture, documents }, requestId,
  uploader: async (file, _grant, { onProgress }) => { await delay(uploadDelay); onProgress(file.size); },
  fetcher: async url => {
    if (url.includes('/authorize/')) return Response.json({ state: 'upload' });
    if (url.includes('/check/')) { await delay(checkDelay); return Response.json({ state: 'ready' }); }
    if (url.endsWith('/finalize')) return Response.json({ version: 1, id: requestId, status: 'submitted', submittedAt: new Date().toISOString() });
    return Response.json({ sessionId, token: 's'.repeat(43), expiresAt: new Date(Date.now() + 7200000).toISOString() });
  },
}));

const width = 2400, height = 1800, pixels = Buffer.alloc(width * height * 3);
let seed = 123456;
for (let i = 0; i < pixels.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; pixels[i] = ((i / 3 / width) + (seed >>> 27)) % 256; }
const bytes = await sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
const original = new File([bytes], 'synthetic-camera.jpg', { type: 'image/jpeg' });
const oldImage = await timed(async () => {
  const image = sharp(bytes, { limitInputPixels: 24000000, failOn: 'warning' }); await image.metadata();
  let output = await image.rotate().png().toBuffer();
  if (output.length > 10 * 1024 * 1024) output = await sharp(bytes, { limitInputPixels: 24000000, failOn: 'warning' }).rotate().jpeg({ quality: 95 }).toBuffer();
  return output;
});
const newImage = await timed(() => normalizeDocumentImage(original));
console.log(JSON.stringify({ kind: 'local synthetic benchmark; excludes hosted network, database, cold starts and scanner latency',
  scheduling: { documents: count, uploadDelayMs: uploadDelay, checkDelayMs: checkDelay, beforeMs: before.ms, afterMs: after.ms },
  image: { width, height, inputBytes: bytes.length, beforeMs: oldImage.ms, afterMs: newImage.ms, beforeBytes: oldImage.value.length, afterBytes: newImage.value.size },
}, null, 2));
