# Map and Helpful verification, November 3, 2026

## Map changes

- Fixed the browser `Illegal invocation` exception in both map-request and location timers. Default timer wrappers now retain their required global receiver. Cancellation and timeout tests remain in place.
- Removed render-triggered automatic route searches. Each field has Search, selectable results, a selected-state indicator, and Clear. Typing alone does not resolve a place into coordinates.
- Every branch exposes Directions on map. A published pin preselects the destination; an unpinned branch supplies its address as a search suggestion and requires confirmation. No real coordinates were invented or written to the database.
- Search results expose Directions to here. The planner can also select either endpoint on the map, using a click or the keyboard-accessible map-center control.
- Removed repeated explanations, example chips, redundant location/directions controls, region/sort dropdowns and travel-mode controls outside the modal. Retained search, branch browsing, hours/contact/share details, map gestures and external Google Maps access. Nearby sorting uses straight-line distance; routing uses the provider response.

## Verified

- Real browser on localhost: address result selection and route request from Daet to Mercedes. Embedded map drew A/B and a route; provider returned 7.1 km and approximately 11 minutes. These are test-time estimates, not live traffic.
- Local synthetic pinned-branch fixture: Directions on map prefilled its destination; selecting a start and submitting drew the route to that pin (6.3 km, approximately 9 minutes).
- Confirmed the live directory currently returns two unpinned branches. The unpinned path opens a search suggestion instead of claiming an exact location.
- Browser keyboard activation of Search, result selection and Show Route; missing start moved focus to From. Map-center selection returned to the planner. Escape closed the modal.
- At 375 × 812, inspected the modal. At 320 × 640, measured document width 320 and dialog scroll width 285; no horizontal overflow in that tested state. The shorter screen uses modal scrolling.
- Helpful fixture: simulated response loss after acceptance, safe retry resulting in count 1, disabled Marked helpful state, and refresh restoration. No real customer review was voted on.
- Local PostgreSQL-compatible tests executed the new migration, preserved old totals, deduplicated repeated tokens, rejected unpublished reviews and checked anonymous permissions. This does not establish hosted Supabase activation.
- Final `npm test`: 136 passed, zero failed. Sandbox blocked local HTTP connections initially; rerunning with the approved network context passed.
- Production build passed. Targeted JavaScript lint and Git whitespace checks passed.
- Source checks passed for emoji and native selects on the targeted map/Helpful components. The existing StoreFinder/Reviews stylesheets do **not** pass the strict design-kit token audit: it reports 1,119 hardcoded values across these two stylesheets. This task does not certify a full design-system or WCAG audit.

## Still required

1. Apply `supabase/migrations/20261103000000_review_helpful_votes.sql` to the existing shared project before deploying the updated Helpful endpoint. See `docs/reviews-helpful-setup.md`.
2. Publish verified coordinates for real branches to enable automatic exact branch destinations. An address search is not confirmation of a franchise location.
3. Deploy this commit and smoke-test the production origin. No deployment or remote migration was performed here.
4. Real-phone permission prompts, mobile keyboards and screen-reader speech still need device testing. Location permission denial/cancellation/timeout logic is covered by automated tests; this browser session did not request the user's precise location.

Local-only browser fixtures are `tests/browser/store-directions.html` and `tests/browser/helpful.html`, served by Vite during development. They are not production build entries. The Helpful fixture simulates an API and stores synthetic test state locally; it does not demonstrate live Supabase connectivity.
