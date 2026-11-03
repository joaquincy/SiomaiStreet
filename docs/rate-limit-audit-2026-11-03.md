# Request limits and retry feedback

Audited and implemented locally on 3 November 2026. Hosted database migration, deployment and browser verification are still pending.

## How long does an applicant wait?

Submission starts/retries now have **two simultaneous fixed windows: five attempts per five minutes and 20 attempts per hour**, starting at the first admitted request in each window. A blocked applicant waits for the remainder of the exhausted window, not a fresh window after every click. If both are exhausted, the longer wait applies. For example, a five-minute window opened at 10:00 expires at 10:05; the separate hourly ceiling can still require waiting until 11:00.

The first Submit counts as one of the five attempts; this is not five extra retries after the first attempt. A submission includes several internal document requests, which use a separate allowance. People sharing a public IP (or an IPv6 /64 network) can share a limit. Frontend validation errors caught before sending do not spend a request; requests admitted by the limiter can still fail validation or verification afterward and count as an attempt.

No refresh or scheduled reset job is required. The database evaluates expiry using its own clock. The browser's expiry timer updates the Submit/Retry controls automatically and catches up after returning to a background tab. Nothing is submitted automatically when a wait ends.

## Active rules

| Action / server scope | Allowance | Shared by | Notes |
| --- | --- | --- | --- |
| Rapid submission/replacement attempts: `upload-start-burst` | 5/5 minutes | Network | First Submit included. Checked atomically with the hourly start limit. |
| Start/resume application or replacement: `upload-start` | 20/hour | IP | Counts attempts even when an existing receipt/session is recovered. |
| Create application upload session: `new-application` | 4/hour | IP | Only reached when no matching active session or completed application exists. |
| Create replacement session: `new-correction` | 20/hour | IP | Does not count a matching active replacement or receipt replay as new. |
| Authorize/check/finalize documents: `upload-control` | 100/hour | IP | Several internal requests per submission, including retries. |
| View application status: `portal` | 60/hour | IP | Includes invalid access attempts. |
| Reviewer private-document access: `staff-documents` | 100/hour | IP | Response includes metadata; the separate admin app must implement its own visual feedback. |
| Send/retry support message: `contact-ingress` | 20/hour | IP | Before processing the message. |
| New support messages: `contact-new` | 5/hour | Normalized reply email | Existing request replay happens before this debit. Both support channels share this allowance. |
| Submit review: `review-submit` | 8/hour | IP | Now uses the database rather than process memory; restart/deployment no longer resets it. |
| Mark review helpful: `review-helpful` | 60/hour | IP | Vote deduplication remains separate. |
| Place search: `place-search-client` | 20/hour | IP | Search requests, including those served from cache. |
| Route planning: `route-client` | 20/hour | IP | Separate from place search. |
| Maps provider budget: `place-search-global` | 80/hour | All visitors | Shared by search and routing. Cache/coalescing can avoid this debit. |

IP in this table means IPv4 address or IPv6 /64 network. Equivalent IPv4-mapped IPv6 spellings normalize to the same IPv4 identity. The old multipart application endpoint is retired (HTTP 410). Its old admission counters are not the active submission flow. Cloudflare, Supabase Storage/TUS and other providers can impose independent quotas; their budgets cannot be inferred from these application counters.

## Other upload controls

- Upload sessions last **two hours**. Expiry does not erase the applicant's local draft.
- Each document has at most **eight check claims per upload session**. An interrupted check's lease lasts **five minutes**; releasing that lease does not reset the attempt count.
- The check failure now distinguishes an active check from exhausted attempts, including the remaining session time. A concurrent completed check can return its ready result.
- TUS transport retries use delays of 0, 1.5, 3 and 6 seconds. These are transport retry delays, not a new per-person submission allowance.
- Same request ID plus unchanged data/documents recovers the same application/session where still valid. Changing answers/files can require another session. Keep the original request for an uncertain submission.
- Rate limits remain on the server before accepting application bodies or authorizing uploads. Client cooldowns are usability feedback, not security enforcement.

## Implemented feedback

- Allowed and rejected responses report sanitized `X-RateLimit-Policies`: scope, allowance, remaining count, window length, reset seconds and whether admission was allowed. No IP, email, tokens, storage paths or HMAC keys are included.
- HTTP 429 supplies the actual remaining `Retry-After`, accounting for time spent processing the request. It no longer blindly tells everyone to wait another 3,600 seconds.
- A shared modal warns at the final 10% of an allowance, with a minimum threshold of one remaining request. Examples: two of 20, one of four, ten of 100. Warnings are deduplicated in the current page session, with escalation when zero remain.
- For five-minute attempts, the warning starts after the fourth admitted attempt, when one remains. When multiple windows block the same action, the modal and `Retry-After` use the longer applicable wait.
- The modal identifies the relevant action and shared network/email/provider scope, shows a countdown, and explains safe retry. It is dismissible. It never clears inputs or sends a request automatically.
- Known ingress/control cooldowns stop repeated clicks from making further network calls until expiry. Conditional new-item quotas do **not** locally block receipt/session recovery. The global map budget does not block potentially cached requests locally.
- Application document feedback is held until the multi-request operation finishes. An existing security challenge or other modal is allowed to close before the notice opens.
- Native dialog focus containment, Escape dismissal, labelled controls, expiry announcement, scroll containment and reduced-motion styles are implemented. Their browser/device behavior still needs verification.
- Feedback is held in memory only, without new cookies or local-storage records. Reloading clears local feedback, but the server still enforces its existing window and reports current limits on the next request.
- Policies are defined once in `shared/ratePolicies.js`. The server rejects mismatched limits, malformed or contradictory RPC responses, missing data and database outages rather than allowing unverified requests.
- `consume_rate_policies` admits the five-minute and hourly windows together in one database transaction. Rejected requests do not consume either allowance or extend expiry. The same lock as legacy RPCs prevents racing deployments; lock acquisition is bounded to two seconds. Counter storage remains capped at 10,000 rows, with expired entries removed during requests.
- Hashes contain a server-keyed network identity, not a client-chosen identity. Rotating IPv6 addresses inside the same /64 cannot mint new quotas. This does not stop distributed bots using many networks; Turnstile and hosting-level abuse protection remain important.
- Local feedback can lag another tab or person sharing the network. The next request is always checked by the server. The UI does not poll the API every second; only the local countdown ticks.

## Activate in this order

1. In the **existing shared Supabase project**, open SQL Editor and run the complete contents of **`supabase/migrations/20261103020000_layered_rate_limits.sql`**. The prior application-security migration/table must already exist. This is a NEW migration even if you already applied `20261103010000_rate_limit_feedback.sql`; that earlier function alone is insufficient for the enhanced backend. The new migration works whether or not the earlier feedback migration ran.
2. Confirm the function exists:

   ```sql
   select to_regprocedure('public.consume_rate_policies(jsonb)');
   ```

   The result must not be null. The migration is rerunnable and uses the existing private counter table. Existing IPv4/email/global hourly keys retain their counters/expiry times. IPv6 keys move to network-based identities; older full-address keys expire naturally. No applicant table is recreated, and no applicant answers/documents are modified.
3. Deploy the modified frontend **and backend together**. Locally, restart the Node backend; on Vercel, commit/push the reviewed changes and wait for the production deployment to finish. Keep `APPLICATION_RATE_SECRET` and Supabase server credentials configured; no new secret is needed.
4. Test the local synthetic fixture at `/tests/browser/rate-limits.html` on your Vite development server. It imports the actual modal/controller and simulates headers without submitting applications or consuming real quotas. It is not part of the production Vite entry.
5. Verify the hosted request metadata and safe recovery with synthetic data in an isolated test environment. Do not exhaust a shared production IP's allowance simply to demonstrate a modal.

**Deploying the backend before applying the migration will make rate-limited endpoints fail closed because the required RPC is missing.** The separate admin app does not need a new connection; it can optionally read the new response headers for its own warnings.

## Verification and remaining work

- `npm test`: **152 passed, 0 failed** at the latest full run, including SQL migration reruns, retained counters, simultaneous five-minute/hourly enforcement, rejection without counter changes, automatic expiry, capacity exhaustion, IPv6 normalization, private RPC permissions, exact retry metadata, malformed feedback, aborted requests, local cooldown timers, deferred notifications and receipt replay after the new-session quota is spent.
- `npm run build`: passed.
- Targeted `oxlint` on changed JavaScript/JSX/tests: passed without diagnostics.
- New modal/controller/navigation source gates: hardcodes **6 files scanned, no violations**; emoji **5 files scanned, none**; native select **2 files scanned, none**.
- Existing SSR tests print Vite HMR-port-in-use warnings while running concurrently; tests pass. These are not browser measurements.
- **Browser QA blocked:** computer-use inventory reports local browser use disabled in Work settings. No screenshots, real keyboard/screen-reader, 320px, zoom or modal-stacking checks are claimed. Render-based design gates were not run.
- **Hosted verification pending:** migration not applied by this task; no production deployment or real service submission was performed.

Browser checklist: warning before exhaustion; blocked countdown; Escape/close returns focus; answers remain; no repeated request during a known cooldown; no automatic submission at expiry; manual retry after expiry; another modal is not interrupted; mobile dialog content and close button remain reachable; reload causes the next server response to resynchronize feedback.

## Why these numbers, and their limits

Five attempts per five minutes is a conservative starting policy for a form normally submitted once. Keeping the 20/hour ceiling prevents repeated five-minute bursts throughout an hour; keeping new sessions at four/hour protects upload storage. These are project choices, not universal values prescribed by a security standard. Observe legitimate shared-network usage and false positives before adjusting them. Fixed windows permit traffic near the boundary; the separate hourly ceiling limits longer sustained usage. A rolling-window/token-bucket design can be considered if measured traffic warrants its extra complexity.

The implementation follows the principle of layered application/infrastructure protection described in [OWASP's DoS guidance](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html). Rate rejections use HTTP 429 and a wait duration through [Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After). These checks are not proof of complete site security or of a live deployment: hosted migration and browser/end-to-end checks remain necessary.
