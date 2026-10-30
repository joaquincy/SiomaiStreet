# Franchise browser verification — 30 October 2026

Later update: the Step 6 overflow is fixed and measured in the browser. See
[browser-qa-followup-2026-10-30.md](browser-qa-followup-2026-10-30.md) for keyboard
and injected storage-failure checks, plus the remaining verification limits.

The browser permission blocker is resolved. This report supplements the 29 October
security report. No application code, appearance, business rules or live services
were changed in this verification run.

## Verified using synthetic data

Current Vite production assets were rebuilt into `.phase1-local-test/dist`.
Brave accessed the loopback-only harness on `127.0.0.1:4187`. Storage, malware
scanning and Supabase are simulated by this harness; these results do not establish
live infrastructure readiness.

| Check | Observed result |
| --- | --- |
| Actual file chooser | Replacing the front ID with TXT, an empty PDF or a file over 10 MiB displays an inline error and retains the previous file |
| Accepted replacement | Synthetic PDF replacement appears by name, clears the error and survives page reload |
| Review/edit/return | Edit Franchise Plan, change city, Return to Review & Submit displays the changed city; that value reaches the saved record |
| Invalid receipt | Server persists the synthetic record but returns an empty response object; UI shows failure and keeps the draft plus all five files |
| Receipt retry | Retry returns the original reference; exactly one corresponding local record exists; localStorage draft is absent and IndexedDB document count is zero |
| Network failure | Stopping the local server produces a useful failure with Retry safely; restarting and selecting Retry safely succeeds with one record |
| Mobile/tablet navigation | All nine steps opened at 320, 390 and 768 CSS pixels; normal Continue navigation works |
| Horizontal overflow | None detected at 390 or 768px. At 320px, Step 6 has a 330px document width; other steps fit 320px |
| Regression suite | 29/29 tests pass with loopback networking allowed; sandboxed TCP tests initially failed due to connectivity |
| Build | Current Vite production build passes |

Receipt recovery reference: `cdbf47de-b67d-4dd4-b956-310d2c4de103`.
Network recovery reference: `e7bd48c6-83bd-4e7c-96ef-2c37f4959084`.
Both are local synthetic records, not real franchise submissions.

## Finding to resolve

At 320px the Step 6 conditional badge `Optional until you identify a location`
extends to approximately x=329.4px. Allow this badge to wrap within its label row,
then retest Step 6 and verify the document width remains 320px. Preserve wording
and the accepted design. This run records the defect without changing styling.

Rapid scripted clicks on the horizontally scrolling step navigator sometimes did
not change the step during scrolling; normal Continue navigation succeeded. Further
manual touch/keyboard checks should determine whether this is an automation timing
issue or a user-facing navigation problem. Do not classify the navigator as fully
verified on that evidence alone.

## Evidence and limits

Screenshots are in `browser-evidence-2026-10-30/`, including receipt, network retry,
320px personal/document/review/plan screens and 390px personal information.
`layout-results.json` records completed measurements (320px Step 4 was separately
observed at 320px document width).

Viewport resizing is not physical-device testing. Still needed: Android/iOS virtual
keyboard and touch behavior, screen-reader speech, browser zoom, complete keyboard
traversal and browser storage-denial/cleanup-retry scenarios. The accepted synthetic
PDF is a file-selection fixture, not proof of a valid real-world identity document
or malware detection. No real applicant files were used.

## Live services: classmate handoff

User selected **classmate provides test services**. No database migration was applied
and no real scanner was started. This workstation has no configured Supabase URL,
service key, rate secret, database URL or scanner host, and no detected Docker,
Supabase CLI, psql or ClamD command. Do not paste secrets into chat or commit them.

1. Identify a non-production Supabase project with synthetic data only and provide
   access through server environment configuration. Confirm the admin-app access
   model before applying restrictive policies: ordinary authenticated clients will
   be denied direct application/document reads by the new migration.
2. Apply outstanding repository migrations in timestamp order, checking migration
   history first. In particular, apply the idempotency migration before
   `supabase/migrations/20261029000000_application_security.sql`.
3. Execute `supabase/tests/application_security.sql` with an administrator SQL
   connection and error-on-failure behavior. The test transaction rolls back its
   probe rows and intentionally permissive test policy. Keep the execution result.
4. Configure server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `APPLICATION_RATE_SECRET`, `CLAMD_HOST` and `CLAMD_PORT`. Configure only real
   trusted proxy addresses. Never expose service credentials in `VITE_*` variables.
5. Provide a private ClamD endpoint with updated signatures and limits appropriate
   to 10 MiB documents. Follow the scanner settings and restrictions in
   `application-security-and-browser-results-2026-10-29.md`.
6. Test the actual scanner with clean documents, the standard antivirus test
   fixture, encrypted/limit-exceeding content and scanner downtime. Clean files
   should reach private final storage; rejected or unscannable files must not create
   accepted applications. Verify quarantine cleanup and operator error reporting.
7. Using an existing synthetic stored object, verify anonymous and ordinary
   authenticated users cannot list, download, upload or sign private files or read
   application rows. Test both storage buckets. A 404 for a nonexistent file is
   insufficient evidence. Verify authorized reviewer access through the admin
   server and denial for unrelated accounts; never expose quarantine links.
8. Repeat valid submission, invalid document, lost-receipt retry and concurrent
   retry tests against those real test services. Confirm one application, private
   clean files, scan metadata, stable receipt and cleared browser draft.

Production intake remains blocked until the migration, real scanner and access
checks pass. Local browser success does not remove these deployment prerequisites.
