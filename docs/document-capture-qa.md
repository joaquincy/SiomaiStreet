# Document capture and on-device processing

## Behavior

- Take photo loads the guided camera only on demand over HTTPS or localhost. The camera requests video only and prefers the rear camera for documents, front camera for portraits. Native camera, gallery and file selection remain available.
- The frame is guidance, not edge detection or automatic cropping. Full captures go to the existing preview/editor and require confirmation. Cancelling never replaces the previously confirmed document.
- Camera tracks stop after capture, cancellation, switching, unmount, a permission deadline or hiding the tab. Streams arriving after a cancelled permission prompt are stopped. Video dimensions follow orientation changes.
- Quality analysis samples the final compressed JPEG at a maximum 640px edge. White-paper text and portraits use conservative rules. Warnings are advisory and include inspect/retake actions, not a readable/authentic/verified verdict.
- OCR loads only after Read from ID, reads text locally and offers editable suggestions. It requires explicit confirmation before changing answers. It has a bounded job deadline and cancellation; replacement discards stale results. Manual entry always remains available.
- Photo preview processing uses bounded canvases. OCR still downloads an engine and language model and consumes CPU/memory while running. Lazy loading defers this cost; it does not eliminate it or establish privacy-law compliance.

## Deployment

`public/ocr/` should remain ignored. The installed, lockfile-resolved dependencies are the source of these generated files. `npm run build` invokes `prebuild`, which copies the worker, LSTM engines and English model into `public/ocr`; Vite then includes them in `dist/ocr`. A missing source asset now fails the build rather than silently deploying broken OCR.

Use `npm ci` and `npm run build` in a clean checkout or CI. No migration, external OCR key or new camera service is needed. Commit the source changes and deploy through the existing Vercel workflow. The local changes are not automatically live.

After deployment, check that `/ocr/worker.min.js`, `/ocr/tesseract-core-lstm.wasm.js`, `/ocr/tesseract-core-simd-lstm.wasm.js` and `/ocr/lang/eng.traineddata.gz` return the expected JS/gzip contents, not the SPA HTML fallback. Test Read from ID on a synthetic image.

## Device/browser acceptance checks still required

Run `npm run dev:web` and open `/tests/browser/document-capture.html` on its local development origin. This dev-only harness has synthetic clear/dark samples, a portrait picker and current answers to check overwrite behavior. It makes no submission API calls or persistent drafts. Phone cameras require HTTPS when accessing a development server over a LAN; an HTTP LAN IP is not a secure camera origin. Use a protected HTTPS preview for phone testing instead of weakening browser security.

- Android Chrome and iPhone Safari: allow/deny permission, rear/front switch, portrait/landscape rotation, hide/resume tab, capture/retake/cancel.
- Wait beyond the permission timeout, then allow the old prompt: no old preview or live camera should remain. Retry should work.
- Capture from an existing preview; cancel or confirm a replacement. Check nested dialogs, scroll restoration and original file preservation.
- Test 320px viewport, increased text size/zoom, keyboard-only navigation, Escape, screen-reader labels/statuses and visible focus.
- Inspect clear, dark, reflective, blurry, white-paper and portrait samples after compression. Confirm that hints never prevent a valid file from being selected.
- OCR: empty/unreadable image, slow/failed model download, cancel during initialization and recognition, leave/re-enter step, replace the ID mid-job, retry. Existing answers must never change until confirmation; stale results must not apply to the new image.
- Verify no request contains image bytes during local quality analysis or OCR. Actual application submission intentionally uploads confirmed documents for reviewer access.

## Verification limits

On this change: the full suite passed 253 tests before the final OCR tests were added; the final targeted camera/image/OCR run passed 30 tests, including recognition with the actual installed Tesseract engine and local model. The final production build and scoped Oxlint passed. The browser harness has not been exercised here.

Automated tests cover camera-session cancellation/timeouts and bounds, nested scroll locks, encoded-image quality/portrait handling, and OCR result parsing/lifecycle. Build output confirms separate on-demand camera/OCR chunks. These do not substitute for physical-device camera permission, video orientation, low-end phone performance or browser/screen-reader checks.

The available browser tool reports disabled access. Design-kit browser gates report missing Playwright/skip rather than a pass; the Python launcher for token checks is unavailable. No rendered UI or real-phone pass is claimed.
