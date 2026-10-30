# Franchise submission security and browser verification — 29 October 2026

Update: browser access was restored on 30 October. See
[`browser-verification-2026-10-30.md`](browser-verification-2026-10-30.md)
for completed file/review/receipt/retry checks, responsive measurements, one narrow-
screen defect and the classmate's live-service handoff. The pending-browser section
below is the historical 29 October status.

Status: implementation and local regression checks complete; browser verification
partly complete; live database/scanner verification blocked by missing setup.
The accepted application design was not changed in this work.

## Implemented security behavior

1. Application admission runs before reading or hashing uploads. Requests above
   101 MiB, wrong content types, excess attempts and overload are rejected early.
   The streaming byte count also covers chunked bodies without Content-Length.
2. Shared PostgreSQL rate windows allow 20 ingress attempts/hour/IP and four new
   application attempts/hour/IP. A matching existing receipt bypasses the new-
   application quota, but not the ingress quota. Limits count failed attempts too.
   IP keys use scoped HMACs; raw addresses are not persisted in the rate table.
   At most 10,000 current rate keys are retained; expired keys are removed on use.
3. One application is processed per API instance at a time to bound the existing
   buffered parser's memory cost. Busy clients receive a retryable response.
   Header/body timeouts, storage/RPC timeouts and scanner deadlines bound work.
   Only explicitly configured proxy IPs can supply a forwarded client address.
4. Each document goes into private `franchise-quarantine` storage. The same bytes
   are streamed to ClamD. Every file must return a clean result before any file is
   uploaded to `franchise-documents` or a new application row is inserted.
5. Missing scanner configuration, unreachable scanner, timeout, incomplete result,
   malformed result or scan-limit errors fail closed. Rejected documents produce
   a Step 7 error. Metadata records the scanner and scan time. A clean result is
   malware screening, not a guarantee that a document is safe or authentic.
6. Quarantine cleanup runs on success and failure. Cleanup failures emit an
   operator event containing only bucket/request/attempt identifiers. Ambiguous
   database commits preserve final files for reconciliation; retry IDs remain
   unchanged. Concurrent losing attempts cannot delete winning files.
7. The migration makes both buckets private and adds restrictive policies denying
   anonymous and ordinary authenticated direct access, even if another permissive
   policy exists. Application rows remain server-only. A runtime preflight checks
   bucket privacy, RLS enablement and the expected restrictive-policy presence.

## Deployment prerequisites — do not skip

- Review and apply `supabase/migrations/20261029000000_application_security.sql`
  after the existing application migrations in a test database first.
- Run `supabase/tests/application_security.sql` as a SQL administrator. It checks
  anon/authenticated denial, service access, rate limiting, and a deliberately
  permissive competing policy inside a rolled-back transaction. This script has
  been authored but NOT executed here: PostgreSQL/Supabase CLI and credentials
  were unavailable. Confirm SQL execution before production deployment.
- Set `APPLICATION_RATE_SECRET` to a high-entropy secret of at least 32 characters,
  identical across replicas. Never place it or the service-role key in Vite vars.
- Run a maintained ClamAV/ClamD service with fresh signatures. Set `CLAMD_HOST` and
  `CLAMD_PORT`; keep the unauthenticated scanner socket on loopback or a restricted
  private network. Do not expose it publicly. Configure StreamMaxLength and
  MaxFileSize for at least 10 MiB, suitable MaxScanSize/MaxRecursion, and
  AlertExceedsMax plus AlertEncrypted so limited/encrypted content cannot be
  silently treated as fully scanned. Verify the installed version's settings.
- Test the REAL scanner with approved clean fixtures and the standard antivirus
  test fixture, including encrypted/scan-limit cases. Protocol tests in this repo
  use a fake TCP daemon and do not prove installed antivirus detection.
- Verify direct public/authenticated downloads, object listing, upload, signed-URL
  generation and application-row reads are denied for unprivileged users. Test
  with a known synthetic stored object; a missing path alone proves nothing.
- The classmate's admin app must use a server endpoint that verifies reviewer
  identity, role and application access BEFORE reading files or issuing short-lived
  signed URLs. This migration intentionally blocks direct `authenticated` access;
  coordinate before applying it to an existing admin integration. Never put the
  service-role key into the admin client. Quarantine must not have reviewer links.
- Existing files predate scanning. Do not label them clean; inventory and scan them
  separately before granting reviewer access. Previously issued signed URLs need
  separate expiry/revocation review.
- Configure the reverse proxy/Cloudflare body limit, timeouts and early rate/WAF
  rules. Confirm the hosting plan accepts the application's worst-case multipart
  body. An application-level limit does not prevent bandwidth/network-level DDoS.
- Route orphan-cleanup events to monitoring. Reconcile ambiguous final objects
  against committed `document_paths` before deleting; purge orphan quarantine
  objects after an agreed grace period longer than the maximum processing time.
  No automatic destructive retention job was installed in this change.
- Load-test peak memory and latency: parsing remains bounded but buffered, and
  scans currently run synchronously. Adjust capacity or adopt streaming/queued
  processing based on measurements. Full browser submission timing is not verified.

New production submissions will fail until these required services and migration
are configured. There is deliberately no production “skip scan” option. The
local-only test harness injects fake services and never loads `.env` or Supabase.

## Actual browser checks completed in Brave

Used `http://127.0.0.1:4187/__test` and the current built application with synthetic
answers, selected synthetic files and local-only persistence.

| Area | Observed result |
| --- | --- |
| Nine steps | All nine screens opened; populated controls and review contents inspected |
| Territory dropdown | Arrow entry focuses search; no-match message appears; filtered Enter selection works |
| Missing personal fields | Two errors reduce to one after correction; final correction removes summary |
| Linked error focus | Last Name summary link focuses `pi-lastName` |
| Calendar | Opens focused on selected full date; ArrowRight moves a day; Escape returns to trigger |
| Co-applicant | Four conditional fields render with synthetic partner answers |
| Employment | Current-employment clears/disables end date; position addition/removal works; no-history advances |
| Financial | Negative capital is blocked; corrected positive capital advances |
| Brand alignment | Three-value cap disables other options; deselecting makes them selectable |
| Franchise plan | Quotation-only text visible; Not sure yet and no-location/no-site-type path advances |
| Documents | Removing required ID blocks Continue; reload retains removal and the other four files |
| Consents | Unchecked privacy consent blocks Continue; restoring it advances |
| Review | Displays no-history/no-location answers and identifies missing document before submission |

## Browser checks still pending

- Actual file selection/replacement and invalid type/size selection. Initial upload
  attempt was blocked by extension file-URL permissions. User enabled them, but
  browser access disconnected; fresh attempts still report “Local browser use is
  disabled in Work settings,” including after a session reset.
- Review/edit/return navigation (attempt interrupted), successful receipt/cleanup,
  failed receipt/network response and duplicate-free retry through the browser.
- Desktop screenshots, 320/390/768px responsive layouts, zoom, sticky elements,
  virtual keyboard, full keyboard traversal and real screen-reader announcements.
- Browser storage denial, expiry and cleanup-retry behavior. Automated simulations
  cover these paths, but actual browser-storage behavior is not yet verified.

No screenshots were captured before disconnection. No visual/mobile sign-off is
claimed. Local automated checks pass 29 tests, including scanner protocol outcomes,
admission ordering, private-storage preflight rejection, quarantine release gates,
cleanup failures, canonical validation and durable receipt retries/concurrency.
Lint has the existing unused `hasNew` warning in `useScrollReveal.js`.

## Continue safely

Build the harness assets with:

```powershell
node --input-type=module -e "import {build} from 'vite'; await build({build:{outDir:'.phase1-local-test/dist'}});"
node scripts/test-application-server.js
```

Use the harness prepare buttons (now timestamped for draft expiry), never real
applicant records. The harness is loopback-only and checks Host/Origin. Its scanner
and upload services are simulated; it is not a deployment server.

Sources informing implementation:
- [ClamD protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html)
- [ClamAV scanning and network restrictions](https://docs.clamav.net/manual/Usage/Scanning.html)
- [Supabase storage access control](https://supabase.com/docs/guides/storage/security/access-control)
