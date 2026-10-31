# Applicant portal UI refresh

- Track Status: responsive access form, show/hide code control, receipt help, status-specific next steps, refresh/sign-out actions, document request cards and existing replacement picker. Existing API authorization and retry logic retained.
- Onboarding: new `/application/onboarding` route, active navigation, five expandable preparation stages. Clearly identified as guidance pending owner confirmation, without invented personal completion, appointments, payments or approvals.
- Before you start: burgundy/ivory welcome composition, decorative application/store illustration, numbered checklist and compact document list. Existing session dismissal, draft restoration gate and reopen behavior retained.

## Checks completed

- Production compilation passed (124 modules); targeted component lint passed.
- Eight targeted tests passed: all-step rendering including the new onboarding page/navigation and existing portal access, replacement, quarantine and retry checks.
- Live local browser: desktop Track Status and onboarding views inspected; onboarding expansion and navigation worked; page titles updated.
- Synthetic invalid tracking input submitted by keyboard produced the receipt-details error. Show/hide code control worked by keyboard.
- Welcome opened after loading, Escape closed it and restored focus to the reopen control; reopening worked.
- Narrow layouts inspected at effective CSS viewport widths of 356px and 434px; document scroll width matched viewport width. The browser's scaling meant requested sizes were not exact 320px/390px tests. Mobile tracking form is ordered before the explanatory panel.
- Browser viewport override reset and test tab closed. Screenshots saved alongside this note.

## Boundaries

No real applicant status or replacement upload was exercised against the production services. Live authenticated results still require valid backend configuration and a synthetic test record. Onboarding is a public preparation page, not a database-backed task tracker. Real-phone keyboards, assistive technology and a full authenticated browser regression remain outstanding.
