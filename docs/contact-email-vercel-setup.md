# Contact acknowledgements on Vercel

This setup sends inquiry acknowledgements to the person who submitted the form.
It does not email staff or implement staff replies. Staff still read inquiries in
Supabase; EMAIL_REPLY_TO routes replies to your monitored inbox.

## Activate in order

1. Apply `supabase/migrations/20261103030000_contact_email_worker.sql` to the existing
   shared Supabase project, after the transactional outbox migration. It adds a
   service-role-only contact claim function. Do not rerun the original outbox SQL.
   This migration does not modify the admin app's trigger, existing jobs or claim function.
2. In Vercel Production set RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO and
   RESEND_WEBHOOK_SECRET. Sender can be:
   `Siomai Street <notifications@contact.siomaistreet.online>` (no surrounding quotes
   in Vercel). Verify that subdomain first.
3. Generate a separate random maintenance secret locally:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
   Store it as EMAIL_WORKER_SECRET in Vercel. Do not commit it or put it in a URL.
4. Commit/push the changed server files and this migration; deploy to Production.
   EMAIL_WORKER_ENABLED only controls continuous local Node polling. It does not
   activate a timer inside Vercel.
5. Create a free scheduler job, for example at https://cron-job.org/en/ :
   - URL: https://www.siomaistreet.online/api/maintenance/contact-emails
   - Method: POST; body: empty
   - Header name: Authorization
   - Header value: Bearer YOUR_EMAIL_WORKER_SECRET
   - Schedule: once per minute; enable failure notifications.
   This shares only the dedicated maintenance credential with the scheduler,
   not the Resend key or Supabase service key. No automatic account/job creation
   was performed. Check your plan quotas before enabling any paid overages.

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
- In notification_outbox filter kind=inquiry_received and the inquiry reference.
  Confirm state=accepted and provider_id populated, then delivery_state=email.delivered.
- Check inbox/spam and Resend delivery attempts. Test replying reaches EMAIL_REPLY_TO.
- Run the scheduler again: the accepted job must not be sent again.
- Have the classmate confirm their application approval still produces only their
  intended email. This website now claims only inquiry_received, but another
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

References: https://cron-job.org/en/faq/ and https://resend.com/docs/webhooks/introduction
