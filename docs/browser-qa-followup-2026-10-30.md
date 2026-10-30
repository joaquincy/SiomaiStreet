# Browser QA follow-up — 30 October 2026

Status: partially complete. Do not sign off the full browser QA milestone yet.

## Implemented

Conditional requirement badges can wrap and shrink within their label row.
This preserves the existing wording and design while fixing Step 6 at 320px.
Browser measurement after rebuilding: viewport 320px, document width 320px,
conditional badge right edge 284.8px (previously about 329.4px).

Added `scripts/browser-storage-faults.js` and an opt-in `?storageTest=1` route
in the loopback-only acceptance harness. These are not imported into the shipped
frontend. They simulate localStorage write/removal and IndexedDB open failures;
faults disappear on reload. This tests application behavior in a real browser,
not the browser's own permission-denial implementation.

## Completed browser observations

- All nine mobile step buttons activated with Enter, with the expected current
  step and heading, in nonsequential order (9, 1, 6, 2, 8, 3, 7, 4, 5).
- Empty First Name plus keyboard Continue produces an alert summary and inline
  error. Activating its summary link focuses `pi-firstName`, with `aria-invalid`
  and descriptions referencing both hint and error.
- Calendar keyboard activation focuses the selected date with its full date label;
  Escape restores focus to the calendar trigger.
- Dropdown ArrowDown focuses the filter; further ArrowDown updates
  `aria-activedescendant` to an existing option (SOCCSKSARGEN in this test).
- Simulated localStorage write failure displays Save failed and warns to keep the
  page open. Restoring storage and editing returns to Saved on this device.
- Simulated IndexedDB failure after actual file selection displays Save failed.
  Restoring storage and navigating retries the pending document save successfully.
- Simulated cleanup failure after submission preserves the confirmed receipt,
  shows the cleanup warning and provides Retry local draft cleanup.
- Restoring storage and retrying cleanup clears both stores: draft absent and
  IndexedDB document count zero. Receipt remains unchanged:
  `23c156c8-5ae3-4bcf-be14-38a93757440a` (local synthetic record only).
- Production build passed. Regression suite passed 29/29 tests with loopback
  networking allowed. Harness JavaScript syntax and diff whitespace checks passed.

## Not completed / remaining release checks

- Browser access became disabled again after the above observations. The updated
  screenshot was not captured; the earlier screenshot attempt timed out.
- Real 200%/400% browser zoom and zoom recovery remain unverified. Viewport resizing
  alone is not evidence of browser zoom behavior.
- Physical Android/iOS keyboard, touch scrolling and focused-field visibility
  require testing on actual devices; no connected phone was available.
- Actual screen-reader speech and full keyboard-only traversal remain unverified.
  ARIA/focus observations above do not prove spoken announcements or visual focus
  contrast. The input reported outline:none; inspect its border/box-shadow focus
  treatment visually before concluding focus is visible or missing.
- Mobile pointer/touch step navigation still needs a deliberate manual pass; Enter
  activation passing does not settle earlier rapid-click/scroll timing behavior.
- Native browser storage permission denial, reload during denial and recovery after
  permissions return remain separate from the injected failure checks.
- The temporary 320px viewport override could not be reset after access was disabled;
  reset it first when browser access resumes.

## Resume procedure

1. Restore browser access and reset its temporary viewport override.
2. Run the local acceptance harness with synthetic applicants only.
3. Verify Step 6 at 320px and capture a new screenshot.
4. Test zoom, all-step keyboard traversal, visible focus and pointer navigation.
5. Have a tester complete the flow on Android Chrome and iPhone Safari with the
   keyboard open; test error links, dropdowns, dates, upload and Continue visibility.
6. Use NVDA or VoiceOver to confirm labels, errors, active dropdown options, step
   transitions, save failures and receipt/cleanup messages are actually announced.
7. Record device/browser versions and pass/fail evidence before final sign-off.
