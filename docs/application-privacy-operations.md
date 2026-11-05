# Application privacy contact, notice and retention

Version 2026-11-04.2. The website operator explicitly confirmed the public contact
`jushbisakol@gmail.com`, responsibility for monitoring it, and deletion of rejected
or withdrawn applications 180 days after recorded closure, subject to documented
holds. This records that authorization, not owner sign-off on other policies or a
Data Privacy Act compliance certification.

## Scope

This change does not alter eligibility, initial document requirements, marital-status
questions, the existing background-check wording, scanning configuration or visual
design. Those issues remain separate. The approved rule covers applications whose
database status is `declined` or `withdrawn`. It does not automatically delete active
applications, approved franchise contracts, customer inquiries, reviews or accounts.

The public notice is shared between the form and privacy page. A privacy link is
available before data entry. New checkbox acknowledgements save `privacyNoticeVersion`
with the application. Restored drafts with an older notice require a new privacy
acknowledgement without deleting their answers. Existing submissions are not relabelled
as having consented to the new notice; older clients without a version remain unversioned.

## Activate in the existing shared Supabase project

1. Apply the previous migrations, including transactional email, direct uploads,
   `20261104000000_passport_document_requirement.sql` and
   `20261104010000_application_document_policy.sql` if not already applied.
2. Apply **`supabase/migrations/20261104020000_application_privacy_retention.sql`**.
   Applying it creates the workflow but does not delete existing applications.
   It records closure dates on future transitions into declined/withdrawn. It does
   not guess historical closure dates from `updated_at` or submission dates.
3. In Supabase Authentication, identify the existing staff Auth user who will handle
   privacy requests. In the private `franchise_privacy_officers` table, add that
   user's UUID with `enabled=true`. This is separate from permission to view IDs.
   Do not grant this role to applicants, anonymous users or all ordinary staff.
4. Review the shared admin app's dependencies with your classmate. The erasure RPC
   refuses to start if it finds an unrecognized foreign key pointing at applications.
   Do not remove a foreign key simply to bypass this safeguard; implement and test
   the required dependent-record handling first. The app must not cache or copy
   applications indefinitely outside this database.
5. Test the workflow using synthetic data in a test project. Verify real Storage
   object deletion, denied anonymous access and the classmate's app behavior.
6. Deploy the notice and backend together. In Vercel Production add:

   ```ini
   APPLICATION_RETENTION_ENABLED=true
   APPLICATION_RETENTION_SECRET=<a new, separate random secret of at least 32 characters>
   ```

   Generate the secret locally, keep it private, and never prefix it with `VITE_`.
   Do not reuse your email, upload or applicant-portal secrets.
7. In your existing scheduler (for example cron-job.org), create a separate hourly
   **POST** request to:

   ```text
   https://www.siomaistreet.online/api/maintenance/application-retention
   ```

   Set the private HTTP header `Authorization: Bearer <APPLICATION_RETENTION_SECRET>`.
   Enable failed-run notifications. Redeploy after changing Vercel variables.
   Vercel does not run the Node interval continuously. On a continuously running
   Node server, the same enable setting starts an hourly bounded worker instead.
8. Check the response and private jobs table. A `200` with `processed:0` means
   nothing was due, not that any case was deleted. `siteDeleted:true` means website
   records were erased; external cleanup is still pending. A `503` requires retry
   or investigation and is never reported as successful erasure.

The worker handles one case and at most 50 storage paths per call, with a 25-second
request budget. Large cases progress over successive runs. Database leases prevent
overlapping runs; failures retain the job and schedule retry. Keep this separate
from `/api/maintenance/application-uploads`, which cleans temporary uploads only.

## Daily staff procedure for privacy requests

The confirmed operator monitors the published inbox on working days. The following
is an operating checklist, not a promised statutory response deadline. Acknowledge
promptly and tell the requester the next step and a realistic case-specific date.
Escalate to the owner when you cannot meet it. Before any absence, arrange a trusted
backup without sharing your email password. Enable MFA on the inbox and staff account.

1. **Log:** add a private `franchise_privacy_requests` row: application reference
   when known, request kind (`access`, `correction`, `objection`,
   `consent_withdrawal`, `deletion`), receipt time and assigned privacy officer UUID.
   Keep only short decisions in `decision`; do not duplicate the email, documents,
   passwords, private access codes or full answers in this log.
2. **Acknowledge:** confirm the request was received, its reference, and how you will
   verify it. Do not confirm whether an application exists to an unverified third party.
3. **Verify:** a reference or the From header on an email is insufficient alone.
   Send a fresh challenge to the contact already on the application and verify the
   response. Use an agreed secure alternative when that account is inaccessible.
   Check an agent's authority separately. Do not ask for IDs or private portal codes
   by ordinary email by default. Record verification time, set `state=verified`
   and record a short verification/decision summary, without storing the challenge.
4. **Handle the request:**
   - Access: identify the requester's records, exclude other people's information,
     and deliver through an agreed authenticated/secure channel. Do not send an
     application dump or ID attachment in ordinary email.
   - Correction: verify the requested correction. Use the existing private document
     request flow for files; coordinate answer corrections through the admin app
     with the same shared validation. Recheck funding/identity decisions if affected.
   - Objection or consent withdrawal: identify the affected purpose, stop optional
     processing where appropriate, and assess whether a separate lawful basis or
     retention need applies. Explain the outcome; withdrawal does not automatically
     delete a contract or invalidate past processing.
   - Deletion: verify scope and legal/dispute holds, consult the owner where needed,
     then use the verified-request RPC below. Never offer instant deletion merely
     because someone supplied an application reference.
5. **Resolve:** for access/correction/objection requests, record the actual action or
   reason for refusal, `resolved_at`, and `state=completed` or `declined`. Explain
   limitations and escalation to the requester. For deletion, keep the request
   `in_progress` until external copies and backup arrangements are reconciled.
6. **Minimize copies:** avoid downloading IDs; delete authorized working copies when
   no longer needed. Apply the process to email attachments, exports and the admin
   app too. Clear sensitive email conversations after the case is resolved unless
   a documented hold requires otherwise; do not keep them as a second applicant archive.

The website supplies a public email contact and private operational tables. It does
not send acknowledgements automatically or verify requesters on behalf of staff.
No public deletion endpoint or public lookup of privacy requests is created.

## Closure, holds and verified-request deletion

Run these only in the privileged Supabase SQL Editor or a trusted backend, after
checking the real IDs. Example IDs below are placeholders, not runnable values.

To confirm an older declined/withdrawn application's true closure date:

```sql
select public.review_franchise_retention(
  p_application => '<application UUID>'::uuid,
  p_officer => '<authorized privacy officer Auth UUID>'::uuid,
  p_closed_at => '<verified closure timestamp>'::timestamptz,
  p_hold_reason => null,
  p_hold_review_at => null
);
```

To place or renew a hold, pass its concise reason and a future review timestamp;
omit `p_closed_at` to retain the existing date. Null hold parameters explicitly
clear a hold, so do not use the first example on a held case without authorization.
An overdue hold review remains a hold until a privacy officer clears it. Reopening
an application clears its automatic deletion date. Record the real decision in the
privacy-request log; do not invent closure dates to make records immediately due.

For an individually authorized deletion request, first set its private request row
to `verified` with `verified_at`, a nonempty decision and an enabled handler. Then:

```sql
select public.start_franchise_erasure(
  p_application => '<application UUID>'::uuid,
  p_request => '<verified deletion request UUID>'::uuid
);
```

An active non-approved application can be erased for a verified request; approved
franchise records require a separate retention decision and are refused by this RPC.
An unexpired upload grace period or active notification delivery also blocks erasure.
The worker retries queued cases. Once erasure starts it is irreversible: updates,
uploads, review links, correction writes and notifications are blocked.

## What deletion covers and what staff must finish

The website worker inventories current documents, previous/replacement documents,
funding evidence snapshots, uploads in retained sessions and legacy objects under
the application's prefix. It removes bytes using the Storage API before removing
answers, staff notes, corrections, verification records, upload rows, document logs,
and matching website notification queue/event rows. It does not delete shared
accounts, unrelated inquiries, another application's documents or another app's tables.
Unexpected paths or dependencies stop processing for investigation.

The job then enters `external_cleanup`. Before confirming completion, reconcile:

- The classmate's admin app, copied data, caches and additional notification systems.
- Resend/provider retained messages or logs, staff inboxes, downloads and exports.
- Backup expiry and restoration. Where selective removal from a backup is impossible,
  retain the private deletion reference in this pending job; keep backups restricted
  and make the restore procedure reapply deletion before reopening access. Do not
  claim complete erasure while that exception is unresolved. Coordinate a restricted
  deletion register outside the backup being restored, held only while necessary.
- Any documented legal hold, which requires an explained retention exception.

Once those checks are actually complete:

```sql
select public.confirm_franchise_external_erasure(
  p_job => '<erasure job UUID>'::uuid,
  p_officer => '<authorized privacy officer Auth UUID>'::uuid,
  p_confirmed => true
);
```

This removes applicant/provider references and the associated deletion-request log
from the completed job. It keeps minimal pseudonymous fingerprints, job timestamps
and staff accountability to prevent stale requests or delivery webhooks recreating
erased records. Fingerprints are not claimed to be anonymous. Review their necessity
periodically. Existing bounce/complaint suppression records remain to prevent
unwanted delivery; do not remove them and accidentally resume suppressed email.

Active/approved records still require separate retention decisions. Review inactive
cases regularly and close them accurately; never let the exclusion become indefinite
storage without a business reason. Do not invent a contractual retention period.

## Validation and remaining live checks

Local verification on 4 November 2026: `npm test` passed **220 tests** after allowing
the test harness to connect to its localhost servers (the sandbox initially returned
EACCES). `npm run build` passed. `npm run lint` exited successfully with two existing
unused-variable warnings in `App.jsx` and `RoutePlannerModal.jsx`. The new privacy
content renders in the automated React checks. Browser inspection was blocked by
Work settings; no mobile/keyboard/visual pass is claimed. The parent UX kit's gate
scripts are not installed in this repository, so those gates were not available.

Automated checks exercise real PostgreSQL functions in PGlite with synthetic data,
plus mocked Storage deletion failures and retries. These do not validate hosted
Storage/Auth, real provider copies, the shared admin app or mailbox monitoring.
Apply and test the migration, configure the scheduler, test a synthetic end-to-end
deletion, and verify those operational steps before claiming the workflow is live.

Reference: [NPC Data Privacy Act implementing rules, Sections 18, 19, 22 and 34](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/).
