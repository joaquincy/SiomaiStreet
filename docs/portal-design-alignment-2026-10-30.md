# Portal alignment with Submit Application

Track Status and Onboarding now reuse the application design classes for the top navigation, page headings, white form sheets, field inputs, requirement indicators, helper cards and primary buttons. Portal-specific styling uses the existing `--app-*` tokens rather than a separate palette.

- Same maximum page width, desktop main-sheet/sidebar proportions, compact bold headings, input typography and crimson pill actions.
- Onboarding remains a preparation guide with expandable stages; its existing route and links remain available.
- Main content precedes helper guidance in both visual and keyboard order. Layouts stack at the existing application breakpoint; phone inputs retain 16px text.
- Existing tracking authorization, correction submission and retry behavior are unchanged.

Validation: Vite compilation and targeted lint passed. Eight render/portal tests passed. Desktop Track Status and Onboarding were inspected in the local browser; the tracking screenshot is `tracking-aligned-2026-10-30.jpg`. The browser subsequently reported that local browser use was disabled, so the final mobile and accordion interaction checks for this revision could not be completed. Earlier mobile checks apply to the previous design, not this revision. No live authenticated status or correction upload was exercised.
