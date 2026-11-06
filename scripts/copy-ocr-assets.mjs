/**
 * Copies the on-device OCR engine into public/ocr so it is served from our own
 * domain. Nothing is fetched from a third-party CDN at runtime, and no document
 * image ever leaves the applicant's browser.
 *
 * Only the LSTM cores are copied (we always run LSTM-only), plus the compact
 * "best_int" English model (~2.9 MB gzipped instead of ~10.9 MB).
 * Runs automatically before `dev` and `build`.
 */
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'ocr');
const assets = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
];

try {
  for (const [from, to] of assets) {
    const source = join(root, from);
    const target = join(out, to);
    const [a, b] = await Promise.all([stat(source), stat(target).catch(() => null)]);
    if (b && b.size === a.size && b.mtimeMs >= a.mtimeMs) continue;
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
} catch (error) {
  // OCR is optional: never break the build. The UI falls back to manual entry
  // when the engine cannot load.
  console.warn(`[ocr] Skipped copying OCR assets: ${error.message}`);
}

