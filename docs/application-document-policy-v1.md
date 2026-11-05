# Application document policy and reviewer handoff

Version `2026-11-04.1` · Implemented locally 4 November 2026.

Privacy-contact and closed-application retention arrangements were subsequently
confirmed by the operator. See [application privacy operations](application-privacy-operations.md)
for the current contact, 180-day rule, holds, migration and deletion procedure.
This does not approve the separate document-collection stages or background-check wording.

The user authorized the alternatives/explanations below and explicitly chose **allow initial submission with pending funding; verify funding before approval**. Submission acceptance is not document authenticity, franchise eligibility, approval or an owner-signed business policy. The owner still needs to confirm the final acceptable-ID list, staffing, legal notices, retention and any future recency rule.

**Current source:** `shared/documentPolicy.js`, `shared/applicationDocuments.js` and matching shared validation. The backend stamps the policy version; clients cannot select an older policy. The earlier Phase 2 recency proposals are superseded and must not be used as rejection rules.

## Applicant rules

| Evidence | Purpose / collection stage | Pages and alternatives submitted for review | Reviewer handling |
| --- | --- | --- | --- |
| Government ID | Identify applicant; collected at application, manually checked in review | Front and back of selected ID; Passport uses identity page only. Other requires document name and issuing authority. Keep necessary identity and validity fields visible. | Confirm the document is suitable for identity verification. Other is not automatically accepted. Request a suitable alternative privately when necessary. |
| Address | Link applicant to declared residence; evidence at application | Own-name bill; parent/spouse bill or landlord bill plus relationship/occupancy explanation; lease/tenancy agreement; official residency certificate; another document with explanation. Relevant pages showing holder/occupant, issuer, address and date/period only. | Match the address and explain any further verification need. Do not reject solely for a different bill-holder name. Do not request that person's ID automatically. Alternatives are reviewed, not guaranteed sufficient. |
| Funding | Distinguish cash available now from a funding plan | Bank certificate or relevant balance page; loan approval/offer; partner/family commitment; another explained document. Keep holder, issuer, dates, relevant balance/amount, release status and conditions. | Approval/commitment is not cash. Check actual availability and unresolved conditions. Request only the missing evidence; record reviewer verification before approving applications that declared pending funding. |
| Funding not yet documented | Permit initial review without a dummy document | Select pending/partly pending in Step 4, explain source and status, then choose evidence not available in Step 7. Exact available cash may be 0 when all funding is pending. | Funding file may follow through Track Status. Upload receipt and scan success do not satisfy human verification. Database blocks approval until verified evidence is recorded. |
| Portrait | Match appearance to identity; application | One 2x2 portrait with white background reflecting current appearance. | No invented month-based age cutoff. No face-recognition service is added. |
| Business/site supplements | Relevant experience or existing-business/site context | Optional registration, permit, CV, reference or site proposal. Relevant pages only. No existing business/site means no invented supporting record. | Further verification/onboarding requests need a specific purpose. Contracts, jurisdiction-specific permits and final launch requirements still need owner/legal/operations decisions. |

## Redaction and dates

- Applicants may permanently remove full account numbers, unrelated transactions, utility usage and unrelated personal information. Preserve issuer, relevant names, date/period, address and relevant balance/commitment. Do not change facts or hide the evidence needed for review.
- Do not request passwords, account credentials, PINs, OTPs, entire transaction histories or other people's IDs by default.
- Tell applicants to export a permanently redacted copy and reopen it to check that removed text cannot be copied. The website does **not** provide automatic redaction or prove that a redaction is irreversible.
- **No fixed recency limit is approved or enforced.** Read the issue date/period and any expiry/validity information. Assess whether the evidence supports the current situation. If an update is necessary, record the reason and explain it to the applicant. No arbitrary 90-day, six-month or twelve-month threshold applies.
- Existing retention rules are separate from document recency. This change neither invents a retention period nor deletes historical applications.

## Review workflow

1. Read the funding availability, evidence types, Other-ID details and conditional explanations in `application_data`. The initial pending funding statement remains historical applicant input even after later verification.
2. Open documents through the existing authorized private-document endpoint. Preserve access logs and short-lived URLs. File-format checks and malware scans do not authenticate a document or establish financial capacity.
3. Use `request_franchise_document(application_id, 'proofOfFunds', reason, reviewer_id)` through your trusted admin backend for missing funding evidence. The reason must say what is needed, why, relevant pages, permitted redactions and an alternative where appropriate. Do not request public links or email attachments.
4. Applicant uses reference/private code in Track Status to submit the requested file. The existing workflow supports a first funding document as well as a replacement. Keep the existing receipt/retry identity.
5. Authorized reviewer reads the evidence and verifies actual availability. Record a concise note with basis and unresolved conditions addressed, without account numbers or copied document contents. Use the endpoint below.
6. Only then can the admin app approve. This verification does not itself approve the franchise. A new funding document or changed funding answers require verification again. Approval is also blocked while a funding-document request remains open.

For unacceptable evidence or misleading redaction, request the specific missing information with a reason. Do not reject just because unrelated account/transaction details were removed. Do not request scans of empty passport pages. Staff must not claim a statutory recency period unless the applicable requirement has been verified and approved.

## Connect the admin app

Use the staff member's Supabase Auth access token, not a service key in the client:

```http
POST /api/staff/applications/{application-id}/funding-verification
Authorization: Bearer {staff-access-token}
Content-Type: application/json

{"confirmedAvailable":true,"notes":"Describe the evidence reviewed and how funding availability was confirmed."}
```

The staff UUID must be enabled in `franchise_document_reviewers`. The server derives the reviewer ID from Auth; a client-supplied reviewer ID or scanner override is ignored. Notes are required, limited to 1,000 characters, and must not contain secrets or unnecessary personal data. Keep `confirmedAvailable` unchecked until the reviewer deliberately confirms it. Do not call this automatically after upload or merely to bypass an approval error.

Successful response: `{id, applicationId, reviewedAt, status: "verified"}`. Failed authorization is 401/403; invalid input is 422; missing evidence/open request/state or database configuration problems produce 409 without exposing database errors. If 409 persists, check the migration and server logs privately. The endpoint uses the existing staff rate limit.

The database stores the reviewer, timestamp, note and snapshots of the funding answers/document metadata in private `franchise_funding_verifications`. Repeating the same verification returns the same record. Snapshots reference metadata, not duplicate file bytes. The review-needed flag cannot be cleared by changing an answer or sending `false`; verified evidence must match the current record. Public roles cannot read or write verification records. The SQL function is service-role-only; use the website endpoint from the admin client.

The app may keep its existing status-update mechanism: the database trigger enforces the pending-funding approval block there too. Display that error helpfully and offer the evidence/review action. Add human-readable labels for `fundingStatus`, `pendingFundingDetails`, `addressEvidenceType`, `addressEvidenceDetails`, `fundsEvidenceType`, `fundsEvidenceDetails`, `govIdOtherName`, `govIdOtherIssuer`, `documentPolicyVersion` and `funding_verification_required`. These values are not public.

## Deployment order

1. In the existing shared Supabase project, apply `20261104000000_passport_document_requirement.sql` first if it has not been applied.
2. Apply **`20261104010000_application_document_policy.sql`** next. It replaces finalization, adds one boolean column, one small private verification table/index and approval/verification functions. It does not rebuild application tables or rewrite existing records. Apply migrations in order; do not rerun the older Passport migration after the newer policy migration, because that would replace the newer finalization function. If this happens, reapply the newer migration.
3. Deploy frontend and backend together. No new third-party API, environment secret or dependency is introduced. Old incomplete drafts must answer the new questions; no acceptance or release status is guessed from previous uploads. Existing browser drafts and files remain available.
4. Connect the admin verification action before attempting approval of a pending-funding application. This app is outside the website workspace and was not modified here.
5. Run synthetic browser/service QA: household/landlord address, Other ID, Passport, available funds, zero available cash, partly pending funds, deferred file, private follow-up, authorized verification, approval, denied public access and safe retries. Verify mobile/keyboard access to all conditional fields and error links.

## Evidence and limits

Local verification: `npm test` **208 passed, 0 failed, 0 skipped**; `npm run build` passed; `npm run lint` passed with three unrelated unused-variable warnings (`PageLoader`, `quadBezier`, `BiNavigation`); `git diff --check` passed. No browser click-through or visual/accessibility gate pass is claimed; browser access was unavailable during this work.

The tests exercise shared/API validation, rendered field/error states, SQL submission and approval guards, private correction uploads, stable retries, reviewer authorization and stale-verification invalidation. Live migration, deployed admin-app integration and browser click-through must still be verified. This is not a declaration of legal compliance or owner approval.

Data minimization informs the limited-page and redaction guidance: [National Privacy Commission IRR, proportionality](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/). Private access, file validation and defense in depth follow [OWASP file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). Neither source defines this business's acceptable document list or a mandatory document-age window.
