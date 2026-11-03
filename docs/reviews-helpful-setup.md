# Helpful votes

Apply `supabase/migrations/20261103000000_review_helpful_votes.sql` to the existing shared Supabase project before deploying this version. It preserves existing helpful totals and adds a private deduplication ledger and server-only RPC. No new project or client credentials are needed. The backend uses the existing service role and shared rate-limit configuration (`APPLICATION_RATE_SECRET`).

Click Helpful once to record a vote. The button shows Saving, then Marked helpful only after a valid server receipt. Failed requests show a message beside the button and may be retried. The same saved vote token cannot increment a review twice, including after a lost response. Tokens are stored locally before sending; the database stores only a hash. Votes are anonymous browser actions, not proof of unique people. Clearing site storage or using another browser can create another identity; shared IP rate limits also apply.

Local automated tests execute the migration and verify deduplication, preserved totals, unpublished-review rejection, permissions, receipt validation and storage failures. Hosted Supabase and the deployed endpoint still need verification after applying the migration. Do not test by adding votes to real customer reviews; use a synthetic published review, then remove it through the normal reviewer workflow. No migration was applied automatically.
