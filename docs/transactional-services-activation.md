# Transactional email and Turnstile activation

Implementation scope: franchise application submission and customer/franchise inquiries. Existing authenticated tracking/correction authorization and scanner checks remain intact. Reviews are not newly covered by Turnstile in this change.

## Server environment

Configure locally in .env.local and in your deployment's SERVER environment. Nothing here uses a VITE_ prefix.

```
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=your_public_site_key
TURNSTILE_SECRET_KEY=your_private_secret
TURNSTILE_HOSTNAMES=localhost,your-actual-domain.example
RESEND_API_KEY=your_private_sending_key
EMAIL_FROM=updates@your-verified-domain.example
EMAIL_REPLY_TO=your-monitored-support-address@example.com
RESEND_WEBHOOK_SECRET=whsec_your_signing_secret
EMAIL_WORKER_ENABLED=true
NODE_ENV=production
```

Replace examples; do not deploy them. Use Cloudflare test keys only in development. A deliberately isolated local run may set TURNSTILE_ENABLED=false; production ignores this bypass. The public security-config endpoint returns only the site key and enabled flag. Never put tokens in drafts or logs.

## Deployment order

1. Verify an owned sending domain/subdomain in Resend with the DNS records Resend supplies. Confirm the sender/reply address is monitored. Disable email open/click tracking unless deliberately justified.
2. Classmate: review and apply supabase/migrations/20261101000000_transactional_outbox.sql to the agreed TEST database after the existing contact and franchise migrations. No production migration was applied by this work.
3. Configure Cloudflare Managed Turnstile with the exact permitted hostnames. Allow challenges.cloudflare.com script/frame access in CSP. Use HTTPS in production.
4. Add a Resend webhook at https://YOUR-DOMAIN/api/webhooks/resend for sent, delivered, delivery_delayed, bounced, complained and failed events. Configure its signing secret on the server. No Turnstile on this provider endpoint: signed raw-body authentication is used instead.
5. Start the API with the worker enabled only when the domain, secrets and migration are ready. This worker requires a continuously running Node process; a static host or short-lived serverless handler is insufficient. One send at a time, database leases across instances, idle polling every 15 seconds.
6. Check your account's provider quotas before scaling beyond one worker. Failed sends back off. HTTP 429/5xx retry; permanent rejection requires review. Unknown outcomes stop before 23 hours to stay within Resend's 24-hour idempotency window. Do not manually reset ambiguous jobs without reconciling provider records.
7. Run synthetic end-to-end acceptance checks before exposing the forms publicly.

## Acceptance checks / currently unverified live

- Real PostgreSQL trigger transaction rollback, repeated submission, concurrent worker claim, lease expiry and restart.
- Application and inquiry security success, missing/expired/forged token, wrong hostname/action, blocked script, cancellation, mobile keyboard and focus return.
- Confirm denied upload requests never enter multipart parsing or scanning; keep existing rate limit and private storage migrations.
- Confirm one outbox event per insert and one per actual application status change. Existing rows are NOT automatically emailed.
- Provider accepts, delivers, delays, bounces and complains; signatures/timestamp errors; duplicate events; webhook arriving before send response; worker restart after provider success before database acknowledgement.
- Authorized staff monitor notification_outbox state, delivery_state, attempts and age. Alerts: pending beyond business target, needs_review, worker error, bounce/complaint. There is no new admin dashboard or external alert destination configured.
- Test anonymous/authenticated users cannot read/write the three notification tables or invoke worker RPCs. Only service_role gets access.

## Data and operations

Queue records contain recipient, generic message type and reference, not application answers, documents, status reasons or portal access secrets. Provider raw event bodies are verified then discarded; only event ID, provider ID, type and event timestamp are retained. Bounce/complaint suppression prevents future sends to that address. Do not expose these tables in the browser.

An owner-approved retention schedule is still required: purge old completed outbox/event records and retain only necessary suppression records. Coordinate applicant deletion with notification records; no retention period is invented here. Changes in staff status must be authorized in the existing app.

The on-screen receipt remains authoritative when email is delayed or unavailable. Accepted by Resend is not delivery, and delivery is not staff review or franchise approval.

## Verification evidence

Local build and targeted lint passed. 27 existing application/security/contact integration tests passed with localhost permission, plus 12 provider, webhook, worker, contact rendering and receipt tests. SQL and provider/browser acceptance above require configured test services and remain unverified.

References: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ ; https://resend.com/docs/dashboard/domains/introduction ; https://resend.com/docs/dashboard/emails/idempotency-keys ; https://docs.svix.com/receiving/verifying-payloads/how-manual
