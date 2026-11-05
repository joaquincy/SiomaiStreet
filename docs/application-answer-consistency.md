# Application answer consistency and co-applicant cleanup

Implemented locally on 2026-11-04. Scope: the two reported application defects; no redesign or unrelated business-policy changes.

## Current behavior

| Answer | How it works |
| --- | --- |
| Available capital | Step 1 collects an estimate. A valid exact amount in Step 4 updates that range. Returning to Step 1 shows the amount and a link to edit it. |
| Business ownership | Asked in Step 1; Step 3 displays the same answer with an edit link. |
| Franchise format | The Step 1 preference carries into Step 6. Comparing/changing formats there updates the same preference. |
| Region | Step 6 has an editable region dropdown synchronized with Step 1. Applicants should review their city after changing regions. |
| Opening timeline | Step 6 shows all five existing timeline choices directly and synchronizes edits with Step 1. “Within 6 months” still needs refinement to within three months or three to six months. Longer and exploratory plans remain selectable here. |
| Co-applicant | Selecting No removes their details from form state. Draft saving/restoration, client submission and backend sanitization also exclude inactive co-applicant details. Selecting Yes again starts with empty partner fields. |

Older drafts with two conflicting populated answers retain those answers for explicit correction and show a notice plus linked errors. Missing legacy aliases are filled from the existing answer. The backend rejects conflicts instead of trusting browser synchronization. Pending upload sessions created before this fix are checked again before finalization; already received applications retain their receipts and safe retry behavior.

## API and deployment notes

- The answer-consistency fix alone requires no new SQL migration or environment variable. The subsequent Passport document fix does require a migration; see [Passport setup](passport-document-requirement.md). Deploy the frontend and backend changes together.
- Existing field names remain for the connected admin app: `ownedBusiness` / `priorBusinessOwned`, `franchiseType` / `selectedPackage`, `territory` / `targetRegion`, and the capital/timeline fields.
- `planOpeningTimeline` now additionally accepts `1-2-years`, matching the already available Step 1 choice. The admin app should display this as “1 to 2 years” if it uses a fixed label map.
- Previously submitted records are not rewritten. Existing database records containing conflicting or inactive partner details need a separate, authorized review.
- No new dependency was added. Finalization fetches the saved answers once for validation; routine upload authorization/check requests continue fetching session metadata only.

## Verification

5 November UI update: Step 6 now exposes package cards, the region dropdown and
all timeline choices without sending the applicant back to Step 1. The targeted
answer-consistency/render checks passed (10 tests), build passed, and lint retained
only the two existing warnings. Browser access was disabled, so the new controls'
browser interaction and responsive appearance remain unverified. Requirements,
available choices, synchronization logic and database contracts did not change.

Original answer-consistency verification:

- `npm test`: 196 passed, 0 failed, 0 skipped. Includes conflict rejection, amount boundaries, timeline changes, legacy drafts, privacy filtering, rendered form states, local SQL finalization and retry uniqueness.
- `npm run build`: passed.
- `npm run lint`: passed with two existing unused-variable warnings (`PageLoader` and `BiNavigation`).
- `git diff --check`: passed.
- Browser: the local application loaded and the welcome modal was dismissed. Browser access then became disabled, so the full click-through, keyboard/focus and responsive checks remain **unverified**. The repository's browser-based design gates were not completed. Python-based gates were unavailable because the installed command aliases could not run; no theme/token changes were made.
- Live Supabase and production submission were not tested or changed during this task.

## Remaining browser checks with synthetic data

1. Choose Step 1 values, reach Steps 3/4/6, and confirm summaries match. Use each edit link and verify both the form and final review reflect the change.
2. Change exact capital across range boundaries; verify its Step 1 range follows. Confirm the old-draft conflict notice disappears only after all conflicts are resolved.
3. Select one-to-two years and just exploring; verify no contradictory short timeline is requested. Select within six months and choose a refinement.
4. Enter a synthetic partner, select No, allow draft saving, reload and review. Their details must be absent. Select Yes again; the fields must be empty and required.
5. Complete a synthetic submission and retry a lost response; verify one application and a valid receipt. Check keyboard activation and focus targets for the new edit links and conflict errors.
