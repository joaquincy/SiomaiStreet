# Homepage store finder — implementation and activation

Added immediately after Featured Menu, on the existing warm-white background with an inset brand-color panel. No new page, applicant location collection or invented public branches.

## Latest refresh — 31 October 2026

The latest reference-inspired treatment uses a crimson poster on the homepage's cream background, oversized Outfit headings, cream/yellow typography, a prominent selected-store address, and a rounded map frame alongside it. Branch browsing sits below; Change store moves focus to it. Directions/calling stay prominent while secondary copy/share actions live in a native disclosure. Mobile retains List/Map controls with focus movement, and all location/search/directions behavior below remains intact.

The map illustration is lightweight SVG and explicitly labeled as an illustration. It is not live geography or a fabricated branch pin. Real Google basemap colors are configured through Google Cloud styling after activation. Use the [short activation checklist](./store-finder-activation-checklist.md).

Added or improved:

- City shortcuts from published metadata; search across names, addresses, regions and landmarks; reset filters; explicit nearest/name sorting after location permission.
- Cancellable location lookup, an independent timeout for unanswered permission prompts, rejection of late callbacks after cancellation/unmount, and approximate distance labels. No device coordinates are stored or sent to the directory or added to Google directions links.
- Numbered Google markers matching list numbering, consistent selection, keyboard-clickable markers, separate selection versus fit-all behavior, and marker reuse when merely fitting the map.
- Maps does not initialize inside a hidden mobile panel. Loader/initialization failure keeps the directory and directions available. Close/reopen support and cleanup for map listeners, markers, observers and timers.
- Address copy, native sharing with copy-link fallback, explicit Copy store link, and homepage links of the form `/?branch=<public-id>#stores`. Missing shared branches receive an explanation.
- Driving, walking and transit directions; published phone, hours, holiday note and landmark; honest missing-data messages. No inferred “Open now”, travel-time or service claims.
- Keyboard jump to selected details, live selection/action feedback, visible focus, minimum 44px action targets and reduced-motion support.

Current verification: 19 store-finder tests pass, including new filtering/sorting, sharing, travel modes, cancellation/late-callback/timeout and rendered recovery-state checks. Targeted lint and production build pass. No production database changes or fabricated locations were introduced.

Live boundaries: browser access is disabled, so this refresh has not received visual/mobile or real map-marker interaction QA. Local configuration inspection confirmed both `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID` are absent. The approved live coordinates, Google configuration and private/public data publishing still require the integration steps below. Do not present this as a validated live map yet.

Design reference requested: [Awwwards food-and-drink directory](https://www.awwwards.com/websites/food-drink/). Technical references: [Google marker accessibility](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers), [Google Maps directions URLs](https://developers.google.com/maps/documentation/urls/get-started).

## Implemented

- City/address/branch/landmark search, accent-insensitive matching, optional region filter and clear filters.
- Branch list and selected branch details, address, approved hours/holiday notes, phone links and Google directions.
- Map/List switch on mobile. List remains usable without Maps, location permission or browser storage.
- Optional location permission; distance sorting is computed locally, shown as straight-line distance, and never persisted or sent to the directory API. Search filters remain in effect.
- Google Maps loads only after “Explore the map”; advanced markers and list selection share selection state. Map failure leaves list and directions available.
- Near-viewport directory fetch, cancellation/timeout, retry, empty/no-results states, one SDK load, listener/marker cleanup, reduced-motion CSS.
- Public API field whitelist, active-branch filtering, approved extended details only, paginated reads and 60-second server cache with concurrent-request deduplication.

## Configure later (owner/classmate)

1. Apply `supabase/migrations/20261031000000_store_locator_profiles.sql` to the agreed test Supabase project first. It references the existing `public.branches(branch_id integer)` table; it does not create a second database or modify the existing reviews endpoint.
2. Through the authorized app backend, add a profile for each existing branch. Confirm `city`, `region`, `landmark`, `public_phone`, `hours_note`, `holiday_note`, `latitude`, `longitude`, and optional `google_place_id`. Coordinates must identify the actual store entrance, not a city centroid. Set `published=true` only after review. No browser write policy is granted. The classmate must implement role-checked staff publishing through their backend; do not put service credentials in the app client.
3. Existing Active branch names/addresses are already public through `/api/branches`. The new `/api/store-locations` continues showing these basic details when a profile is absent/unpublished or the new table has not been applied. Unpublished extended details never appear. Inactive branches never appear. No fallback for database permission failures: those produce a safe 503. Review the existing Active records before public launch.
4. Set these in local/deployment frontend configuration, then restart Vite or rebuild:

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=your_restricted_browser_key
   VITE_GOOGLE_MAPS_MAP_ID=your_javascript_map_id
   ```

   Enable Maps JavaScript API and the appropriate Google billing project. Restrict the browser key by authorized HTTP referrers (development and production) and API. The browser key is intentionally client-visible; it is not a Supabase service key. Use separate development/production restrictions, quotas and budget alerts. Do not use `DEMO_MAP_ID` for the launch configuration.

5. If hosting uses CSP, allow the Google Maps domains required by Google's current CSP guidance. Verify an authorized production origin and an unauthorized origin. Keep Google attribution and controls visible.
6. The backend needs the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. A static-only Vite deployment needs a backend/proxy for `/api/store-locations`, like the site's other API routes.

## Public contract

`GET /api/store-locations` → `{ "stores": [...] }`, each store contains only `id`, `name`, `address`, `city`, `region`, `landmark`, `phone`, `hours`, `holidayNote`, `position: {lat,lng} | null`, `placeId`.

- No hours are guessed, and no “Open now” claim is made from an unstructured schedule.
- No automatic geocoding or Places search charges. Search is across the own-branch directory.
- Directions work with an address when a confirmed pin is absent; phone buttons appear only for a dialable number.
- Updates can take up to 60 seconds to appear because of the server cache. Deactivate a branch in the existing app to remove its basic listing.
- Applicant proposals, internal financial data, contact persons and private notes are excluded.

## Verification and remaining checks

Validation on October 31, 2026: all 53 repository tests passed, including 12 new store-finder tests; the Vite production build (in-memory output) and targeted lint passed. The suite needed a rerun outside the sandbox for existing localhost HTTP/scanner integration tests. Vite emitted a non-fatal shared HMR-port warning during parallel SSR tests.

Automated coverage includes public/private field separation, inactive/unpublished records, malformed coordinates, search, distance calculations, URL/phone safety, pagination, request coalescing/cache expiry, service failure/retry, missing-migration compatibility, SDK load deduplication/retry, and server rendering without a configured Maps key.

Browser access was disabled during implementation. Live Google credentials, migration application and real branch pins were deliberately left for the classmate per the user's instruction. These remain **unverified**, not completed:

- 320/390/768/1440px layouts, 200% zoom, touch, keyboard and screen-reader announcements.
- Real branch-marker selection ↔ list/details, Google zoom/fullscreen/attribution, all-results fit and mobile Map/List switching after filtering.
- Permission denial, timeout and clearing device location on a real browser.
- API outage/retry, missing metadata, no matches, zero branches and blocked Maps script.
- Correct Google billing/key/map-ID configuration; no API requests before map activation.
- Staff authorization and public/private access against the integrated Supabase project.

Use synthetic fixtures in tests only. Never seed demonstration locations into the production public directory.

References: [Maps loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [advanced markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview), [key/billing errors](https://developers.google.com/maps/documentation/javascript/error-messages), [CSP](https://developers.google.com/maps/documentation/javascript/content-security-policy).

## Compact finder update — October 31, 2026

- Reduced the heading to a 50px maximum and the map minimum height from 460px to 300px; kept 44px or larger primary touch targets and 16px search text.
- Kept directions, travel modes, calling, address and landmarks immediately available. Hours, holiday notes and contact information now use an accessible native disclosure; sharing remains expandable.
- Added Previous/Next controls over the filtered results, with endpoint disabling and a position indicator. Selection announcements remain available to assistive technology.
- Branch cards are expandable; searching, changing region, choosing a city or using Change store reveals the directory. Error/loading/empty results remain expanded for recovery.
- Removed the large decorative introduction and repeated footer slogan; moved the menu shortcut into the compact heading.
- Scope: presentation and local navigation only. Existing public data projection, on-demand Google loading, location cancellation, private-location handling and API contracts are preserved.
- Validation: scoped 19-test suite, targeted lint and production build. Browser preview still reports disabled; responsive appearance, disclosure focus/touch interactions and live Google Maps need browser verification. Activation requirements in the separate checklist still apply.
