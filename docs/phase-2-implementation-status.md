# Phase 2 implementation status

27 October 2026. Local implementation, not deployed. Owner approval is still pending.

The user authorized justified website improvements and explicitly selected quotation-only pricing. This is not approval of the proposed commercial, legal, document or retention policies.

## Implemented

- One shared package catalogue: Food Cart, Kiosk and Casual Dining. Stable existing API identifiers retained.
- Quotation-only pricing on homepage and application. Lists items to confirm, not unverified inclusions. Removed fixed fee, no-royalty, payback and fixed opening/review-time promises from the affected package/FAQ/journey content. Unverified success stories are no longer rendered on the homepage.
- Undecided package and no-specific-site paths accepted by both frontend and backend. Preferred city/region remain required; site type required for an identified site.
- Explicit no-employment-history choice; clears employment entries with a visible warning in its label. Server rejects contradictory history. Employment/self-employment entries require role and company/business name.
- Per-step remaining-check disclosure; progress reflects steps passing validation rather than steps merely visited.
- Shared document definitions; named missing-file list; persistent upload errors; rejection of empty files; correct explanation of browser draft storage and transmission on submission.
- Review includes previously omitted answers, full essays and document filenames. Each section identifies outstanding validation issues. Checklist no longer claims that checkbox acknowledgments are signed documents or that locally selected files have already uploaded.
- Submission receipt explains that receipt is not approval, a contract or account activation.

## Owner decision checklist and remaining work

| Decision | Current treatment | Still needed |
|---|---|---|
| Packages, prices, inclusions, exclusions, fees | Quotation-only; unconfirmed inclusions removed from package cards | Owner-costed catalogue, fee schedule, payment/refund terms |
| Eligibility, applicant types, operator expectations | Beginner/no-history and exploratory paths supported | Entity/representative requirements, manager plans, eligibility review |
| Required, optional, conditional fields | Live check lists and matching server validation | Approval of reduced intake and any newly required fields |
| Document stages, alternatives, recency, redactions | Existing five required uploads retained; bank certificate/statement alternative explained | Approve staged collection, recency, redactions and a secure follow-up upload workflow |
| Background checks, agreements, privacy | Corrected storage and signing claims; development notice identifies unresolved privacy arrangements | Reviewed scoped authorization, actual controller/privacy contact and final notice; existing broad consent text remains a launch blocker |
| Contacts, staffing, response targets | No new timelines promised; removed unverified contact from success receipt | Verify all existing website contacts, staff capacity and service targets |
| Retention and access | No unapproved retention period or permission model implemented | Approved schedule, deletion jobs, app/database access controls and end-to-end testing |
| Reviewers, final approver, backups | No invented names or public staff roster | Owner assigns accountable people; classmate integrates authorized app workflow |

For each unresolved item, record **Approve / Revise / Reject**, exact replacement, approver and date in the owner pack. Do not treat this file as owner sign-off. Existing personal/ID/marital/emergency fields and required initial documents are not evidence that collection is necessary; review before real intake. Do not enter real applicant data during development.

## Integration notes

API contract version remains 1; existing package values remain valid. Additional supported values: `selectedPackage: not-sure`, `employmentHistory: provided | none`. Missing employmentHistory preserves legacy validation. No-history submissions require empty employment fields and no additional positions. Classmate must display these values correctly in the app. Application approval must not automatically grant operational account permissions.

## Verification

- Production build passed (101 transformed modules).
- Six Node test groups passed, including real localhost multipart submission, persistence, concurrency, lost-response recovery and retries. No Supabase or real applicant data used.
- Oxlint: one existing `hasNew` unused-variable warning in `src/hooks/useScrollReveal.js:68`.
- Git diff whitespace check passed; Git emitted line-ending conversion warnings.
- Initial browser preview timed out. Subsequent isolated browser testing succeeded; see [browser acceptance results](browser-qa-2026-10-27/RESULTS.md) for observed flows, fixes, screenshots and limits. This is not a full responsive/accessibility certification.
- Design-kit browser gates cannot be treated as passed: the kit reports Playwright unavailable. Token JSON source is absent; existing CSS is not a completed token-system migration.
- Scoped static gates: shared modules have no emoji; the updated package-step component contains no native select markup. The hardcode scan initially identified five existing values in four edited step components; these were replaced with existing CSS tokens and the scan rerun.

## Basis

Clear fee and responsibility disclosure is supported by [Executive Order 169](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/5/95014). Data collection must be justified by purpose and proportionality under the [Data Privacy Act](https://privacy.gov.ph/data-privacy-act/). Neither source establishes this business's prices, document ages, staff names or retention schedule. This implementation is not a legal-compliance certification.
