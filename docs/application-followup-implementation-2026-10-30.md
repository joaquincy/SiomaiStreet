# Applicant follow-up implementation — 30 October 2026

Implemented locally; NOT deployed or live-service verified. Browser access currently
reports disabled, so the new screens and mobile CSS have not received browser sign-off.

## What changed

- Track Status now opens `/application/status`. A reference alone cannot access it.
- Receipts include a separate private HMAC access code and a downloadable private
  receipt. The UI explains that receipt is not approval and directs applicants to
  check status rather than promising an unconfigured email notification.
- The portal returns current status and reviewer-authored document requests, not
  application answers, contact data, staff notes, reviewer IDs or document paths.
- Applicants can replace only an open requested document, without resubmitting the
  original application. Replacements use pre-parse authorization/rate protection,
  size/type/signature validation, private quarantine and mandatory clean ClamAV
  results. An atomic SQL function updates the document and returns a retry receipt.
- Status returns to under review once all document requests are received. This
  means received for review, not document approval. Previous document metadata is
  retained in the correction history for authorized reconciliation/retention work.
- The first step has a before-you-start checklist based on the current contract.
  Unapproved later-stage document requirements and timelines remain explicitly pending.
- Existing no-employment, no-co-applicant and no-location paths remain unchanged;
  existing tests cover their validation. No invented history/site is required.
- Focus outlines, 44px step controls, 16px mobile inputs, scroll margins, reduced
  motion support and non-sticky mobile action controls improve accessibility.
  These changes still need real-device and visual regression checks.

## Security and product decisions

The access code is a bearer credential: possession of BOTH code and reference
allows viewing limited status and sending requested documents. It is not email
identity verification or an account. Do not include codes in URLs, analytics,
request logs, support messages or ordinary notifications. Use HTTPS.

Codes are derived from a separate server-only secret. They expire 90 days after
submission; staff may set `portal_access_revoked=true` to disable access immediately.
Rotating the secret invalidates all codes. Code recovery/renewal is NOT implemented;
an owner-approved support/identity-verification process is needed for lost/expired
receipts. Do not launch a flow that strands applicants without that support.

The portal holds credentials and replacement files in React memory, not localStorage.
Reload/sign-out clears the portal session. Changing a selected replacement makes a
new retry ID. Lost responses can be retried with the same file/ID while the page
stays open. After reload, refresh status first to see whether it was received.

Status updates are shown on demand with Refresh status. Automated email/SMS notices,
email verification, applicant profile edits and a staff UI are not included. The
classmate's authenticated admin server owns reviewer access and notifications.

## Deployment and classmate integration

1. Apply all earlier migrations, then
   `supabase/migrations/20261030000000_application_corrections.sql` in a test project.
2. Run `supabase/tests/application_corrections.sql` with SQL errors stopping execution.
   It rolls back its synthetic data. This script was authored but not executed here.
3. Configure a random `APPLICATION_PORTAL_SECRET` of at least 32 characters, identical
   across replicas. Keep the existing rate secret, scanner and private storage setup.
   The API preflight now checks tracking schema presence before accepting documents.
4. Set `VITE_VERIFIED_FRANCHISE_SUPPORT_EMAIL` ONLY to an owner-verified address and
   rebuild. Blank intentionally displays an unavailable notice. This does not
   validate or change older contact details elsewhere on the website; review those
   before launch too.
5. In the admin SERVER, verify the staff session, reviewer role and access to the
   application. Then call the service-only RPC `request_franchise_document` with:

   ```json
   {
     "application_id": "application UUID",
     "document_key": "govIdFront",
     "reason": "Please replace this photo: the ID number is obscured by glare.",
     "reviewer_id": "ID from the verified staff session"
   }
   ```

   Do not accept reviewer_id from an applicant. Reasons are applicant-visible:
   never place internal investigations or unrelated personal information there.
   The migration limits history to 100 requests/application and one open request
   per document. No public endpoint can create reviewer requests.
6. Applicants use `GET /api/application-status/:id` with the private code in the
   Authorization Bearer header. Replacement is multipart POST to
   `/api/application-status/:id/corrections/:correctionId`, with exactly one
   `requestId` UUID and one `document` file. The server derives the document key
   from the reviewer request; the applicant cannot select an arbitrary target.
7. Monitor correction reconciliation events. An ambiguous commit preserves final
   files rather than risking deletion of committed evidence. Reconcile orphan paths
   and apply the owner-approved retention policy to previous documents.
8. Test real scanner rejection, storage permissions, expired/revoked/wrong codes,
   concurrent replacement attempts, lost responses and staff-to-applicant flow.

## Validation

- 36 automated tests pass, including seven new portal security/retry tests and
  status/checklist server rendering assertions.
- Production Vite build passes. No dependencies added.
- SQL runtime, concurrent PostgreSQL behavior, live scanning/storage, admin integration,
  notification delivery, physical-phone keyboards, screen-reader speech and the
  new browser interactions remain unverified. Do not call this deployment-ready.
