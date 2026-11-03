# Public deployment — scanning deferred

Updated 2026-11-02 at the owner's explicit request to proceed without ClamAV.

Public address: https://siomaistreet-demo.vercel.app

## Current behavior
- DOCUMENT_SCAN=off explicitly permits unscanned documents in any server environment, including Production. No setting or any value other than off keeps scanning required.
- File validation, private buckets, server-verified Turnstile, upload signatures, rate limits and staff authorization remain enabled.
- Stored scan metadata remains skipped, never clean. Authorized staff document responses include scan metadata and a warning for unscanned files. The admin app should display that warning.
- Staff document access still requires a valid Supabase Auth token and enabled franchise_document_reviewers membership. Links expire in 60 seconds and access is logged.
- No new SQL migration is required for this change; existing direct-upload and security migrations are still required.
- Public marketing pages no longer receive the global noindex header. Application routes and API responses retain noindex. Sitemap and social-sharing URLs now use the public Vercel address.

## Activation and remaining verification
- Production credentials and DOCUMENT_SCAN=off are configured in Vercel.
- Add siomaistreet-demo.vercel.app to the existing Cloudflare Turnstile widget's allowed hostnames. The backend hostname allowlist is already configured.
- Perform a synthetic application in the public browser and confirm receipt, exactly one database application, correction/retry and authorized staff access. Automated tests do not replace this live test.
- The homepage map now uses Leaflet with OpenStreetMap tiles; no Google Maps key or billing is needed. Publish approved branch coordinates and follow [the activation checklist](store-finder-activation-checklist.md).
- Resend delivery and a durable worker schedule remain separate setup. Email and cleanup timers are disabled in the Vercel environment; run cleanup with the existing continuously running Node backend or configure an authenticated external schedule.
- Submit the public sitemap to Google Search Console after ownership verification. Search indexing is not guaranteed by deployment.
- Deployment uses the working copy via CLI. Commit reviewed changes to GitHub before relying on Git-triggered deployments, otherwise an older commit can replace these fixes.

## Validation
Build passed; 107 tests passed; lint has three existing unused-variable warnings and no errors. Tests cover explicit Production scan-off, required scanning by default, a skipped-scan receipt with duplicate-safe retry, staff authorization and rejection of malformed or rejected scan records.

## Enabling ClamAV later
Configure a reachable secure scanner integration, remove DOCUMENT_SCAN=off, redeploy, and test with synthetic files. Existing skipped documents will become unavailable through the staff endpoint when scanning is required; rescan or replace them before expecting access. Do not relabel skipped documents as clean.

This supersedes the earlier preview-only scanner limitation in vercel-school-preview.md.
