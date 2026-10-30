# Phase 1: application correctness

Implemented 27 October 2026. Existing approved questions, choices, required status and legal wording are preserved. This milestone repairs behavior; it does not approve the application for production.

## Contract

The browser uses the same-origin `POST /api/franchise-applications` endpoint exclusively. Development uses Vite's existing `/api` proxy; production must route frontend and API through the same origin. `VITE_API_BASE_URL` is no longer used by this application submission flow.

Multipart fields:

- `version`: string `1`.
- `requestId`: browser-generated UUID v4, retained with the draft and reused for retries.
- `applicationData`: JSON answers, including `confirmEmail` and strict boolean consent/checklist values.
- One file per named document key (for example `govIdFront`). Five required and five optional document keys remain unchanged. Nonempty PDF/JPG/PNG, at most 10 MiB each; duplicate/unknown file fields are rejected.

Response: HTTP 201 on creation, HTTP 200 on replay, with `{version: 1, id: requestId, status: "submitted", submittedAt: ISO_timestamp}`. The browser checks the version, matching UUID, status and timestamp before showing success or clearing the draft. A successful HTTP status alone is insufficient.

HTTP 422 includes `{error, validationErrors: [{step, message}]}` with zero-based step indexes. The browser returns to the first affected step and lists the problems. Invalid transport/file signatures return 400; a reused ID with different content returns 409; rate-limited new requests return 429. Unexpected persistence failures do not produce a fabricated receipt.

## Shared requirements and controls

`shared/application.js` is imported by both frontend and backend. It preserves the earlier required-field and minimum-word rules, adds typed/enum validation, rejects negative/malformed amounts, invalid calendar dates, future employment dates, reversed date ranges and current jobs with an end date. Optional answers remain optional. First-time-applicant policy changes remain Phase 2 work; employment title/company requirements were not silently removed.

Co-applicant Yes now renders its four already-required fields and includes them in saving and review. Employment supports add/remove, current-employment toggles, date disabling/clearing and review of positions. The technical maximum is 20 additional positions.

Malformed drafts are projected onto known typed fields before React uses them. Invalid values are discarded and applicable requirements must be answered again. Final submission validates all nine steps, not only the final checklist. The server runs that same validation independently against the actual uploaded files.

## Retry behavior

The request ID becomes the database primary key. A SHA-256 fingerprint covers sorted JSON keys and document metadata/bytes. Existing identical requests return their original receipt; changed content conflicts. Two concurrent workers can upload separately, but the database primary key permits only one application record. The losing worker reads the winner and removes only its own attempt's files.

A database insert timeout may occur after COMMIT. The handler checks for the saved record before interpreting the failure; it never deletes the winning documents merely because an insert response was lost. If commit status cannot be established, it preserves that attempt's objects for later reconciliation and returns an error. This favors data integrity over immediate orphan cleanup. Storage reconciliation, streaming uploads and distributed abuse controls remain later security work.

The frontend uses a synchronous in-flight lock plus disabled fields/navigation. Reload retains the request ID when browser storage works. If storage is unavailable, the user is warned to keep the page open; retry identity cannot be guaranteed after loss of that browser state. There is no content-based deduplication of intentionally new applications using different IDs.

After receipt, Start a New Application clears in-memory answers and creates a new ID. It is disabled until cleanup completes. Browser quota/permission failures can still prevent physical removal of local storage; draft storage lifecycle hardening remains Phase 6.

## Verification

Run from the repository:

```powershell
node --test tests/application.test.js
node node_modules/oxlint/bin/oxlint
node node_modules/vite/bin/vite.js build
```

Five test groups passed: valid solo/co-applicant/employment paths; invalid amount/date/type/consent and incomplete earlier-step rejection; invalid receipt/network failure; malformed saved-draft and retry ID persistence; real HTTP multipart creation, replay, changed-content conflict, invalid/missing documents, concurrent retries, lost COMMIT response and restart. The integration adapter uses atomic local file creation to enforce uniqueness. It does not execute PostgreSQL, Supabase Storage, RLS or the live server's environment configuration.

Browser acceptance used the actual production frontend and server application handler with isolated local persistence. Verified co-applicant editing and advancement; position add/remove/current employment; reload persistence; invalid receipt keeps the review draft after reload; replay returns the saved reference; successful receipt clears the draft. Files and legal booleans were synthetic test inputs. The harness simulates storage uploads and sends no notifications.

Build passes (102 modules). Oxlint exits 0 with one pre-existing unused `hasNew` warning in `useScrollReveal.js`. The local npm launcher remains broken, so direct installed tools were used. CI now runs the contract tests.

## Deployment gate

1. Apply `supabase/migrations/20261027000000_application_idempotency.sql` to an isolated staging database **before** deploying the new server. It adds the request fingerprint column; the existing application primary key provides uniqueness. No migration was applied to any live database during this work.
2. Test with real staging Supabase/PostgreSQL and private storage: same-request concurrency, response loss after commit, changed-content conflict, upload failure and receipt replay after server restart. Verify exactly one row and valid retained document paths.
3. Deploy frontend and server together behind the same-origin route. The older client does not send the required version/request ID; do not mix contracts.
4. Preserve existing request IDs/receipts when handling corrections. Do not solve a conflict by silently generating another ID. A staff correction workflow remains later work.

## Local UI harness

After building, run `node scripts/test-application-server.js` and open `http://127.0.0.1:4187/__test`. Buttons seed only that localhost origin with clearly synthetic data and files. The harness never loads `.env`, sends mail, or contacts Supabase. It writes local test records to ignored `.phase1-local-test/`. Do not expose it publicly or deploy it. Its upload adapter is simulated; it is not a production server.

## Remaining design verification

Inherited design scripts were located in `C:/Users/Joaquin/scripts`. UTF-8 runs report 382 existing hardcoded values in the application directory and 16 punctuation/pictograph findings in existing copy/CSS. These broad design gates are not green; approved wording was preserved. The native-select scan of the application directory passes, but shared FormElements still contains a native select, so this is not a whole-site pass. The browser-based kit gates use standalone Playwright and were not run because this environment requires browser interaction through its provided browser tool. Token/contrast, full accessibility, keyboard and all-device certification remain unverified; the new controls were exercised in the supplied browser.
