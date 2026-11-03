# Contact acknowledgements on Vercel

This setup sends an acknowledgement to the customer and a separate staff email
to `jushbisakol@gmail.com` for each new contact inquiry. Staff emails include the
name, email, topic, channel, branch/order details and message, as plain text.
Reply in Gmail to respond to the customer's submitted address. The original is
still available in Supabase. Customer acknowledgements use EMAIL_REPLY_TO.

## Activate in order

1. Apply `supabase/migrations/20261103030000_contact_email_worker.sql` to the existing
   shared Supabase project, after the transactional outbox migration. It adds a
   service-role-only contact claim function. Do not rerun the original outbox SQL.
   This migration does not modify the admin app's trigger, existing jobs or claim function.
2. Also apply `supabase/migrations/20261103040000_contact_staff_notifications.sql`.
   This adds a separate staff trigger/job and an immutable private snapshot so
   retries use the same email content. It forwards only new inquiries, not history.
   The staff recipient is fixed in this SQL function, never taken from the public
   form. To change it later, update the function with a reviewed migration; existing
   queued jobs retain their original recipient.
3. In Vercel Production set RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO and
   RESEND_WEBHOOK_SECRET. Sender can be:
   `Siomai Street <notifications@contact.siomaistreet.online>` (no surrounding quotes
   in Vercel). Verify that subdomain first.
4. Generate a separate random maintenance secret locally (keep an existing one):
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
   Store it as EMAIL_WORKER_SECRET in Vercel. Do not commit it or put it in a URL.
5. Commit/push the changed server files and migrations; deploy to Production.
   EMAIL_WORKER_ENABLED only controls continuous local Node polling. It does not
   activate a timer inside Vercel.
6. Create a free scheduler job (or keep the existing one), for example at https://cron-job.org/en/ :
   - URL: https://www.siomaistreet.online/api/maintenance/contact-emails
   - Method: POST; body: empty
   - Header name: Authorization
   - Header value: Bearer YOUR_EMAIL_WORKER_SECRET
   - Schedule: once per minute; enable failure notifications.
   This shares only the dedicated maintenance credential with the scheduler,
   not the Resend key or Supabase service key. No automatic account/job creation
   was performed. Check your plan quotas before enabling any paid overages.

Each inquiry creates two emails and consumes two sends from your provider quota.
One job is attempted per call. An empty queue returns `processed: 0`; a claimed
job returns `processed: 1`, including a failed send safely scheduled for retry.
Neither means delivered. Normal delivery can take a schedule interval plus queue
waiting time. Network failures use backoff and require monitoring. Each request
has a 25-second network deadline; timed-out sends retry with the same idempotency
key after the database lease expires. Never manually reset ambiguous old jobs.

## Verify with synthetic data

- Submit one contact inquiry using an inbox you control, and save its reference.
- Run the scheduler's test once; require HTTP 200 (403 means wrong maintenance
  secret; 405 means wrong method; 503 means configuration/database/provider processing failed).
- In notification_outbox filter by the inquiry reference. Expect one
  inquiry_received job and one inquiry_staff job, with distinct IDs.
  Confirm state=accepted and provider_id populated, then delivery_state=email.delivered.
- Check both customer and staff inbox/spam and Resend delivery attempts. Replying
  to the staff notification must address the customer; replying to the customer
  acknowledgement must address EMAIL_REPLY_TO.
- Run the scheduler again: the accepted job must not be sent again.
- Have the classmate confirm their application approval still produces only their
  intended email. This website claims only inquiry_received/inquiry_staff, but another
  consumer using the old generic claim_notification RPC can still claim contacts.
  Coordinate queue ownership if the admin app uses that RPC.
- Monitor pending age, needs_review, bounced/complained events and scheduler errors.

Application jobs are preserved, not deleted or marked sent. The existing shared
application trigger may continue creating jobs; coordinate ownership/retention
with the classmate before removing anything from the shared database.

Local mocked tests do not verify live PostgreSQL locking/RLS, deployed secrets,
DNS, provider delivery, scheduler calls or webhook persistence. Those checks
remain required. Existing migrations and this new migration were not applied by
the agent.

Retention/erasure must cover the original contact record, staff_payload in the
private outbox, provider email records, and the staff inbox. Do not grant public
access to the outbox to build an inbox view. If the staff inbox bounces or complains,
suppression may block staff alerts; monitor that state rather than bypassing it.

References: https://cron-job.org/en/faq/ and https://resend.com/docs/webhooks/introduction
