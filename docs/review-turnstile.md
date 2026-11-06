# Review submission security check

Reviews reuse the existing application Turnstile site key, server secret, allowed
hostnames and styled security dialog. No new Cloudflare widget, SQL migration,
database table or package is needed.

The visitor completes the review and presses **Post Feedback**. After basic input
validation, the existing dialog opens. Verification continues to submission
automatically. Cancelling or failing verification keeps the text, rating, branch
and selected photo on the current page. Leaving/reloading does not save this form.

The token is fresh for each attempt and sent only in `x-turnstile-token`, with
action `review`. It is not stored in drafts. Application and inquiry tokens cannot
be substituted: the server verifies the expected action and configured hostname.

The API applies the existing review rate limit first, then calls Cloudflare
Siteverify, then parses the multipart body. Failed verification cannot reach photo
processing, Storage writes or review insertion. Platform-level request buffering
and network transfer can still occur before application code runs.

Deploy frontend and backend together. Existing Production variables remain:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY` (server only)
- `TURNSTILE_HOSTNAMES` (include the deployed website hostname)
- `APPLICATION_RATE_SECRET` and existing Supabase server credentials

Production always verifies even if `TURNSTILE_ENABLED=false`; the existing local
development opt-out remains available. Restart the local backend when testing.

Post-deployment checks with synthetic reviews:

1. Cancel the dialog: answers and photo remain, no review is submitted.
2. Submit with a successful check: one pending moderation receipt is returned.
3. Repeat after verification failure: a fresh check appears.
4. Without a token or with the wrong action: API rejects before multipart parsing.
5. Check narrow viewport, keyboard focus and screen-reader announcements.

Automated tests mock provider/database services; they do not prove live Cloudflare
configuration or delivery to the deployed database. Browser QA is still needed.

Didit and `/api/application-identity` are absent from this checkout; this change
does not restore the removed integration. If reintroduced, protect session creation
before provider calls with its own verified Turnstile action.

This change does not implement review idempotency, image normalization or private
pending-photo storage. Those are separate audit items.
