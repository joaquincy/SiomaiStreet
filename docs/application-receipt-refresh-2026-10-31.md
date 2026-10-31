# Application receipt refresh — 31 October 2026

The existing post-submission view is a full-page receipt, not a dialog. The redesign retains that flow and displays only after the submission API returns a valid server receipt.

- Split desktop layout, stacked mobile layout, warm paper and burgundy/crimson colors, existing application typography, restrained entrance motion.
- Clear received-versus-approved distinction, received date in Philippine time, next steps, support configuration and document-correction guidance.
- Private access code hidden until explicitly revealed; copy reference/code with success and failure feedback. Credentials are not added to tracking URLs or browser drafts.
- Explicit private text-receipt download with error recovery; temporary object URLs/timers cleaned up.
- Keyboard focus moves to the receipt heading. Controls retain visible focus and 44px-or-larger targets. Reduced-motion preferences are respected.
- Draft-cleanup failures stay visible with retry. Starting another application remains blocked until cleanup succeeds.
- Existing submission validation, server-receipt checks, idempotency, document handling and retry API contract are unchanged.

## Verification boundaries

Synthetic browser preview only; no real application was submitted for this design check. Before browser access became disabled during an interruption:

- Desktop screenshot inspected; initial focus reached the receipt heading.
- Keyboard Show/Hide and reference copying worked; copy confirmation appeared.
- DOM measurements showed no horizontal overflow at 320px with the synthetic code revealed; the larger mobile viewport also had no overflow. Measured receipt buttons were at least 44px high.
- A visually hidden-label issue discovered in the preview was corrected.

Download completion, clipboard-denial recovery, cleanup retry clicks, tracking navigation, real-phone behavior and assistive-technology testing remain unverified in the browser. Optional missing-code and malformed-expiry states, cleanup restart blocking, receipt text and date handling have automated coverage in `tests/application-receipt.test.js`. Existing all-step rendering and receipt-contract tests also cover the connected application.

The temporary standalone preview files were removed. Support contacts and review timelines continue to depend on verified owner configuration; this design does not establish production readiness.
