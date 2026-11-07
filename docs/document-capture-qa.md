# Document capture and on-device processing

## Behavior

- Take photo loads the guided camera only on demand over HTTPS or localhost. The camera requests video only and prefers the rear camera for documents, front camera for portraits. Native camera, gallery and file selection remain available.
- The guide frame helps position the document. Small camera samples check lighting, fine detail and possible ID outlines about once per second, with slower sampling when processing takes longer. Two matching readings raise a warning. The first clear reading removes it. Full captures go to the preview/editor for confirmation.
- Camera tracks stop after capture, cancellation, switching, unmount, a permission deadline or hiding the tab. Streams arriving after a cancelled permission prompt are stopped. Video dimensions follow orientation changes.
- Quality analysis samples the final compressed JPEG at a maximum 640px edge. ID fronts/backs also receive conservative outline, distance, cutoff and fine-lettering hints. The structure analysis uses a grid with a maximum 160px edge. Portraits and supporting documents receive their appropriate lighting/quality checks.
- Readable scans with faint borders, tinted paper and internal portraits are handled conservatively. A located ID uses its own brightness for lighting guidance. Moderate-resolution IDs also need weak detail to trigger a resolution suggestion. Very small images still receive guidance.
- Feedback appears above the image, including warnings, a completed-check state, edits awaiting recheck and a manual-inspection fallback if analysis is unavailable. A failed small-image decode retries through the already-loaded preview image. Applicants can inspect at 200% or retake before confirming. Quality guidance remains advisory because backgrounds, printing and lighting can affect these estimates.
- OCR loads only after Read from ID, reads text locally and offers editable suggestions. It requires explicit confirmation before changing answers. It has a bounded job deadline and cancellation; replacement discards stale results. Manual entry always remains available.
- Photo preview processing uses bounded canvases. OCR still downloads an engine and language model and consumes CPU/memory while running. Lazy loading defers this cost; it does not eliminate it or establish privacy-law compliance.

## Deployment

`public/ocr/` should remain ignored. The installed, lockfile-resolved dependencies are the source of these generated files. `npm run build` invokes `prebuild`, which copies the worker, LSTM engines and English model into `public/ocr`; Vite then includes them in `dist/ocr`. A missing source asset now fails the build rather than silently deploying broken OCR.

Use `npm ci` and `npm run build` in a clean checkout or CI. No migration, external OCR key or new camera service is needed. Commit the source changes and deploy through the existing Vercel workflow. The local changes are not automatically live.

After deployment, check that `/ocr/worker.min.js`, `/ocr/tesseract-core-lstm.wasm.js`, `/ocr/tesseract-core-simd-lstm.wasm.js` and `/ocr/lang/eng.traineddata.gz` return the expected JS/gzip contents, not the SPA HTML fallback. Test Read from ID on a synthetic image.

## Device/browser acceptance checks still required

Run `npm run dev:web` and open `/tests/browser/document-capture.html` on its local development origin. This dev-only harness has synthetic clear/dark/no-ID samples, a portrait picker and current answers to check overwrite behavior. Enable simulated camera to exercise hints with generated frames. It makes no submission API calls or persistent drafts. Phone cameras require HTTPS when accessing a development server over a LAN; an HTTP LAN IP is not a secure camera origin. Use a protected HTTPS preview for phone testing.

- Android Chrome and iPhone Safari: allow/deny permission, rear/front switch, portrait/landscape rotation, hide/resume tab, capture/retake/cancel.
- Wait beyond the permission timeout, then allow the old prompt: no old preview or live camera should remain. Retry should work.
- Capture from an existing preview; cancel or confirm a replacement. Check nested dialogs, scroll restoration and original file preservation.
- Test 320px viewport, increased text size/zoom, keyboard-only navigation, Escape, screen-reader labels/statuses and visible focus.
- Inspect clear, dark, reflective, blurry, white-paper and portrait samples after compression. Include a readable tinted ID on a similarly colored surface, a well-lit ID on a dark tabletop and a sharp 960 by 640 image. Confirm that hints never prevent a valid file from being selected. Adjust a live scene from dark to clear and check that the old warning disappears.
- OCR: empty/unreadable image, slow/failed model download, cancel during initialization and recognition, leave/re-enter step, replace the ID mid-job, retry. Existing answers must never change until confirmation; stale results must not apply to the new image.
- Verify no request contains image bytes during local quality analysis or OCR. Actual application submission intentionally uploads confirmed documents for reviewer access.

## Verification limits

On November 7, the full suite passed 277 tests and the production build and scoped Oxlint passed. Synthetic regressions cover rotated, distant and cut-off cards, noisy dim scenes, readable scans, live-hint cancellation and prompt warning clearing. Added regressions reproduce three false-warning cases involving faint borders, dark backgrounds and moderate resolution. Compressed synthetic IDs with rendered lettering are checked at both 256px live and 640px preview sample sizes.

Automated tests cover camera-session cancellation/timeouts and bounds, nested scroll locks, encoded-image quality/portrait handling, and OCR result parsing/lifecycle. Build output confirms separate on-demand camera/OCR chunks. These do not substitute for physical-device camera permission, video orientation, low-end phone performance or browser/screen-reader checks.

The latest browser attempt reported that local browser use is disabled in Work settings. The design-kit render gates report missing Playwright, and its Python launcher is unavailable. Rendered warning states, physical Android/iPhone capture, screen-reader output and low-end phone performance still need verification. These local changes require deployment before they can be checked on the public website.
