# Store finder: Leaflet activation checklist

Updated 3 November 2026. This replaces the former Google Maps JavaScript setup. The homepage now uses Leaflet 1.9.4 with standard OpenStreetMap raster tiles. Google Maps is used only by the external directions links.

## What to configure

No Google Cloud billing account, Maps API key, or map ID is needed. Existing VITE_GOOGLE_MAPS_API_KEY and VITE_GOOGLE_MAPS_MAP_ID values are unused and may be removed from local/Vercel configuration. No new migration or database is required for this switch.

- Confirm the existing store_locator_profiles migration has been applied.
- In the existing shared Supabase project, link each profile to its branches.branch_id.
- Supply approved latitude/longitude, full address, city, region, landmark, hours, public phone and holiday exceptions. Never fabricate coordinates.
- Publish approved profiles with published=true and keep the branch Active.
- Verify /api/store-locations returns the intended public records. A missing pin remains in the directory and is excluded from the map and nearby calculations.
- Build and redeploy the website after these code changes. Supabase service credentials remain server-only.

## Performance and provider behavior

- The directory loads near the section. Leaflet JavaScript and CSS load only after Explore the map; there is no Google SDK request.
- A single map instance is maintained while open. Markers are reconciled by ID. Closing, switching away on mobile, or leaving the homepage removes map listeners, tiles, timers and resize observers.
- Map tiles come directly from tile.openstreetmap.org, not Supabase or Vercel Functions. The browser honors normal cache headers. No bulk downloads, offline tile caching, retina doubling or extra map plugins.
- Dragging/pinch/double-click are enabled after the visitor opens the map. Wheel zoom is an explicit toggle and defaults off. Pause gestures restores normal touch scrolling and stops wheel zoom. Zoom buttons and keyboard operation remain available.
- Reduced motion disables animated camera changes. Invalid coordinates are ignored. Failed tile batches return to the directory fallback with Retry map.
- Attribution must remain visible. Provider settings are centralized in src/utils/storeMapController.js. Review URL, maximum zoom, attribution, invitation/privacy text and provider terms together if changing tile services.

OpenStreetMap standard tiles are a best-effort community service with no uptime guarantee. Comply with https://operations.osmfoundation.org/policies/tiles/ . For larger traffic or contractual uptime, choose suitable tile hosting. Do not use the public servers for automated load testing or prefetching.

## Acceptance checks

- No Leaflet assets or tile requests before activation; only the requested map loads.
- Every pin selects the matching details; numbers agree with the filtered directory even when some stores lack pins.
- Search/filter, previous/next, fit all, close/reopen, shared branch links, phone and Google directions work.
- Check narrow screens, touch scrolling, keyboard markers/zoom, reduced motion and visible attribution.
- Test missing pins, directory failure and tile failure with retries. Never show invented open/closed status or travel time.
- Check approved coordinates and directions at the actual branch entrances.

Run npm run build, npm run lint, and the store-related Node tests. A repeatable synthetic preview is available through node tests/helpers/store-map-preview.mjs after building. It binds only to a random loopback port, serves synthetic branches and cannot write to the database. Browser checks with public tiles must be limited to ordinary map viewing; use local/mock tiles for repeated automation or load tests.

## Verification recorded on 3 November 2026

Later usability update: see [place search and routing setup](place-search-setup.md). A map can now open without any branch pins; it starts at an unmarked Philippines overview. The current UI offers visible search modes, map expansion, wheel zoom, external Street View and embedded drive/walk route previews. The older browser observations below describe the earlier implementation, not validation of these newer controls.

- Production build passes. Leaflet plus its controller and stylesheet is about 51 KB gzip, loaded separately on demand. This excludes map image tiles and the rest of the website.
- Store-related tests: 21 pass, including reconciliation, invalid coordinates, keyboard selection, cleanup, tile failures/retry, filtering and directory fallback. Lint has no errors and three existing unused-variable warnings outside this change.
- Final full regression run: 109 tests passed, zero failed or skipped, using node --test --test-concurrency=1 tests/*.test.js with loopback access for local API test servers.
- Brave desktop and 390px viewport checks used synthetic branches, without database writes. Verified no Leaflet stylesheet or tile images before activation, actual OSM streets after activation, pointer selection, Enter/Space selection, pressed-state updates, mobile map view, the movement toggle and no horizontal page overflow at 390px.
- Browser access became disabled before the remaining 320px, close/reopen and missing-pin browser checks and final screenshot capture. Those remain to be checked, along with physical-phone touch behavior, screen-reader testing and the deployed site's real branch data. The temporary 390px viewport override could not be reset once access was disabled.
- No production deployment or live branch-data changes were made by this implementation.
