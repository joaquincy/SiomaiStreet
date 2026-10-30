# Mobile document submission — 30 October 2026

Implemented locally. Browser and physical-phone acceptance testing remain pending;
the browser tool currently reports that local browser use is disabled.

## Delivered

- Each initial-application and correction-request document picker offers Take photo,
  Choose photo and Upload file. Native capture requests the rear camera for evidence
  and user-facing camera for the portrait; gallery/file fallbacks remain available.
- A native modal preview precedes confirmation. Existing selected files are not
  replaced by selection, processing errors, cancellation or unconfirmed edits.
- Photos have 100–300% preview zoom, scrolling, 90-degree rotation, keyboard-editable
  percentage cropping, Apply/Reset edits and a readability confirmation checkbox.
  Cropping is manual, not edge detection or perspective correction.
- PDFs have a sandboxed preview frame and a clear instruction to inspect the original
  in a document app if the browser cannot render the preview. PDF pages are not edited.
- Capture guidance covers lighting, glare, all corners and readability; an inline SVG
  illustration is explicitly synthetic and contains no real identity information.
- Photos are decoded with orientation handling, scaled to at most 3200px on the long
  edge and exported as JPEG. Input limits are 40 MiB / 24 megapixels; output must be
  at most 10 MiB. Quality steps stop at 0.8 rather than compressing indefinitely.
  The applicant must inspect the resulting preview; readability is not machine-proven.
- Unsupported HEIC/HEIF and other formats get conversion instructions. There is no
  bundled HEIC decoder or third-party upload/conversion service.
- Image bitmaps, object URLs and temporary canvas buffers are released on replacement,
  cancel and unmount; obsolete asynchronous results are ignored.
- ID portraits now require JPG/PNG in both initial submission and correction APIs.
  Other existing document slots allow PDF/JPG/PNG. Old PDF portrait drafts must be
  replaced. Synthetic fixtures and the local harness were updated to use real PNGs.
- The current mandatory ID-back rule is unchanged, awaiting owner approval of any
  alternative/conditional policy. No legal or business policy was invented.
- Inline selection errors have a linked Step 7 summary. A valid existing file stays
  available even if an attempted replacement fails validation.

## Truthful states

Cards distinguish selected locally, saved in browser, saving not yet confirmed and
save failed. The status-portal replacement picker explicitly says it is not persisted
as a draft. Only confirmed candidates enter the initial application's draft.

Final application submission uses XHR upload events for actual byte-transfer progress.
Once transfer completes, the UI says it is waiting for server checks and a receipt.
There is no scanner-progress API, so it does not claim the scanner is running at a
particular instant or invent scanning percentages. A successful transfer is not a
successful submission; the existing matching server receipt remains mandatory.

Reviewer acceptance is not inferred from file selection, a clean scan or a receipt.
The correction portal continues to distinguish requested documents and replacements
received for review. Per-document reviewer acceptance is a future admin integration,
not a fabricated status in this release.

## Server protection

Both endpoints independently decode and re-encode images using sharp, removing
unnecessary metadata rather than trusting the client. Pixel count and supported
image format limits apply, multi-frame images are rejected, orientation is applied,
and normalized files pass the existing private quarantine/ClamAV release gate.
PNG output avoids a second lossy pass where it fits; photographic output exceeding
10 MiB falls back to quality-95 JPEG, otherwise fails with a useful error.
PDFs are not silently rasterized or altered; existing type/signature/scan rules apply.

The request hash is based on the original request bytes, preserving retry identity.
Stored metadata describes the normalized file actually scanned and stored.
Image preprocessing failures map back to the affected document in the initial flow.
`sharp` moved from development to production dependencies; deploy with its supported
native binaries. No scanner bypass was introduced. Live scanner/storage validation
remains pending the classmate's test services.

## Verification

- Production build passes and lint has only existing unrelated warnings.
- 41 automated tests pass, covering existing validation/retry/quarantine behavior,
  new crop bounds, portrait formats, actual server EXIF stripping, malformed image
  rejection and transfer-vs-receipt progress. Picker markup is render-tested.
- No live browser, screenshot, camera, canvas interaction or real-device success is
  claimed. Unit tests do not prove browser picker behavior or memory use on phones.

## Required acceptance pass

1. Android Chrome and iPhone Safari: camera, cancellation, gallery and file fallback.
2. Rotate a portrait/landscape image; crop each edge; apply/reset; zoom and scroll.
3. Inspect EXIF-oriented images, transparent PNG, oversized images, malformed images,
   HEIC recovery, empty PDF and image-only portrait rejection.
4. Confirm Cancel keeps the prior document; confirm replacement changes only that
   document and restores correctly after draft save/reload.
5. Keyboard and screen reader: modal entry, focus containment, Escape/cancel return,
   numeric crop controls, error links and readable labels. Test 320px and browser zoom.
6. Slow/failing uploads: actual transfer progress, waiting message, invalid receipt,
   duplicate-safe retry, cleanup failures and correction portal flow.
7. Real scanner, private storage permissions and normalized-file metadata verification.
8. Profile repeated preview/retake/cancel on low-memory phones with large images.

References:
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
