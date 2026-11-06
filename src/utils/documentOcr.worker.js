import { createWorker } from 'tesseract.js';

// This dedicated host owns the SDK's native worker. Terminating the host also
// terminates its child workers, including one still loading the language model.
// Absolute same-origin paths work from both Vite's dev worker and built chunks.
self.onmessage = async ({ data }) => {
  self.onmessage = null;
  let worker;
  try {
    const root = self.location.origin;
    worker = await createWorker('eng', 1, {
      workerPath: root + '/ocr/worker.min.js',
      corePath: root + '/ocr',
      langPath: root + '/ocr/lang',
      workerBlobURL: false,
      cacheMethod: 'none',
      errorHandler: () => {},
    });
    const { data: result } = await worker.recognize(data.image, {}, { text: true });
    self.postMessage({ ok: true, result: { text: result.text, confidence: result.confidence } });
  } catch {
    self.postMessage({ ok: false });
  } finally {
    await worker?.terminate();
  }
};
