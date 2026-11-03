# Enable homepage messages

The website operator will monitor the private `contact_inquiries` table in the existing shared Supabase project. Local `.env` now enables both channels. No public support email, phone, service hours or response guarantee was invented.

In Vercel project settings, add these server environment variables to Production (and Preview only if wanted), then redeploy:

```ini
CONTACT_INTAKE_ENABLED=true
CONTACT_CUSTOMER_QUEUE=customer_support
CONTACT_FRANCHISE_QUEUE=franchise_support
```

Retain the existing Supabase server credentials, `APPLICATION_RATE_SECRET`, and Turnstile configuration. These variables do not use a `VITE_` prefix. Do not put the service role key in frontend code.

The existing `20261031010000_contact_inquiries.sql` migration must already be applied. Do not create a new database. Never enable public read access to the inquiry table.

After deployment, open `/api/contact-options` and check that `customer.enabled` and `franchise.enabled` are true. Test one synthetic message through the homepage. Complete Turnstile yourself if prompted. Confirm the displayed reference matches the row ID (prefixed `SS-INQ-`) in Supabase, and that a safe retry of the same pending request does not create another row.

In Supabase Table Editor, open `contact_inquiries`, sort by `received_at` descending, and filter `assigned_queue` by `customer_support` or `franchise_support`. Check `new` messages regularly; change `status` to `in_progress` when handling them, then `resolved` or `closed`. Changing status does not itself send a reply. Reply manually from a monitored business email account to the submitted reply address; an email/queue configuration alone does not provide a staff inbox UI.

The on-screen receipt confirms database receipt, not staff review. Email acknowledgement needs the separate transactional outbox, Resend configuration and scheduled worker; it is not activated by these three contact settings. Agree on retention and deletion handling with the owner, and keep message contents and reply addresses private.

Restart local `npm run dev` to load the environment changes. Automated regression: 136 tests passed. Live production intake, database receipt and email delivery have not been verified by this configuration change.
