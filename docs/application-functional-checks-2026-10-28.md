# Application functional checks — 28 October 2026

Scope: fix behavior while preserving the accepted visual design. No CSS, layout,
font, color or branding changes were made in this pass. Existing notice/receipt
styles are reused for the required retention and cleanup feedback.

## Implemented

- Client error summaries derive from current answers, rather than a stale copy.
  Server validation messages are discarded when their submitted answers change.
  Unresolved client errors remain visible.
- Custom selects expose the active option and controlled list to assistive
  technology, focus the search field, scroll the active option into view, support
  keyboard selection and restore trigger focus after selection/Escape.
- The calendar focuses its active date, labels dates in full, supports arrows,
  Home/End and Page Up/Down (Shift changes years), and restores trigger focus on
  selection/Escape. Tab can leave this nonmodal picker. Native date input remains.
- Local drafts expire seven days after their last successful answer save.
  Expiry is checked on reopening the application; a closed browser cannot run a
  cleanup timer. Expired/malformed metadata and orphan files are purged on access.
  Drafts without a trustworthy timestamp are not restored. Valid legacy document
  records are migrated to request-bound records on the next save.
- Cleanup attempts both localStorage and IndexedDB even if one fails. Failure
  keeps the confirmed submission receipt visible, explains that local data may
  remain, and offers a cleanup-only retry. It never resubmits the application.
  Starting another application is disabled while cleanup is pending or failed.
- Blocked metadata access does not silently delete potentially valid files.

The seven-day duration is a local-device default, not an approved server retention
schedule. Clearing browser data is the fallback when storage is unavailable.
Multi-tab editing/conflict resolution remains outside this change.

## Verification

- Production build: passes using Vite `write: false` (no generated build files).
- Lint: one pre-existing unused `hasNew` warning in `useScrollReveal.js`.
- Automated tests: all nine steps render empty/error and complete synthetic
  states; shared validation, receipts and HTTP retry/concurrency tests; expiry
  boundaries, request-bound files, partial cleanup failures and recovery;
  calendar leap-day, month/year and week-boundary navigation.
- Storage fault tests simulate browser storage events; they do not prove actual
  browser IndexedDB behavior. Server-rendered step tests do not exercise focus,
  keyboard events, viewport layout or screen-reader announcements.
- No real applicant documents, production submissions or live Supabase checks.

## Browser verification — pending at the user's request

Browser access was disabled in Work settings. The user chose to continue code
checks and perform browser testing later. Do not mark the following complete:

- [ ] All nine steps: valid/invalid synthetic answers and error-link focus.
- [ ] Correct the final missing answer: summary disappears; other errors persist
      when only one answer is corrected.
- [ ] Dropdown keyboard search/navigation/selection/Escape/Tab and screen-reader
      announcement of the active option, including no matching results.
- [ ] Calendar focus entry/return, arrow/month/year navigation and native input.
- [ ] No employment history, repeated positions, co-applicant and no-location paths.
- [ ] Document rejection, replacement/removal, reload persistence and expiry.
- [ ] Review/edit return path, failed submission, safe retry and confirmed receipt.
- [ ] Deny browser storage: clear warnings, receipt retained, cleanup retry only.
- [ ] Desktop and mobile viewport layout, zoom, virtual keyboard, sticky controls.

Use synthetic fixtures under `tests/fixtures/` and the local synthetic server.
Keep live database integration and owner-policy approval as separate release gates.
