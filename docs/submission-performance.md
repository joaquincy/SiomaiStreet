# Submission performance changes — 2026-11-04

## What changed

- Two bounded workers now upload and check documents as they arrive. Checks no longer wait for every upload and then run serially.
- Each backend instance admits at most two active document checks, with four waiting slots and a 30-second queue timeout. Waiting requests release timers/listeners on cancellation; active work releases capacity in `finally`. Database leases still protect the same document across instances.
- JPEG photos stay high-quality JPEG (quality 95, full colour sampling) rather than expanding to PNG first. Dimensions are retained, orientation is applied, and private metadata is stripped. PNG remains lossless unless the existing size-limit fallback is needed. JPEG re-encoding is lossy; verify fine text on representative synthetic documents.
- Fresh private-storage promotion no longer performs an existence lookup first. Immutable uploads still prevent overwrite; conflicts and lost responses require an exact byte match before reuse.
- Session lookups fetch authorization metadata rather than repeatedly transferring the applicant's full answers.
- Progress distinguishes actual bytes transferred from completed document checks and avoids repeated identical announcements.
- Document-check responses include numeric `Server-Timing` stages: queue, claim, download, scan, normalize, rescan (images), promote and finish. No applicant information is included.

## Reproducible checks

```powershell
node --test --test-concurrency=2 tests/*.test.js
npm run build
node scripts/benchmark-application-submission.js
```

Full suite: 181 tests passed. After the final session-field projection change, the 33 affected upload/image/queue/promotion tests passed again. Production build and targeted lint passed. Rendering tests emitted a development HMR-port warning; the test process still completed successfully. Browser submission is not covered by these results.

One synthetic local benchmark (not hosted performance):

| Measurement | Previous path | Updated path |
| --- | ---: | ---: |
| Five documents, simulated 50 ms upload and 100 ms check each | 727.5 ms | 543.5 ms |
| 2400 × 1800 synthetic JPEG normalization | 224.8 ms | 84.8 ms |
| Normalized image bytes | 7,873,625 | 2,447,138 |

The benchmark excludes actual hosted-network latency, database latency, cold starts and scanner time. Run again for a new local sample; timings vary with system load.

## Deployment and live verification

Deploy frontend and backend together. No new migration, key or environment variable is needed. Existing scanning configuration and validation rules remain in force.

After deployment, reload the application without clearing browser storage. Use synthetic documents and record the total submission time. In DevTools Network, inspect `/check/` responses' `Server-Timing` header to distinguish queue, storage, image processing, scanner and database delays. Test both JPEG and PDF, an interrupted retry, and the single matching receipt/admin record. Do not share signed upload URLs, authorization headers or applicant data in diagnostics.

If hosted storage/database stages dominate, compare the configured Vercel Function region with the Supabase project's region before changing hosting. This patch does not relocate either service or promise a fixed submission duration.
