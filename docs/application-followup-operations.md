# Application updates and personal onboarding

Implemented locally, updated 5 November 2026. Apply the migrations and connect the reviewer
app before treating this as live. No production database was changed.

## Activation

1. Apply earlier migrations, including the document-policy and privacy-retention
   migrations, then `20261104030000_application_followup.sql`, then
   `20261105000000_followup_evidence_and_staff_access.sql` to the existing shared
   Supabase project. If the earlier migrations are already applied, run only the
   new migration. Apply before deploying: upload-session reads use its new column.
2. Deploy frontend and backend together. Existing portal/upload secrets remain;
   there are no new provider keys or email workers for these two features.
3. The classmate's admin app must connect the staff endpoints below. Staff sign in
   with Supabase Auth and must be enabled in `franchise_document_reviewers`. Never
   put a service-role key in the client. Staff identities come from verified tokens.
4. Test synthetic corrections, rejection, evidence upload and review with both apps.
   Check the same reference appears in each; confirm private Storage access and
   the existing cleanup/retention workers against actual services.

## Applicant experience

Track Status → sign in with the existing reference/code → Load my details under
Your details & next steps. Open Update my application details or My onboarding.
The public onboarding guide remains, with a link to this private experience.

Phone/contact preference saves immediately. Location/package/funding/timeline,
identity, co-applicant and registered-email requests remain pending until reviewed.
Current/proposed answers, reason, state and reviewer feedback remain visible.
Government ID numbers are masked in the read projection. Sensitive answers are
not persisted to localStorage. Unsent edits survive a refresh of details but not
leaving/reloading the page. Five write attempts per five minutes per network;
the existing status and upload quotas also apply.

For identity/funding changes, field validation runs before the pending request is
saved. Missing required documents do not block that first step. Change history
opens and lists the supporting files to attach, with the existing camera/file,
preview and confirmation controls. All listed files must be sent together. The
files stay in page memory until sent, with no new browser-draft persistence.

Changing the ID or relevant identity details requires evidence of the proposed
identity (front and back for a non-Passport, identity page for Passport). Changed
residential addresses need address evidence; non-deferred funding changes need
funding evidence. Related requirements still apply. Nothing is automatically
accepted: uploads use the existing private quarantine, byte/size/type checks,
image processing and configured scan policy, then remain attached to the pending
request. Current answers and documents change together only upon staff acceptance.
Requests marked changes-needed cannot receive more files; read the feedback and
send a new request. Existing pre-migration requests do not gain inferred evidence
requirements automatically; staff should return any such request needing new
evidence as changes-needed and ask for a new request through the upgraded editor.

Only approved applications without pending reassessment can act on assigned
onboarding requirements. Each has instructions, purpose, responsible person,
monitored contact, an optional confirmed date and an evidence mode (`ready`, `note`,
or `file`). File mode accepts one PDF/JPG/PNG up to 10 MiB through private direct
uploads, using the existing scanner configuration. No scanner setting was changed.
Applicant submission never means reviewer-confirmed completion. Clarification
questions and reviewer replies remain in the portal; no new email delivery is implied.

## Reviewer integration contract

Use `Authorization: Bearer <staff Supabase access token>` and JSON content type.
Base: `/api/staff/applications/{applicationId}/followup`.

| Method/path | Body / result |
|---|---|
| GET base | Current revision, applicant-safe grouped answers, change history, assigned items and discussion |
| POST `/changes/{changeId}` | `{revision, decision: "accepted" or "changes_needed", note, verification}` |
| POST `/change-evidence/{changeId}` | `{documentKey: "govIdFront"}` (or another listed key) returns a private 60-second URL after authorization and document checks |
| POST `/onboarding` | `{requestId: UUID, details: {title, instructions, purpose, evidenceMode, responsible, contactName, contactEmail, dueAt: ISO timestamp or ""}}` |
| POST `/onboarding/{itemId}` | `{requestId: UUID, revision: item.revision, action: "complete", "needs_correction" or "reply", note}` |
| POST `/evidence/{itemId}` | `{}` returns a private 60-second URL after authorization and document checks |

Each change now includes `documents: [{key, label, received, name}]`, without object
paths. Render the document list and use the change-evidence endpoint to view each
received file before deciding. The acceptance API rejects missing/unchecked
supporting files. Keep technical file checks distinct from human verification of
identity, authenticity and available funds. Scan-off files remain explicitly
unscanned; these fixes do not change the operator's scanner setting.

Applicant upload start: `POST /api/application-status/{applicationId}/changes/{changeId}/uploads`
with the existing portal bearer code and `{version, requestId, manifest}`. The
existing upload authorize/check/finalize endpoints finish the transfer. The
receipt is `{id: changeId, requestId, status: "received"}`; retries with matching
content keep the same requestId and reuse the existing evidence. Different
content cannot overwrite a received evidence set. Only keys required by that
specific pending request can be uploaded.

Identity/co-applicant acceptance requires verification `{identityChecked:true,
method:"description of the actual verification performed"}`. Email acceptance
requires `{newEmailVerified:true, authorization:"existing_verified_channel" or
"staff_verified_identity", method:"description of both actual checks"}`.
These are staff attestations, not an OTP implementation. Staff must actually
confirm control of the proposed address through a challenge and authorize the
change through the previously established channel or proportionate identity checks.
Do not set these flags merely because the applicant typed an email. Do not record
passwords, challenge codes, private portal codes or copies of ID documents in notes.

For ordinary edits the backend revalidates related answers. On conflicts it returns
409 without overwriting the record. Refresh and compare; do not auto-retry with a
new revision. The staff acceptance endpoint also checks that the originally
affected answers have not changed since the request. Keep request UUIDs stable
on retries; new intent needs a new UUID. Staff must resolve pending changes before
reapproving a case. Accepting a material change to an approved case moves it to
under_review for an explicit new decision, and pauses onboarding.

The assigned checklist is intentionally empty until staff creates applicable tasks.
No fees, agreements, payments or dates are generated from package selection. The
admin app should expose assignment, decision and reply buttons using this contract;
that separate application's code is not in this workspace.

## Data and operational boundaries

New private tables: franchise_answer_changes, franchise_onboarding_items and
franchise_onboarding_events. RLS denies public/authenticated direct access; bounded
server endpoints perform ownership/role checks. Existing answers/summary columns
stay synchronized, preserving classmate-app compatibility. Answer revisions and
item revisions prevent stale overwrites. Records capture applicant actions and
verified staff identities without trusting client-provided reviewer IDs.

The migration extends retention inventory to onboarding evidence, including prior
submissions, and change-request evidence/previous document references even after
temporary upload sessions are removed. It recognizes only these known new foreign keys. Histories cascade
only after the existing erasure workflow removes inventoried private files.
External copies still follow the privacy operations guide.

Applicant recovery, 90-day expiry, renewal and application-email ownership are
unchanged. Authorized staff onboarding assignment, replies and decisions use a
separate SQL guard and do not inherit applicant expiry or revocation. Enabled
staff permission, approval, reassessment, closure and erasure checks remain in
force. This does not renew expired applicant access. Closed applications go
through monitored support, not ordinary portal edits.

## Verification

Earlier local checks: 223 tests passed, production build passed, and lint completed
with only the two pre-existing unused-variable warnings. The repository does not
contain the parent UX kit's validate_tokens.py or axe_audit.mjs gates; no gate-based
accessibility score is claimed.

Automated tests execute migrations and transactions using local PostgreSQL/PGlite,
including authorization denial, stale edits, retry receipts, staff-only completion,
onboarding evidence and retention inventory. Existing direct-upload tests cover
the shared byte validation/scanner pipeline. Desktop browser checks used a temporary
synthetic-only harness: load details, current/proposed phone correction, save
feedback and mark-ready-to-submitted transition. This does not prove live Supabase,
real file transfers, reviewer-app integration or mobile/screen-reader behavior.
Complete those integration checks before public activation.

5 November bug-fix checks: the final full suite passed **227 tests, 0 failed**
outside the sandbox (localhost test connections were blocked inside it). The
production build passed; lint reported only the same two existing unused-variable
warnings. A non-fatal test Vite WebSocket port-conflict warning also appeared.
The new integration tests execute the actual client upload helper, API handlers,
repository and migration SQL using synthetic files and mocked storage/scanner
services. They cover both original dead ends, rejected scans, incomplete/extra
files, mismatched request references, retries, stale revisions, unchanged current
records before acceptance and retention inventory. Separate tests cover staff
onboarding after applicant expiry/revocation, disabled staff, closure, erasure,
reassessment and denied public RPC access. Browser testing of the newly added
attachment controls is still unverified: Work settings reported browser access
disabled during this pass. No live Supabase or provider changes were made.
