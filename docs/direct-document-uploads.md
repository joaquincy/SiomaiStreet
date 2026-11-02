# Direct document uploads — implementation and activation

Implemented November 2, 2026. Use the existing shared Supabase project; no new database is required. This guide covers initial franchise submissions and requested replacement documents. The current form, camera, preview, crop/rotate and file-selection design is preserved.

## What now happens

1. The browser hashes selected files one at a time. It submits answers and a small file manifest, never file bytes, to the website API.
2. The API checks the public form's Turnstile token and shared rate limit before reading the request or creating upload permissions. Replacements instead require the applicant's private portal credentials and an open reviewer request.
3. A database-backed, two-hour upload session authorizes only the selected document slots and server-generated paths in **private `franchise-quarantine`**. No browser receives a service-role key, public download URL or bucket-wide permission.
4. The browser uses Supabase's signed TUS uploads, with 6 MiB chunks and at most two simultaneous files. Interrupted transfers retry with bounded delays. Completed files are discovered on subsequent attempts and reused.
5. The API downloads and checks **one document per request**: byte cap, expected size, SHA-256, type signature, image decoding and ClamAV verdict. Images are re-encoded to strip metadata, including location, and their processed output is checked again. PDFs retain their submitted bytes.
6. Checked files are copied to private `franchise-documents`. The final small JSON request calls a PostgreSQL transaction that confirms all documents and writes the application once. No frontend-supplied object path or scan result is trusted.
7. Only a matching receipt permits the UI to show success and clear the draft. A replacement receipt changes only the requested document in the original application. Existing notification triggers remain responsible for queued email.

An uploaded/clean file has **not** been approved by a human reviewer. No percentage is invented during scanning.

## Limits and recovery

| Control | Implemented behavior |
| --- | --- |
| File limits | Existing 10 MiB/file maximum, ten recognized slots, five currently required documents; ID photo allows JPG/PNG only. No business requirements changed. |
| API bodies | Initial JSON capped at 350,000 bytes; follow-up control requests at 1,024 bytes. File bytes travel to Storage instead of through the application request. |
| Browser memory | Sequential hashing, weakly held hash cache, bounded in-memory resume cache, lazy-loaded TUS library. No Base64 copies of documents in the submission payload. |
| Server memory | Bounded streamed downloads, one scanner request per process, existing 24-megapixel image-decoding cap; database leases prevent competing checks of the same file. |
| Timeouts | 10-minute transfer deadline; bounded HTTP/scanner timeouts; two-hour session; five-minute check leases; eight check attempts/file/session. |
| Cancellation | Navigating away aborts browser transfers/requests and removes listeners/timers. Server work already underway may finish; retry reconciles it. |
| Safe retries | Stable request IDs, payload hashes, immutable paths and atomic database finalization prevent duplicate application records. Changed submitted answers are rejected. |
| Expired session | Submit the retained draft again to obtain a new session; expired partial sessions are cleaned later. Partial-transfer offsets are memory-only and do not survive page reloads; completed objects are reusable while the session remains valid. |
| Quarantine cleanup | Sessions become eligible after 50 hours, allowing signed tokens and in-flight TUS resources to expire. The cleanup worker deletes quarantine files and unreferenced staging copies, then removes session data. Failed deletion leaves the row for retry. |
| Submitted evidence | Cleanup preserves submitted documents, including files referenced by correction history. This is **not** a business retention policy for accepted applications; the owner still needs to approve that policy. |
| Production scanning | `DOCUMENT_SCAN=off` is ignored in production. Reviewer links require a recorded clean ClamAV result. |

The cleanup schedule must actually run. Pending data does not disappear merely because its session expired. Monitor cleanup age, Storage consumption and rejected/failed scans; set provider usage alerts and suitable quotas. Distributed rate limits and Turnstile reduce abuse but do not make storage unlimited.

## Activate it in your shared Supabase project

1. Coordinate the schema change with the classmate using the same project. Back up the database and apply earlier migrations in order if they are missing.
2. Apply `supabase/migrations/20261102000000_direct_application_uploads.sql` using the project SQL Editor or the established migration deployment process. This adds upload sessions/items, four server-only RPCs, reviewer permissions and an access log. The application intentionally fails closed when its migration is missing.
3. Confirm both existing document buckets remain private, with the 10 MiB limit and PDF/JPG/PNG MIME allowlist. Keep the restrictive Storage policy. Do not add public read/write policies to make uploads work.
4. Configure the server environment below. Do not put any of these private values in `VITE_` variables or commit them. The code falls back to a domain-separated `APPLICATION_PORTAL_SECRET` for upload-session signing when `APPLICATION_UPLOAD_SECRET` is absent.

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY
APPLICATION_RATE_SECRET=RANDOM_SECRET_AT_LEAST_32_CHARACTERS
APPLICATION_PORTAL_SECRET=RANDOM_SECRET_AT_LEAST_32_CHARACTERS
APPLICATION_UPLOAD_SECRET=OPTIONAL_SEPARATE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
TURNSTILE_SECRET_KEY=SERVER_ONLY
TURNSTILE_SITE_KEY=YOUR_PUBLIC_SITE_KEY
TURNSTILE_HOSTNAMES=your-approved-hostname
CLAMD_HOST=your-private-scanner-host
CLAMD_PORT=3310
NODE_ENV=production
```

Use an actual reachable private ClamAV service with updated signatures. Do not expose unauthenticated ClamD to the public internet. Supabase Storage itself does not supply this scanner.

5. Run cleanup through **one** of these supported arrangements:
   - Current persistent Node backend: set `UPLOAD_CLEANUP_WORKER_ENABLED=true`. It runs at startup and hourly, with no overlapping runs in a process.
   - External scheduled worker: set a random `UPLOAD_CLEANUP_SECRET` of at least 32 characters and POST to `/api/maintenance/application-uploads` using `Authorization: Bearer <secret>`. A run processes at most 20 sessions. Repeat until the backlog is clear and monitor failures. Protect the scheduler's secret.
6. Allow the frontend to connect to the project's direct Storage hostname in your CSP `connect-src`. Keep the API on the site's origin where possible. Signed TUS traffic needs POST/PATCH/HEAD/OPTIONS and the Storage service's CORS handling; verify this with the real project, especially if using a proxy/custom domain. Do not route Storage file bytes through a Vercel Function or your frontend proxy in production.
7. Restart/redeploy frontend and API together. Old multipart application and correction endpoints now return an upgrade/reload message, rather than silently accepting a large body.

## Let the owner view documents in the classmate's app

The same `franchise_applications.application_data` and `document_paths` records remain the integration contract. A new API endpoint provides private viewing:

```text
POST /api/staff/applications/{applicationId}/documents/{documentKey}
Authorization: Bearer <staff member's Supabase Auth access token>

200 { "url": "short-lived signed URL", "expiresIn": 60, "name": "...", "contentType": "..." }
```

The server validates the token with Supabase Auth, checks the staff member's **enabled** row in `franchise_document_reviewers`, checks the saved document's clean scan, records the access grant and signs a 60-second URL. Provision approved staff UUIDs from `auth.users` into that table through an authorized server/SQL administrator. There are no automatic default reviewers. Disabling the row stops new links; an already issued link can remain usable until its short expiry.

If the admin app runs on a different website origin, set `STAFF_ALLOWED_ORIGINS` to its exact approved HTTPS origin(s), comma-separated. This CORS allowlist does not replace authentication. The app should request a fresh URL when a reviewer opens a document and avoid storing/logging signed URLs or email attachments. The URL is a bearer credential during its lifetime. Access logs record link issuance, not proof that the recipient actually opened a file.

If your classmate uses a separate custom login rather than Supabase Auth, agree on a verified server-to-server identity adapter first. Do not send a service-role key to the app/browser. Connecting this endpoint in the separate admin app is still an integration step.

## Verification and release gate

Validation on November 2, 2026: **101 tests passed**, production build passed, and lint completed with the two existing warnings noted below. Run `node --test --test-concurrency=1 tests/*.test.js` with local loopback access, `npm run build`, and `npm run lint` to repeat these checks.

Local tests execute the new migration/RPCs in embedded PostgreSQL with synthetic Supabase-owned schemas, plus a real local TUS HTTP server. They cover large files, checksums, malformed manifests, scanner failure/rejection, leases, incomplete finalization, duplicate/lost-receipt retries, corrections, cleanup, permission checks and cancellation. These checks do not establish hosted Supabase/ClamAV readiness.

- [ ] Apply/test the migration against the actual integration project.
- [ ] Upload an 8 MiB synthetic PDF and a camera image through the real private Storage service.
- [ ] Confirm real ClamAV clean, controlled malware-test rejection and scanner-outage behavior in the test environment.
- [ ] Confirm initial submission, correction and lost-response retry produce one receipt/update each.
- [ ] Test unauthorized direct downloads, unauthenticated staff requests and disabled reviewer access; verify permitted owner access and signed-link expiry.
- [ ] Test slow mobile networks, cancellation, reload, session expiry and local-storage failure in a browser/real phone.
- [ ] Run cleanup, including an induced Storage failure, and confirm submitted evidence remains intact.
- [ ] Verify existing transactional email/outbox delivery for a new receipt and correction status update.

Browser QA remains pending because browser use was disabled in this session. Live services were not configured or modified, and no real applicant data was used. The build succeeds; lint has two pre-existing unused-variable warnings outside the upload work. Dependency audit reports six existing advisories in Vite/router/CSS tooling; none is attributed to tus-js-client or PGlite. Resolve these separately before deployment.

This change removes the large-body obstacle for franchise submissions **and replacements**. It does not itself deploy the Node API, host ClamAV, adapt the email/cleanup workers to serverless hosting, or change Vercel plan eligibility. Review photos still use their existing multipart endpoint and need a separate decision if deploying that route behind the same small body limit.

References: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [signed upload permissions](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [private buckets and access control](https://supabase.com/docs/guides/storage/buckets/fundamentals).
