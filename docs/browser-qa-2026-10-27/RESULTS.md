# Synthetic browser acceptance results

27 October 2026. Tested the built website in the in-app browser against the isolated localhost harness on port 4187. No Supabase, real applicant, email delivery or actual storage service was involved. Existing synthetic answers were seeded through the harness UI; subsequent changes and submissions used the real application UI.

| Requested check | Observed result |
|---|---|
| Package selection and quotation-only pricing | Homepage showed three quotation-only cards. Application selection changed from Food Cart to Kiosk using Enter, then Casual Dining using Tab and Space. Undecided selection was accepted. |
| No employment / no location | No-history choice removed employment entries. Application advanced with no specific location and no selected site type. Review and saved server record retained the no-history choice. |
| Missing fields and document errors | Blank city blocked advancement with Target City error. Removing ID front produced a named missing-file error. TXT and empty PDF were rejected. Nonempty synthetic PDF accepted. |
| Review/edit | Review showed full answers and filenames. Edit Franchise Plan returned to the correct step with answers retained. Subsequent steps returned to review. |
| Successful submission and clearing | Direct submission returned receipt 00a654ee-157e-4bdd-b56b-3867fd685421. After the earlier retry success, reload started at step 1 with no answers. Harness storage inspection showed answerKeys: [] and documentCount: 0. A new empty draft envelope was created on reload, as expected. |
| Failed receipt and retry | Harness saved application but returned invalid receipt. UI showed failure and retained draft. Reload preserved answers. Retry returned reference 2378e03a-a51a-42f4-86fe-9938433e86bc. Filesystem inspection before and after retry showed exactly one matching application record. |
| Mobile and keyboard | Package cards inspected at 390px. At 320px, application tabs caused document width 354px. Added horizontal scrolling to the tab container; retest measured document width 320px at viewport width 320px. Package Enter/Tab/Space interactions worked. Desktop quotation cards visually inspected at 1280px. This is targeted coverage, not a full accessibility or cross-browser certification. |

## Fixes made

1. Application.css: constrain sub-navigation overflow within its own scrolling container.
2. FinancialCapability.jsx: replace the false browser-session-only claim with accurate draft-storage/submission wording.
3. Local test harness: add a read-only UI button for inspecting draft answer keys and document count.

Production build passed after fixes. Oxlint retained the existing unused `hasNew` warning in useScrollReveal.js. These changes do not alter submission rules or backend behavior; the six automated groups passed in the preceding verification.

## Evidence and limits

- homepage-packages.jpg: desktop quote cards.
- mobile-packages.jpg: selected kiosk at 390px.
- failed-receipt.jpg and success-receipt.jpg: mobile captures; the success image captures only the upper part of the receipt screen. Full reference values above were verified in the accessibility tree and local records.
- draft-cleared.jpg: harness storage inspection.

Browser access was disabled in Work settings when final screenshot capture was attempted after the interruption. The final desktop success screenshot and final viewport reset could not be completed. Earlier observations remain recorded; no additional browser verification is claimed after access was disabled.

Real Supabase persistence/uploads, admin-app review, notification delivery, production security and business-policy approval remain outside this local test. Existing placeholder contacts and unsupported marketing claims elsewhere on the homepage still need review before launch. The local harness intentionally simulates upload storage and preloads test-only acknowledgments; it does not execute legal agreements.
