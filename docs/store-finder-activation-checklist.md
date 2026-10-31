# Store finder: activate the live feature

The design and frontend controls are implemented. A live Google map still needs configuration and verified branch data. This uses the existing shared Supabase project; no second database is required for the feature.

## 1. Owner + classmate: publish accurate store information

- [ ] Confirm each public branch name, address, city/region and exact entrance coordinates.
- [ ] Confirm public phone, hours, holiday exceptions and useful landmarks. Leave unavailable information blank.
- [ ] Classmate reviews and applies `supabase/migrations/20261031000000_store_locator_profiles.sql` to the agreed integration project first.
- [ ] Add each branch's metadata to `store_locator_profiles`, linked to its existing `branches.branch_id`. Publish reviewed profiles with `published=true` and keep the existing branch status `Active`.
- [ ] Keep management writes behind authorized staff access. The migration deliberately grants no anonymous/browser write permissions.
- [ ] Verify `GET /api/store-locations` exposes approved public data only. Remove test/junk branch records from the public directory before launch.

## 2. Google project administrator: configure Maps

- [ ] Create/select the Google Cloud project, enable billing for production and enable Maps JavaScript API.
- [ ] Create a browser API key; restrict it to Maps JavaScript API and the permitted website referrers, such as `http://localhost:3000/*` for development and your actual HTTPS domain for production. Prefer separate development/production keys.
- [ ] Create a JavaScript map ID. Keep Google attribution and built-in controls visible.
- [ ] Configure quotas, budget alerts and billing ownership. Alerts-only budgets notify you; they do not automatically cap spending. See [Google budget guidance](https://docs.cloud.google.com/billing/docs/how-to/budgets).

Official instructions: [Google Maps setup](https://developers.google.com/maps/documentation/javascript/get-api-key), [API key restrictions](https://developers.google.com/maps/api-security-best-practices).

## 3. Website developer: add configuration and rebuild

Set these in the local `.env.local` and hosting build environment (replace placeholders locally; do not paste credentials in chat):

```dotenv
VITE_GOOGLE_MAPS_API_KEY=YOUR_RESTRICTED_BROWSER_KEY
VITE_GOOGLE_MAPS_MAP_ID=YOUR_JAVASCRIPT_MAP_ID
```

- [ ] Restart local Vite after changing environment values. Rebuild/redeploy for hosting changes.
- [ ] Ensure the deployed website forwards `/api/store-locations` to its backend.
- [ ] Keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the backend. Never create a `VITE_` service-role key.
- [ ] Deploy with HTTPS and test Google requests against the production CSP and referrer restrictions.

The Google browser key is included in the built frontend by design; referrer/API restrictions protect its intended use. Supabase service-role credentials must remain private.

## 4. Optional visual finishing: style the real basemap

Create and publish a Google Cloud map style, then associate it with the JavaScript map ID used above. CSS cannot recolor Google's basemap tiles.

Suggested brand brief:

| Feature | Direction |
| --- | --- |
| Land/base | Warm cream, around `#FAF5E7` |
| Roads | Pale cream/white, with readable contrasting road labels |
| Buildings | Muted sand, around `#E9D8B1` |
| Parks | Quiet sage, around `#CED4BD` |
| Water | Muted blue-green, around `#AACCC8` |
| Labels | Dark brown/green, around `#384238` |
| Branch pins | Existing crimson numbered pins; selected state in dark green/yellow |

Reduce unrelated commercial POI clutter, but retain useful street, transit and landmark context. Check contrast at different zoom levels. The screenshot's illustrative character is inspiration, not a promise of identical Google cartography.

[Google Cloud map styling](https://developers.google.com/maps/documentation/javascript/cloud-customization).

## 5. Joint acceptance check before launch

- [ ] Each approved store appears once; every marker opens the matching store details.
- [ ] Confirm directions land at the real entrance, phone links dial the correct number, and shared links select the right branch.
- [ ] Test 320px/390px mobile, tablet and desktop, keyboard navigation, 200% zoom and reduced motion.
- [ ] Test location allowed, denied, timed out and cancelled; no location is retained after clearing/leaving.
- [ ] Test search with no matches, missing hours/phone/pins, API outage, Google load failure and retries.
- [ ] Verify no Google script request before map activation; verify attribution, zoom/fullscreen, close/reopen and fit-all behavior.

Current local checks: production build, targeted lint and 19 store-finder tests pass. Browser access is disabled, so visual/real-device and live Google-map checks above are not yet complete. Both Maps environment values were confirmed absent during this refresh.
