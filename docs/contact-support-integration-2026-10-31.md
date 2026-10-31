# Homepage contact and support — handoff

## What is implemented

The new `#contact` section follows the homepage franchise CTA **and its application marquee**, before the footer. Its cream background (`#f0e9da`) matches the current Featured Menu. The refreshed contact section uses the site's Outfit/Inter fonts, centered editorial heading, cream grain, forest-green actions and restrained red type accents. Selection uses a soft green surface, a consistent border and checkmark, with no accent stripe. The form and support choices sit in an open layout aligned with Featured Menu and FAQ. On mobile, conversation choices and the form come before the secondary help links.

- Separate **Food & store support** and **Franchise inquiries** destinations, with appropriate topics.
- Required name, reply email, topic, message and privacy acknowledgement; optional branch and conditional order reference. No attachments or account required.
- Shared frontend/backend validation, field errors, linked error summary, character count, focus styling, loading/unavailable/failure states and reduced-motion styling.
- Visible native radio topics, topic-specific writing guidance, related shortcuts and expandable help. Direct contacts are in the “Prefer a direct conversation?” modal, with independent customer/franchise selection, email-copy and phone actions when configured. Opening it preserves the form and does not change the active inquiry.
- Separate in-memory messages for each conversation; name/email edits carry between them, while topic, consent and message content remain separate. Unicode character limits match the backend; truncated pastes produce a notice.
- Receipt timestamp, reply address, copy-reference action and a downloadable text receipt. Only the submitted conversation is cleared after a valid receipt; the other unfinished message remains.
- Helpful links to the store finder, menu, franchise FAQs and application tracking.
- Public contact details and service notes are server-configured. No fabricated contact, staffing or response promise is supplied.
- A reference appears only after a durable database receipt. Duplicate clicks, concurrent requests and retries with the same UUID cannot create a second row. An uncertain response locks the original answers for a safe retry.
- Private database queues, request-size limits, same-origin checks, honeypot and distributed rate limits before JSON processing. Public APIs do not expose inquiry records.

**Online intake is OFF by default.** Until enabled, applicants can explore the conversation selectors and quick links, but cannot fill or submit the form. The availability message explains this. No existing credentials were changed and no remote migration was applied.

## Activation checklist for the classmate and owner

1. **Agree on the existing Supabase project** used by the connected app. This adds a table to that project; it does not create another database. Start with synthetic inquiries in your agreed test environment.
2. Apply the existing `20261026000000_application_security.sql` rate-limiter migration (and its repository prerequisites), then `20261031010000_contact_inquiries.sql`. Review migrations against the current schema before applying them.
3. Connect an authorized staff backend to `public.contact_inquiries`. It must authenticate staff and enforce queue permissions before reading or changing rows. The service-role key belongs only on that backend, never in browser/VITE variables. The migration deliberately denies direct `anon` and `authenticated` access, including a restrictive RLS policy.
4. Assign a real owner and backup for each queue. Implement staff listing/filtering, assignment, review and reply handling in the connected app. Statuses available in the table are `new`, `in_progress`, `resolved`, `closed`; new records start as `new`.
5. Confirm and configure genuine reply contacts, service hours and achievable response notes. Test every listed email/phone. Choose who handles privacy requests. Check existing site-wide contact text too; this addition does not certify all pre-existing footer/CTA details.
6. Approve and publish the support retention period and privacy contact, update the support section of `/privacy`, and implement scheduled deletion/backup handling with your operations team. The new migration does not invent a retention duration or perform deletion. Review the wider existing privacy/legal pages separately before launch.
7. Configure server environment, restart the Node API, and run the acceptance checks below. Only set `CONTACT_INTAKE_ENABLED=true` after the queues are monitored and staff can read and respond.

```dotenv
# Server only. Values below are placeholders to REPLACE, not contacts to publish.
CONTACT_INTAKE_ENABLED=false
CONTACT_CUSTOMER_QUEUE=customer_support
CONTACT_FRANCHISE_QUEUE=franchise_support
CONTACT_CUSTOMER_EMAIL=
CONTACT_CUSTOMER_PHONE=
CONTACT_CUSTOMER_HOURS=
CONTACT_CUSTOMER_RESPONSE_NOTE=
CONTACT_FRANCHISE_EMAIL=
CONTACT_FRANCHISE_PHONE=
CONTACT_FRANCHISE_HOURS=
CONTACT_FRANCHISE_RESPONSE_NOTE=
CONTACT_ALLOWED_ORIGINS=
# Existing server configuration is also required:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# APPLICATION_RATE_SECRET (a securely generated value, at least 32 characters)
# TRUSTED_PROXY_IPS (only your actual proxy addresses, when behind a proxy)
```

Queue names allow lowercase letters, digits, `_` and `-`, up to 64 characters. Omit a queue to keep that channel inactive. Email/phone/hours can still be displayed while form intake is paused. Never put secrets in chat, committed files or `VITE_*` variables.

For local development, restart `npm run dev` after adding these routes or changing configuration: the existing launcher does not watch the Node API process.

Deploy the browser and `/api/*` behind the same HTTPS origin, as the existing Vite dev proxy does locally. If a trusted reverse proxy changes the Host header, add the exact public origin (scheme + host + optional port) to the comma-separated `CONTACT_ALLOWED_ORIGINS`. This is an origin allowlist, **not** permissive CORS; it does not enable an unrelated cross-origin browser deployment. Configure proxy body/time limits, known proxy IPs and appropriate perimeter abuse controls.

## API and data contract

- `GET /api/contact-options`: `{ customer, franchise }`, each with `enabled`, `email`, `phone`, `hours`, `responseNote`. No queue identifier or secret is public. `enabled` confirms configuration only, not live database health; failures still produce a safe error on submission.
- `POST /api/contact-inquiries`: JSON `requestId` (UUIDv4), `channel`, `topic`, `name`, `email`, `message`, `branch`, `orderReference`, `privacyAcknowledged: true`, optional empty `website` honeypot.
- Response after save: `{ id, reference: "SS-INQ-<UUID>", channel, status: "received", receivedAt }`.
- Field errors: `422` with `errors`; changed payload under an existing reference: `409`; malformed JSON: `400`; wrong media/encoding: `415`; payload above **12 KiB**: `413`; abuse limit: `429` + `Retry-After`; unavailable service/uncertain save: `503`.
- `accepted: false` means this attempt was rejected before a write; `accepted: "unknown"` means receipt is uncertain. A previous uncertain attempt remains uncertain even if a subsequent attempt is rejected. Keep the same UUID and original answers when retrying.
- Current limits: **20 attempts/IP/hour**, **5 new inquiries/reply-email/hour**, scoped separately from franchise application quotas. Existing identical receipts are recovered before consuming the new-email quota. These shared limits use HMAC keys through the existing rate-limit RPC. They are an initial operating choice, not a guarantee against distributed spam; tune against real usage and shared-network cases.
- No public lookup by reference; the reference is not an access credential. Staff must render messages as text, never raw HTML, and sanitize exports where applicable.

## Deliberate boundaries

- A database queue is not a notification integration. **Automatic email acknowledgement, staff email alerts and actual replies are not implemented.** The acknowledgement provided here is the on-screen receipt. If email is added, use a server-side provider, verified sender, durable outbox/retries and authenticated sending domains; never let a user choose arbitrary sender/recipient headers.
- The form is not a franchise application, order placement, refund approval or emergency channel. Application tracking keeps its existing separate authenticated flow.
- Unsent answers and pending UUIDs live only in page memory. Leaving/reloading the page discards them. Safe retry is guaranteed for the same UUID, not for a newly started message after reload. The UI explicitly asks users to keep the page open when receipt is uncertain.
- The UI does not collect documents or location coordinates. Browser/device autofill is controlled by the user; the component itself does not create a local draft.
- Supabase RLS, staff access, retention, inbox ownership and email delivery need live integration verification before claiming operational readiness.

## Validation and remaining acceptance checks

October 31, 2026: **13 new automated contact tests pass**, covering server rendering, config gating, privacy-safe public projection, shared validation, admission before body parsing, body/format limits, actual local HTTP chunked overflow, queue routing, same-ID replay, concurrent duplicate requests, lost insert response recovery and invalid receipts. The local HTTP test needed execution outside the sandbox because loopback connections were blocked there. The full regression suite passes **70/70 tests**; the production build and targeted lint pass. Full-project lint reports one pre-existing unused `hasNew` variable in `src/hooks/useScrollReveal.js:68`. Parallel Vite SSR tests emit non-fatal port-24678 warnings.

Browser access reports `Local browser use is disabled in Work settings`. No live Supabase migration, authorized staff workflow, real email, mobile layout or browser interaction is claimed as verified.

Before enabling public intake:

- [ ] In the test database, a synthetic message appears only in the intended queue with the correct notice version and receipt timestamp.
- [ ] Anonymous callers and unrelated authenticated users cannot read, write or enumerate inquiry records. Authorized staff see only their permitted queues. No message text or email appears in normal application logs.
- [ ] Same-reference retry produces one row; changed details under the same reference produce a conflict. Test a lost network response after the row has committed.
- [ ] 320/390/768/1440px layouts, 200% zoom, long email/reference wrapping and real-phone keyboard opening keep all controls reachable.
- [ ] Keyboard-only channel selection, native topic selection, linked error focus, unresolved errors, checkbox and receipt/copy feedback work with a screen reader.
- [ ] Channel change preserves each conversation separately and carries only reply name/email between them. Order reference appears only for customer order concerns and is cleared when that conversation changes to a non-order topic.
- [ ] Config outage, disabled channel, missing migration, rate-limit outage, 422, 429, delayed response and invalid receipt all preserve appropriate answers and show accurate recovery guidance.
- [ ] The configured support contacts, service hours, staffing, privacy contact and retention process are confirmed and tested.
- [ ] Staff can actually respond and close a synthetic case before the form is opened to customers.

## Contact experience redesign verification

The redesign adds no dependencies, third-party scripts or image requests. Availability still loads near the section; motion is limited to brief opacity/transform feedback, respects reduced motion and avoids scroll listeners. Download object URLs, timers, observers and pending requests are cleaned up. These are code-level protections, not a measured real-device performance claim.

Four new behavior tests cover independent drafts, Unicode limits, malformed availability and privacy-minimal receipt exports. Expanded render checks cover all eight topics, conditional fields, validation associations, disabled intake, submitting, safe retry and receipt states. The production build and targeted lint pass. Browser access still reports disabled, so mobile/zoom layout, native-radio keyboard behavior, focus movement, copying and downloading on real browsers remain unverified. Backend configuration and activation requirements above are unchanged.

## Direct contact modal and visual alignment follow-up

Removed the contact section’s Back to top action and decorative closing strip. Replaced the inline direct-contact block with a compact modal trigger. The native dialog includes an accessible name/description, focus on opening, Escape/close/return actions, backdrop dismissal guarded against dragging out of content, background scroll locking and focus restoration. Its header and return control remain reachable while the content scrolls on smaller or shorter screens. Reduced motion is respected; there are no new dependencies, extra API calls or invented contacts.

The modal presents loading, retry, unconfigured-contact, configured email/phone/hours and copy-feedback states. Contacts can remain usable when online message intake is disabled. Modal team selection is independent of the form, and missing details never generate placeholder contact links.

Validation for this follow-up: six targeted contact render/behavior tests pass, including all topic paths, draft isolation, safe-retry rendering and modal data states; production build and targeted lint pass. The broader 70-test run above predates this follow-up. Browser access remains disabled: native modal focus containment, Escape/backdrop handling, focus return, email/phone handlers, copy, short-screen scrolling and 320px/zoom layouts still require browser verification.
