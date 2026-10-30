# Document UI and welcome modal refresh — 30 October 2026

## Delivered

- Replaced the inline Before you start panel with a native modal that opens after draft restoration on the first visit in a browser-tab session. Closing it records only a non-sensitive session flag; blocked storage falls back to in-memory dismissal. A persistent button reopens the guide on every application step.
- Added a warm two-column welcome layout, compact preparation checklist, document list, and expandable saving/privacy/next-step guidance. Existing eligibility, required documents, quotation-only pricing and pending-owner policy wording are retained.
- Refreshed document cards with document-specific icons, prominent camera buttons, separate gallery/file choices, selected-file thumbnails and clear local save status.
- Added an illustrated expandable photography guide with a synthetic sample and lighting, framing and legibility instructions.
- Reworked the preview dialog into a large preview with a desktop editing sidebar, stacked mobile layout, zoom, rotate, expandable crop controls, retake/replace and an explicit readability confirmation.
- Added scroll locking and cleanup around preview dialogs. Existing-file protection, validation, processing, final submission and backend security logic remain in place.

## Verification

- Vite production compilation: passed (121 modules; in-memory build).
- Targeted lint on changed components and render test: passed without warnings.
- Regression suite: 41/41 passed with local loopback enabled. Two synthetic network tests were blocked inside the sandbox and passed on the authorized rerun.
- Server-render checks include the welcome dialog label, close/reopen controls, initially closed markup, all nine form steps and native capture attributes.
- Browser tool reports: `Local browser use is disabled in Work settings`. No new screenshots, rendered-layout approval, focus interaction checks or real-phone camera results are claimed.

## Remaining visual acceptance

- First visit opens the welcome dialog; dismissal, Escape, reopening and refresh respect the session flag. Confirm draft restoration still works with blocked session storage.
- Inspect 320px, 390px, tablet and desktop widths, 200% zoom, and phone keyboard behavior. Confirm modal content and confirmation controls remain reachable.
- Check keyboard focus containment/return and screen-reader announcements in both dialogs.
- Verify native camera, gallery/file selection, cancelled or rejected replacements, PDF preview, rotate/crop/reset, image zoom and draft restoration using synthetic files.
- Review the appearance in the actual browser before accepting the visual design. Real Supabase/scanner integration remains a separate deployment requirement.
