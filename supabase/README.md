# Supabase setup

1. Open the project's Supabase Dashboard and select **SQL Editor**.
2. Run `migrations/20261025000000_reviews_and_franchise_applications.sql`.
3. Run `migrations/20261025010000_reviews_branch_id.sql` to link reviews to branches for the website and SIOMAI Branch Monitoring.
4. Copy `.env.example` to `.env.local` in the repository root and fill in the project URL and a current service-role/secret key. Keep that key server-only; do not put it in a `VITE_` variable or browser code.
5. Run `npm run dev`. This starts the Vite site and the local API together.

The API writes reviews as `pending`; only published reviews are returned to site visitors. Franchise applications and their uploaded documents are private. Application inserts are accepted through the API only; the public browser cannot read application records or access the private document bucket.

To deploy, run `npm run build` and start the server with `npm start` in an environment that provides the same server-side variables. The server serves the built site and `/api` routes from the same origin.

The server-side key has full project access. Rotate any key that was shared in chat, then update `.env.local` or the deployment secret store. Both database migrations must be run in the Supabase project before the connected review and franchise flows will work.
