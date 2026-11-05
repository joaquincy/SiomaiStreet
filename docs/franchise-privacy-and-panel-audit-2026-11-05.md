# Franchise application: privacy and panel-defense audit

Reviewed 5 November 2026. Scope: current local source, all nine application steps, drafts, receipt, status/corrections, new details/onboarding workflow, upload handling, relevant API authorization, migrations and privacy operations documentation. No production applicant records were accessed. Hosted migrations, reviewer-app behavior and provider configuration were not independently verified.

## Assessment

The application has useful safeguards, but the repository does **not** justify a claim of full Data Privacy Act compliance or complete end-to-end readiness. The largest concerns are early collection of sensitive information, broad background-check wording, incomplete retention decisions, and access controls/operating procedures surrounding the new portal. There are also reproducible correction-flow problems.

This is a technical and policy-gap review, not an NPC certification or a finding that every listed feature violates the law. A document can have a legitimate purpose and still be collected too early or in excessive detail. Conversely, optional status does not remove the need to justify collection.

### Legal basis for this review

The DPA requires lawful processing and identifies age, marital status, specified government-issued information and information about alleged offenses/proceedings as sensitive personal information. Ordinary personal-data grounds and the conditions for sensitive-data processing must be assessed separately. A general checkbox does not establish a lawful basis for every use. See [RA 10173, Sections 3, 11–13](https://privacy.gov.ph/data-privacy-act/).

The IRR requires transparency, legitimate purpose, proportionality, retention limited to necessity, appropriate security and support for data-subject rights. Outsourcing does not remove the controller's accountability. See [NPC IRR, Sections 18–22, 25–29, 34 and 43–44](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/).

## Findings, prioritized

### P1 — Initial collection needs a stronger, stage-specific justification

**Evidence:** `PersonalInfo.jsx` requires full birth date, citizenship, residential address, government ID type/number and marital status. `applicationDocuments.js`/`documentPolicy.js` require identity evidence, address evidence and a portrait at initial submission; funding evidence is conditional. Non-Passport IDs still require both sides. `FinancialCapability.jsx` also offers optional debt, insolvency and financial-misconduct questions.

The marital-status explanation is for future contract/signatory determination, but the applicant has not reached contracting. The separate portrait duplicates part of the ID's identification purpose without a documented process showing why both are needed now. A blank/uninformative reverse of a non-Passport ID still lacks an exception. Initial quotation applicants face almost the same identity-document burden as a verification-stage applicant.

**Panel question:** “Why do you need these details before deciding whether the proposal is viable?”

**Recommended decision:** approve a purpose/stage/basis/access/retention matrix for each field. Consider initial contact, adult eligibility, general locality, package interest, capital range and operating plans first; exact identity evidence at shortlisting; marital/signatory details only for an applicable contracting purpose. Keep exact birth date or portrait only where the owner can explain necessity. Review legal-history questions separately. Do not claim that more fields automatically improve credibility.

**Not changed in this UI pass:** required fields and collection stages need owner/legal review, and coordinated UI/API/SQL/reviewer changes.

### P1 — Background-check consent is broader than the documented process

**Evidence:** `LegalConsents.jsx:98` requires authorization for a comprehensive background review and consumer/investigative reports for employment and/or franchise qualification. No corresponding defined provider, scope, selection criteria or adverse-finding challenge procedure is evident in the inspected application workflow.

**Panel question:** “Are you an employer, and what investigation actually occurs?”

**Fix:** replace generic employment-style language with the actual franchise checks, who performs them, source categories, purpose, applicable legal basis and applicant correction/contest process. Request a separate authorization at the relevant stage where required. Have the owner approve the NDA and avoid implying that ticking a box authorizes unspecified future investigations.

### P1 — Consent-version evidence is not enforced by the backend

**Evidence:** frontend changes stamp `privacyNoticeVersion` and older drafts clear stale consent. However, `shared/application.js` requires the privacy boolean without requiring a notice version in legal-step validation. A synthetic call with the version removed returned **no legal-step errors**. The source permits this even though the UI normally supplies the version.

**Panel question:** “Which notice did this applicant acknowledge, and can you prove it?”

**Fix:** validate and record the submitted notice version server-side, keep immutable notice copies, and record server acceptance time and affected purposes. Preserve historical acknowledgement when an applicant later edits an answer; request fresh authorization only where a changed purpose actually requires it. Plan legacy-record handling rather than inventing historical consent.

### P1 — The new details endpoint expands what a stolen portal code exposes

**Evidence:** `server/applicationPortal.js` derives a high-entropy HMAC bearer code from the application ID. `applicationFollowup.js:list` returns identity, address, funding and co-applicant groups plus change history to the authenticated applicant. Only the government ID number is masked by `changeView`. There is no additional identity challenge for loading these groups.

The reference alone does not authenticate an applicant, and the code is not feasibly guessable merely because it is deterministic. The risk is possession, sharing or disclosure of both receipt details. There is no per-application credential rotation/reissue flow in the inspected implementation; revocation closes access. The page also keeps already loaded answers until it is closed or signed out, without an inactivity lock.

**Fix:** reassess the portal's threat model now that it exposes more than status. Consider short-lived authenticated sessions, verified-channel step-up for sensitive views/edits, field-group loading, code rotation/recovery and inactivity locking. Never put the private code in analytics, email subject lines, screenshots or URL query strings.

**Fixed in this pass:** the status page no longer incorrectly claims that financial answers are never displayed. Accurate notice is useful, but it is not a replacement for access controls.

### P1 — Staff permission is global, not assignment-scoped

**Evidence:** `authorizeDocumentReviewer` checks a valid Supabase user and enabled membership in `franchise_document_reviewers`. The follow-up handler uses that same role for reading answers, reviewing changes, assigning onboarding and requesting evidence. No application-assignment or separate identity/financial/onboarding permission check is present there.

**Panel question:** “Can any enabled reviewer view or change every applicant's records?”

**Answer today:** these website endpoints authorize the enabled reviewer role globally. This is not proof of a public data leak. A small central team may intentionally need broad access, but the notice's “assigned reviewers” wording must match the actual policy and controls.

**Fix:** approve a permission matrix, implement case assignment or explicitly documented central-review privileges, separate sensitive decisions where justified, verify staff MFA/session controls, log answer reads as well as document downloads, and test disabled/unassigned accounts. Audit the classmate's app and direct database policies too; this website cannot prove that app's authorization.

### P1 — Retention is partly implemented, partly undecided, and not live-verified

**Evidence:** `shared/privacy.js` defines 180 days after recorded rejection/withdrawal, with holds. Active and approved records are excluded pending separate decisions. The retention migration and worker cover website records/files and follow-up history. The operations guide leaves external inboxes, exports, admin-app copies and backups to staff reconciliation. Worker deployment/scheduling was not verified in this audit.

**Panel question:** “What actually deletes the records, including downloaded copies?”

**Fix:** demonstrate a synthetic closure → due date → file deletion → record deletion → external reconciliation. Approve retention/review rules for inactive applications, approved franchise records, audit/change histories and minimal deletion/suppression records. Define backup restoration controls and who checks holds. Do not describe the 180-day business choice as a statutory deadline or call temporary-upload cleanup application deletion.

### P1 — Staff onboarding is accidentally tied to the applicant's 90-day access window

**Follow-up status, 5 November:** fixed in local code by the additive
`20261105000000_followup_evidence_and_staff_access.sql` migration. Staff operations
use independent permission/lifecycle checks. Regression tests cover expired and
revoked applicant access, disabled staff, reassessment, closure and erasure.
Apply the migration and verify the reviewer app before calling this deployed.
Applicant renewal/recovery remains outside this fix. Original audit evidence follows.

**Evidence:** `assert_franchise_followup` rejects applications 90 days after submission or with revoked applicant access. Both `assign_franchise_onboarding` and `act_franchise_onboarding` invoke it, including staff actions. In contrast, staff answer-change review explicitly permits work after applicant expiry.

**Impact:** a genuinely approved case may be impossible to finish through these staff onboarding functions after 90 days. Expiry also has no defined applicant renewal/recovery journey beyond support.

**Fix:** separate staff authorization/lifecycle checks from applicant-session expiry. Keep closure, erasure and reassessment controls. Define staff-assisted access renewal and test cases at day 89, day 90, revoked access and an ongoing approved onboarding. This needs API/SQL tests, not just different wording.

### P1 — Some material corrections cannot reach the reviewer

**Follow-up status, 5 November:** fixed locally. Pending identity/funding changes
can be saved before required new files are attached. Change history provides
secure supporting-document uploads; staff acceptance requires the evidence and
revalidates related answers. Current answers/documents remain intact until
acceptance. Synthetic client/API/PostgreSQL tests cover both cases below and
their retries. The new migration, live storage/reviewer integration and browser
attachment QA are still required. Original audit evidence follows.

**Reproduced using the shared change validator:**

| Existing case | Proposed change | Actual result |
|---|---|---|
| Passport with no ID-back document | Change to Driver's License | Rejected: upload ID back |
| Pending funding with deferred evidence | Funding now available, bank certificate selected | Rejected: upload funding evidence |

`prepareApplicationChange` validates document requirements before saving the pending request, but the details editor has no attachment flow for that change. Applicants cannot initiate the request that would let staff assess the new evidence.

**Fix:** let the request enter a clearly incomplete/pending-verification state and associate a secure document request, or provide an atomic change-plus-evidence workflow. Keep the original accepted answers and approval restrictions until evidence is verified. Do not weaken final approval requirements to bypass this dead end.

### P2 — Third-party details require their own handling decision

**Evidence:** the form accepts co-applicant contact data, an optional emergency contact, household/landlord documents and optional reference letters. The main applicant's checkbox is not independent verification of another person's authority or awareness.

**Fix:** remove emergency-contact collection from initial assessment unless its purpose is established. Give co-applicants their own notice/verification route where appropriate, explain authority to submit other people's data, and minimize third-party information in address/funding evidence. Keep the existing instruction not to upload someone else's ID. Define how staff respond to a third party's access/correction request.

### P2 — Local drafts remain a shared-device risk

**Evidence:** `applicationDraft.js` uses localStorage for answers and IndexedDB for files. Seven-day expiry is evaluated when the application next opens; it is not an OS-level timed deletion. There is no application-level encryption of these stores. Draft saving happens before final legal acknowledgement, although a notice is available before data entry.

**Fix:** offer an explicit “save on this device” choice and a session-only mode, discourage shared-device use, minimize retained ID data, and test cleanup denial. Explain the deletion timing accurately. Browser storage is not automatically unlawful or publicly readable, but same-origin script compromise or another person using the device increases exposure. Adding a key stored beside the data would not meaningfully solve that risk.

### P2 — Files need security and authenticity controls with accurate claims

**Evidence:** type/size/signature checks, private storage, image re-encoding/metadata removal and signed reviewer links exist. `DOCUMENT_SCAN=off` can explicitly bypass malware scanning, including production. Live scanner configuration was not read or verified. `documentImages.js` returns PDF files unchanged; image metadata removal therefore must not be advertised as PDF sanitization. Direct-upload raw temporary objects also need cleanup verification.

**Fix:** demonstrate the deployed checks and reviewer download permissions, activate malware protection or an approved equivalent, establish safe PDF handling and redaction instructions, and verify temporary-object cleanup. A syntactically valid image or a clean malware result does not establish a genuine government ID, real balance or authentic applicant. Staff verification remains necessary.

### P2 — The new verification process is staff-attested, not automated

**Evidence:** identity/email change acceptance checks staff-supplied verification flags and a method note. It does not send or validate an OTP in this workflow. Original email confirmation is matching two entries, not proof the applicant owns the inbox. Pending history stores previous/proposed category values, including sensitive identity/funding details.

**Fix:** define a verified-channel challenge and secure staff recovery procedure, retain minimal verification evidence, and provide a reviewer interface that cannot imply verification happened automatically. Minimize history snapshots to the necessary changed fields where possible. Review how a newly accepted government ID invalidates/replaces old evidence. Complete the reviewer-app integration and receipt/status-notification delivery tests before claiming these workflows are operational.

### P2 — Unrestricted onboarding requests can reintroduce overcollection

**Evidence:** staff can assign free-text requirements, purpose, instructions and file evidence to an approved application. Only staff confirm completion, which is appropriate. But an arbitrary typed purpose is not evidence that the requested document is necessary.

**Fix:** provide an approved requirement catalogue with allowed documents/pages/redactions, assignment roles, exceptions and retention. Include secure handling for evidence and clear payment/contract boundaries. Test a reviewer asking for an inappropriate document and show the organizational control that prevents it.

### P2 — Completion claims, workload and friction need evidence

**Evidence:** nine steps include three required essays totaling at least 250 words, plus exactly three brand values. The opening modal estimates 25–35 minutes. Package prices are quotation-only. The code does not establish a validated selection rubric, a measured completion-time study, final fees, final eligibility or actual staffing/response commitments.

**Fix:** time representative applicants, including a mobile user without employment history or a site. Compare required essays with shorter decision-relevant prompts and a reviewer scoring guide. Validate optional/conditional paths, response commitments and quotation disclosures with the owner. Avoid promises of approval, return on investment, verified identity or guaranteed opening dates.

## Nine-step review map

| Step | What is useful now | Remaining challenge |
|---|---|---|
| 1. Initial fit | Investment, territory and timeline questions | Explain how answers affect next steps; permit exploration without implying eligibility approval. |
| 2. Identity/contact | Structured fields and conditional partner details | Collection timing, marital status, third parties, verified contact ownership. |
| 3. Experience | No-employment path and repeatable history | Explain what history changes in assessment; minimize optional personal details. |
| 4. Funding | Available versus pending funds and deferred evidence | Sensitive declarations, evidence timing, real reviewer verification and update dead end. |
| 5. Brand fit | Operational expectations and motivations | Essay burden and a defensible evaluation rubric. |
| 6. Franchise plan | Quotation-only packages and no-location path | Approved package/eligibility policy and consistent downstream reassessment. |
| 7. Documents | Camera/upload alternatives, previews, size rules, redaction guidance | Initial necessity, portrait duplication, non-Passport back exceptions, PDF/scanner controls. |
| 8. Agreements/privacy | Notice, public contact and acknowledgements | Specific background-check language, owner-approved agreements, server acknowledgement evidence. |
| 9. Review/submit | Review/edit, guarded retries and receipt-only success | Prove live uploads, retries, cleanup and reviewer-app notifications together. |

## Existing safeguards worth demonstrating

- Shared frontend/backend validation and reconciliation of repeated current answers.
- Removing a co-applicant clears inactive data from the current draft/submission.
- Passport identity-page-only handling; named Other IDs and issuer details.
- Household/landlord address explanations and pending-funding alternatives.
- Required-document/size/type validation, resumable uploads, retry identity and valid-receipt checks.
- Private document access with authenticated staff checks and short-lived signed links.
- Rate limiting and server-validated Turnstile integration points; actual production configuration still needs evidence.
- Public privacy contact and a documented privacy-request process.
- Revision conflicts and an audit history for application changes.
- Material changes to approved cases require reassessment; applicants cannot mark onboarding reviewer-complete.

These are positive controls, not a compliance certificate. Some live services and the new migrations remain unverified here.

## UI work completed in this pass

Scoped to `ApplicationFollowup.jsx`, its new stylesheet and the inaccurate status-page privacy sentence. Existing application questions, requiredness, document policy and legal text were preserved.

- Reused the franchising page's typography, cream/white surfaces, crimson accents and rounded controls.
- Added compact disclosure sections, legible statuses, readable option labels and current/proposed answer comparisons.
- Presented request history with timestamps and reviewer feedback.
- Added actual reviewer-confirmed checklist progress, assigned responsibilities, schedule/contact details and conversation layout.
- Hid inapplicable co-applicant/Other-ID/pending-funding subfields in the update editor.
- Used appropriate phone/email input types, character guidance, disabled/no-change states and visible keyboard focus.
- No animation library or external UI dependency added; disclosures do not require decorative motion.

## Verification and limitations

- `npm test`: **223 passed, 0 failed** after rerunning outside the sandbox, which had blocked localhost test traffic.
- Production build passed outside the sandbox; the first sandbox build failed reading an installed CSS dependency (`EPERM`).
- Final lint completed with only two pre-existing unused-variable warnings: `PageLoader` in `App.jsx` and `BiNavigation` in `RoutePlannerModal.jsx`.
- Browser: synthetic local-only follow-up harness using the real component/CSS and mocked responses. Verified load, keyboard picker navigation, contact correction, history and mark-ready → submitted. At **390px and 320px**, measured document width equaled viewport width. These measurements cover this harness and tested states, not every page/device.
- Saved synthetic desktop screenshot: `docs/qa/followup-desktop-2026-11-05.jpg`.
- The repository does not contain the parent UX kit's token/axe/responsive gate scripts. No WCAG certification or full screen-reader pass is claimed.
- This was not a new live application submission, real document upload, Supabase migration deployment, email delivery test or classmate-app acceptance test.

## Before telling the panel it is complete

1. Obtain owner-approved collection purposes, stages, agreements and decision criteria.
2. Apply and live-test the local fixes for document-dependent corrections and staff onboarding expiry, including the reviewer evidence controls.
3. Enforce notice-version evidence and settle portal/session and staff-permission controls.
4. Apply migrations in order to the shared test project and connect the staff review UI.
5. Demonstrate application → receipt → review → correction → reassessment → onboarding with synthetic data, including rejected/expired/unauthorized cases.
6. Demonstrate one privacy request and one complete retention deletion, including external-copy handling.
7. Confirm operator/controller identity, designated privacy responsibility, provider arrangements, incident response, applicable registration obligations and staff training. Repository text alone cannot establish these organizational facts.

The defensible presentation is: “The website implements these safeguards; these business decisions and integration/security checks still need completion.” Avoid saying “DPA compliant,” “all files verified,” or “fully secure” based only on passing local tests.
