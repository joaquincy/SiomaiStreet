# Application safeguards and activation

Updated 6 November 2026. Implemented in the local website and backend. No live
database migration, deployment or provider email was performed for this change.

## What applicants get

| Location | Behavior |
|---|---|
| Step 2, government ID | Guidance matches the chosen ID. UMID CRN and PhilID PCN get documented numeric checks. Leading zeros are preserved. A different printed format can be explained for reviewer assessment. Other IDs retain manual review. |
| Step 2, email | Request a six-digit code, enter it, then see Email confirmed. Changing the email or reloading requires confirmation again. Answers and documents remain in the existing draft. |
| Step 5, written answers | Obvious repeated filler gets an inline explanation and linked validation error. Filipino, English and Taglish remain supported. Spelling and grammar are not scored. |
| Step 7, ID documents | Identical front/back file bytes produce an error beside the back upload and in the linked summary. The front and other answers stay selected. Passport remains a one-page exception. |
| Private Track Status | Requested corrections show the affected answer, staff explanation and response state. The applicant can explain the existing answer or propose a correction. Other answers are preserved. |

The new controls reuse application surfaces, font and color variables, navigation
buttons, disclosures and follow-up panels. No UI library or analytics was added.
ID formats and matching file hashes do not establish authenticity or ownership.
Photos saved again, cropped or recompressed can have different hashes even when
they depict the same side. Older stored documents without hashes remain reviewable.

## Activate before releasing the updated application

1. In the existing shared Supabase project, confirm the earlier migrations are
   already applied through `20261105000000_followup_evidence_and_staff_access.sql`.
   Do not replay all earlier scripts blindly.
2. Apply these new files once, in order, using their complete contents in SQL Editor
   or your existing migration process.

   - `supabase/migrations/20261105010000_application_email_confirmation.sql`
   - `supabase/migrations/20261105020000_application_field_corrections.sql`

3. Check the server environment in local development and Vercel Production.

   | Setting | What is needed |
   |---|---|
   | `RESEND_API_KEY` | Private sending key authorized for your verified sender domain |
   | `EMAIL_FROM` | For your setup, `Siomai Street <notifications@contact.siomaistreet.online>` once that subdomain is verified |
   | `EMAIL_REPLY_TO` | The actual monitored address already configured for replies |
   | `APPLICATION_EMAIL_SECRET` | Optional separate random secret of at least 32 characters. If absent, the existing `APPLICATION_PORTAL_SECRET` is used with purpose-specific signing. |
   | Existing Turnstile settings | Keep the correct site/secret keys and permitted website hostnames. The new action is `application_email`. |
   | Existing rate limiter | Shared database rate-limit configuration must remain operational. |

   These are server settings. Never use a `VITE_` prefix or publish their values.
   Do not rotate the portal secret just to enable email confirmation. Rotation
   invalidates existing credentials that depend on it.

4. Deploy the frontend and backend together after the migrations and sender are
   ready. New public submissions now require server-confirmed inbox access.
   Existing successful applications do not need resubmission. Failed or interrupted
   drafts keep their request IDs and can resume after confirming the email.
5. Keep the existing scheduled upload-cleanup endpoint or Node cleanup worker
   running. It now also removes up to 500 expired email challenges per run.
   Application erasure also clears the matching challenge and the new correction
   records/history through the existing retention workflow.
6. Connect the classmate's reviewer app to the API below. Its approval/invitation
   emails remain a separate integration. The contact email cron does not send
   confirmation codes. Codes use an awaited, bounded Resend call so they can arrive
   immediately when requested, subject to provider delivery.
7. Complete the live acceptance checklist before using real applicant data.

## Email behavior and limits

- A code expires after 10 minutes and allows five verification attempts total.
- Resending waits at least 60 seconds. The new code replaces the previous code.
- Sending allows five requests per hour per network and per recipient. API ingress
  also allows 20 requests per five minutes. Existing upload limits still apply.
- Confirmation produces a signed proof valid for up to 24 hours, bound to the
  exact email and draft. The server checks it before authorizing a public upload
  session and again at final submission. Forged browser flags are ignored.
- Codes and proofs stay out of localStorage and IndexedDB. The database stores
  keyed hashes and expiry/attempt metadata. The provider receives the email address
  and code so it can deliver the message. Application documents are never attached.
- If the successful confirmation response is lost, request a new code after the
  cooldown. A consumed code cannot be reused to issue another proof.
- Provider failure leaves the draft intact. Inspect Resend's email log for code
  delivery problems. A provider ID is retained on the challenge while it exists.
  These messages are separate from the ordinary notification outbox.
- Confirmation proves access to the inbox at that time. It does not prove legal
  identity or approval, and does not automate later recovery-email changes.

## Reviewer-app connection

Use the existing staff Supabase Auth session and an enabled entry in
`franchise_document_reviewers`. Never put the service-role key in the app client.
Send JSON and `Authorization: Bearer <staff access token>`.

Base path is `/api/staff/applications/{applicationId}/followup`.

| Request | Body or result |
|---|---|
| GET base | Includes `revision` and `fieldRequests`, with field, reason, state, item revision, response note and linked change ID |
| POST `/field-corrections` | `{requestId, revision, field, reason}`. Use a new UUID, the current application revision, an allowed field and a reason of 10 to 1,000 characters. |
| POST `/field-corrections/{itemId}` | `{requestId, revision, decision, note}`. Use the item's current revision. Decision is `resolved` or `changes_needed`. Note must contain 10 to 1,000 characters. |
| POST `/changes/{changeId}` | Existing answer-change review endpoint. Review the linked proposed answer and any supporting evidence before resolving the correction. |

Supported targeted fields are `firstName`, `middleName`, `lastName`, `address`,
`govIdNumber`, `govIdReviewReason`, `primaryPhone`, `secondaryPhone`, `targetCity`,
`additionalPlanDetails` and `pendingFundingDetails`. Email, approval status,
reviewer notes and document-verification status are excluded from applicant edits.

Example flow for a surname mismatch

1. Staff request `lastName` with a specific explanation of what needs checking.
2. Applicant opens Track Status, authenticates, loads details and replies to that
   item. The server validates the answer and records a response receipt.
3. A changed surname creates a pending identity change. Staff may verify against
   the ID already on file. A changed ID number still requires fresh evidence.
4. Staff review the linked change through the existing protected endpoint and
   provide the required identity-verification attestation based on actual checks.
5. Staff resolve the item, or return it as changes needed with a useful reason.
   Unresolved requested corrections block a transition to approved.

States are `open`, `received`, `changes_needed` and `resolved`. Identity/funding/
location changes preserve the existing answers until accepted. Valid ordinary
phone corrections follow the existing immediate-save rule while the targeted
request still waits for reviewer resolution. Requests use revisions and stable
retry IDs to prevent duplicates and stale overwrites. Staff access remains
independent of the applicant's 90-day portal expiry.

Show `govIdReviewReason` to reviewers alongside the ID type and private document
viewer. An explained unusual format must receive actual assessment before approval.

## Required live acceptance checks

- [ ] Synthetic code arrives from the verified subdomain in an inbox you control.
- [ ] Wrong, expired and exhausted codes produce useful errors. Resend countdown
      recovers without reloading. Changed email/draft cannot reuse an old proof.
- [ ] Reload restores answers/files but requires a fresh email confirmation.
- [ ] A valid confirmed applicant receives one receipt. Retrying keeps one record.
- [ ] Renaming a front image and selecting it as the back is rejected. Selecting
      a different valid back clears that error while unrelated errors stay visible.
- [ ] Passport needs no back. Different legitimate ID formats can reach staff review.
- [ ] Repeated filler is flagged. Genuine Filipino, English and Taglish examples pass.
- [ ] Staff request one surname correction, applicant replies, and authorized
      staff verify/accept it. The original documents and other answers remain.
- [ ] Unprivileged accounts cannot read the new tables or call the new RPCs.
- [ ] Test mobile keyboards, 320px layout, keyboard focus, linked errors,
      screen-reader announcements and retry after a lost connection.
- [ ] Confirm cleanup removes expired challenges and retention processes the new
      dependent records with the real shared database and connected app.

## Evidence and limits of local verification

Local automated coverage includes the PostgreSQL migrations through PGlite,
concurrent code verification, expiry, attempt limits, signature/email/draft binding,
direct-upload enforcement, file fingerprints, review permissions, revisions,
idempotent replies, linked changes and erasure integration. React server-render
checks cover the nine steps and email-control states. They do not simulate clicks,
phone keyboards, screen readers, real Turnstile or real email delivery.

The final full run passed all 238 tests using
`node --test --test-concurrency=1 tests/*.test.js`. The production build passed.
Lint reported the existing unused `PageLoader` and `BiNavigation`.
New email component source checks passed hardcode, emoji and native-select gates.
Render gates could not run because their Playwright dependency is unavailable and
local browser access is disabled. Token JSON/contrast gates do not accept this
project's existing CSS-variable source. Browser/contrast/accessibility verification
remains pending. No production-readiness or visual-QA pass is claimed.

Gate results for the new email component

| Gate | Actual result |
|---|---|
| `lint_hardcodes.py` | `OK: no hardcoded values found.` |
| `check_no_emoji.py` | `OK: no emoji in UI output or taste files.` |
| `lint_native_select.py` | `OK: no native <select> in generated UI.` |
| `verify_states`, `axe_audit`, `verify_responsive`, `verify_keyboard`, `verify_target_size`, `lint_intent`, `slop_tells` | Each reported `playwright not installed` and `REQUIRED, FAILING` with `DS_REQUIRE_BROWSER=1`. No rendered measurements resulted. |
| `verify_mobile_first` | `ERR_MODULE_NOT_FOUND` for `playwright`. No rendered measurements resulted. |
| `validate_tokens`, `validate_contrast` | Not run. There is no project DTCG token JSON input for these scripts. Existing application CSS variables were reused. |

After the final confirmation-reset and response-message adjustments, the eight
existing receipt/application render checks passed again, the production build
passed again, and targeted lint reported no warnings.

## Sources for numeric rules

- [PSA PhilID security guidance](https://psa.gov.ph/content/psa-bsp-promote-philid-card-security-and-verification-features)
  identifies the public 16-digit PCN and private 12-digit PSN. The form requests the
  PCN and rejects a 12-digit PSN in the ID-number field.
- [GSIS eCard enrollment form distributed by DepEd Capiz](https://depedcapiz.ph/issuances/Memorandum/2024/SDM430s2024.pdf)
  identifies the UMID Common Reference Number as 12 digits. Older/unfamiliar
  printed formats have an explanation path.

Passport, license, postal and voter ID formats are not constrained by a guessed
universal regular expression. Reviewers check the actual issuer and document.
