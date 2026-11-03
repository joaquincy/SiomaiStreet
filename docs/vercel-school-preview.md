> Historical preview record. Current settings: see [public-deployment-scan-deferred.md](./public-deployment-scan-deferred.md).

# Vercel school preview

Deployed 2026-11-02. Synthetic applicants/documents only.

- Preview: https://siomaistreet-demo-bj8utdt80-siomai-street1.vercel.app
- Project: https://vercel.com/siomai-street1/siomaistreet-demo
- Frontend: Vite static assets. Backend: raw Node handler in `api/index.js`.
- Database/storage: existing shared Supabase project. No database was created or migrated during deployment.
- Vercel authentication protection remains enabled. Open the preview while signed into the owner account; arrange preview access for classmates before a presentation.
- The CLI initially created a production deployment; that deployment was removed. Use the Preview link above.

## Next actions

1. In Cloudflare Turnstile, edit the existing widget and add this exact hostname:
   `siomaistreet-demo-bj8utdt80-siomai-street1.vercel.app`
   Keep localhost if local development still needs it. Do not add a scheme or path. The backend allows the Vercel-provided deployment hostname; Cloudflare must also allow it.
2. Open the preview and submit a synthetic applicant. Verify receipt, one row in the admin app, safe retry, and draft clearing. These browser/provider checks are not yet completed.
3. Keep the local Node backend running with `UPLOAD_CLEANUP_WORKER_ENABLED=true` while testing uploads, or arrange an authenticated external cleanup schedule. Vercel does not run the existing timer worker. Cleanup is not automatically scheduled by this deployment.
4. Publish approved branch coordinates before expecting interactive pins. The homepage now uses Leaflet with OpenStreetMap tiles and needs no Google Maps key or billing. Follow [the activation checklist](store-finder-activation-checklist.md); branches without coordinates remain in the directory.
5. Configure Resend/domain/webhook and a worker execution plan before expecting receipt emails. Email processing is disabled on this preview.

## Demo configuration

Existing Supabase, application signing/rate-limit, and Turnstile credentials are stored as Preview environment variables, never client-side build secrets. Local `.env` files are excluded from deployment.

`APPLICATION_DEMO_MODE=true` and `DOCUMENT_SCAN=off` allow scanning to remain disabled specifically on Preview. Production cannot use this override. Existing private-document review rules still apply; unscanned documents are not proof of safe reviewer access. ClamAV and live document-access verification remain deferred.

`EMAIL_WORKER_ENABLED=false` and `UPLOAD_CLEANUP_WORKER_ENABLED=false` on Vercel avoid pretending background timers will run continuously. Local settings are unchanged.

Franchise documents use direct storage upload. Review photos now allow JPG/PNG/WebP up to 3 MiB; their multipart request is capped at 4 MiB to fit Vercel's request ceiling.

## Updating the preview

Run from the repository root:

```powershell
npm run build
npm run lint
vercel deploy --yes --target preview
```

A new preview gets a new hostname; update Cloudflare's hostname list accordingly. GitHub automatic deployments are not connected yet. No Git commit or push was performed.

## Verification

- Local production build passed; 104 tests passed.
- Lint: zero errors, three existing unused-variable warnings.
- Deployed health API: configured, serverless, demo enabled, scanning disabled.
- Application route, store directory and security configuration: HTTP 200.
- Unknown API route: HTTP 404 JSON.
- No browser, camera, successful submission, email-delivery or reviewer-access claim is made by these HTTP checks.

This is a protected school preview, not a verified business launch.

