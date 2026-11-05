# Passport document requirement

**Later change:** the [document policy update](application-document-policy-v1.md) also permits funding evidence to follow after initial submission when funding is pending. Apply its migration after the Passport migration; do not overwrite it by rerunning the earlier migration alone.

The application no longer requires an ID-back image when Government ID Type is **Passport**. It requires the passport identity page in the existing `govIdFront` slot. Proof of address, proof of funds and the portrait photo remain required. Other ID types still require front and back images.

Step 7, required-file counts, missing-field links, the preparation checklist, final review, shared/API validation and SQL finalization now follow this rule. Switching to Passport removes a previously selected back file from the current draft; switching back to another ID requires selecting its back again. Existing submitted applications and reviewer correction requests are unchanged.

## Activate on the live website

1. Open the **existing shared Supabase project → SQL Editor → New query**.
2. Run the entire contents of `supabase/migrations/20261104000000_passport_document_requirement.sql` once. The prior direct-upload migration must already be installed. This changes the finalization function only; it does not recreate tables or rewrite applications. Re-running this new migration is safe.
3. Deploy the frontend/backend changes together through your normal GitHub/Vercel workflow. Apply the migration first, otherwise Passport uploads will still fail at SQL finalization.
4. Test with synthetic files: Passport plus the four required documents must receive a receipt; another ID without a back must remain blocked. Retry the successful request and check that only one application exists.

The admin app can keep reading `govIdFront`; it should treat `govIdBack` as absent for Passport. No new credentials, bucket or table is needed.

## Verification scope

`npm test`: **201 passed, 0 failed, 0 skipped**. Production build passed. Lint passed with the two existing unused-variable warnings (`PageLoader` and `BiNavigation`).

Automated coverage checks Passport and every other listed ID, missing identity pages and other required documents, invalid files, switching ID types, restored drafts, rendered counts/errors, both submission transports, PostgreSQL finalization and idempotent retries. The migration is exercised in local PostgreSQL-compatible tests, including repeat execution and restricted function permissions.

Live Supabase migration/deployment and browser click-through testing have not been performed in this change.
