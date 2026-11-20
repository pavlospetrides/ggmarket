# Supabase Egress Investigation — 2026-11-20

## Executive summary

The production usage total (5.54 GB uncached egress) cannot be attributed by service from this environment: the Supabase CLI has no Management API token and no signed-in dashboard browser is available. Historical spike causes are therefore **unconfirmed**.

The highest-confidence payload finding is active legacy listing media. The anonymous production sample contains five active listing-image rows: three in Supabase Storage and two in R2. All three Supabase objects lack card/detail variants; both R2 rows have them. The three Supabase originals total 4,000,125 bytes (1,333,375 bytes average). Card pages fall back to these originals. A single uncached grid view containing those three assets can therefore transfer about 4.0 MB from Supabase Storage, before avatars or other assets. This branch does not migrate, overwrite, or delete them.

Two code-level traffic problems are fixed: featured listings no longer hydrate up to 60 campaigns through an N+1 fan-out, and healthy Realtime chat no longer downloads message history every 12 seconds. Public list projections are smaller and public categories are cached for five minutes. Private/user-specific data remains dynamic.

## Results table

| Area | Finding | Evidence | Fix | Measured impact | Status |
|---|---|---|---|---|---|
| Database queries | Collection reads selected description, seller biography/location, and detail image paths. | Anonymous production sample: five rows were 7,193 bytes with the prior projection and 6,268 bytes with the card projection. | Split card/detail projections and use the card projection on collection reads. | 925 bytes / 12.9% lower raw PostgREST payload for the measured five-row sample. | Implemented |
| Database queries | Featured hydration could run one expiry RPC, one campaign query, then four database queries per campaign. | Static call graph: `getListing` = listing + reviews + two trust-signal queries; campaign cap = 60. Production sample had zero active campaigns. | Batch up to 60 IDs into one listing query and one shared three-query enrichment pass; remove read-time expiry mutation. | Worst case 242 database/RPC calls → 5. Preventive at measurement time because active campaigns = 0. | Implemented |
| Database queries | Search RPC returns an unbounded set of complete listing rows before the application extracts IDs. | `search_listings` returns `setof listings` with no SQL limit. | No migration added; current production has only five active listings. Add an RPC limit/page contract before catalog growth. | No current material reduction measured. | Remaining risk |
| Database queries | Conversation list downloads up to 500 messages to compute previews/unread counts. Saved searches and favorites IDs are not explicitly capped. | `lib/phase2-data.ts` and `lib/data.ts` source audit. | Not changed: correct aggregation requires a tested RPC/schema change and production evidence. | Unknown; bounded at 500 only for message preview rows. | Remaining risk |
| Media delivery | Three active Supabase images have no variants and card delivery falls back to originals. | RLS-constrained production read plus signed one-byte range probes: 4,000,125 bytes total, 1,333,375 bytes average. | Existing code already generates variants for new uploads and supports R2. No live backfill/migration was authorized. | Potentially ~4.0 MB uncached Supabase Storage transfer for one view that loads all three legacy cards. | Confirmed, operational remediation required |
| Media delivery | Signed private URLs are regenerated, which fragments CDN cache keys. | Supabase documents that distinct signed tokens are distinct Smart CDN cache entries. Upload cache-control is 300 seconds. | No shared signed-URL cache added because authorization and listing-status invalidation require a dedicated design. | Unknown. | Remaining risk |
| Realtime | Open foreground chat fetched up to 500 messages every 12 seconds even when Realtime was subscribed. | `components/chat-interface.tsx`; five GETs/minute, each performing Auth and message reads. | Validated `after` cursor; healthy Realtime disables timer reads; error states poll once/minute with a 100-row incremental cap; focus/online recovery remains. The query includes the cursor boundary, and the existing ID merge removes the overlap without missing equal-timestamp messages. | Healthy channel: 5 timer GETs/minute → 0. Failed channel: 5 full-history GETs/minute → 1 incremental GET/minute. | Implemented |
| Realtime | Notification and conversation channels are scoped and cleaned up. | Notification filter is `user_id=eq.<user>`; chat filter is conversation ID; both call `removeChannel`, unsubscribe listeners, and chat clears its timer. | Preserved. Anonymous notification bootstrap exits before creating Supabase client when no Auth cookie exists. | No duplicate anonymous Realtime connection found. | Verified by source/tests |
| Auth / sessions | Protected API routes validate with `auth.getUser`, adding Auth traffic but enforcing server-side identity. | `lib/auth.ts` and route inventory. | Preserved; no cross-request session/authorization cache. | No safe reduction claimed. | Security constraint |
| Next.js caching | Active categories (12 rows / 1,216 bytes) were fetched on each category-dependent route render. | Anonymous production measurement and route inventory. | Five-minute `unstable_cache` around only `getCategories`; key/tag `public-categories`. | Repeated reads within cache lifetime collapse to one 1,216-byte PostgREST response per deployment/cache region. | Implemented |
| Failed requests | DataAccessError logs once and does not automatically retry. Seller profile re-fetch occurs only when an out-of-range page is normalized. | `lib/data.ts` trace. | No retry-loop change. | No retry storm found. | Verified by source |
| Failed requests | Category RLS previously called an authenticated-only admin function for anonymous reads. | `202611200001_catalog_categories_read_policy.sql`; current anonymous read returned 12 active categories without error. | Migration preserved unchanged. | Current measured target no longer repeats failing anonymous category reads. | Verified read-only |
| Edge Functions | No Supabase Edge Functions exist in the repository. | No `supabase/functions` directory. | None. | Not an application egress source. | Verified by source |

## A. Root causes

### Confirmed

1. **Legacy Supabase originals are served in card contexts.** The three measured Supabase objects have no variants and average 1.33 MB. This is the only finding large enough, from direct byte measurements, to plausibly dominate a 5.54 GB total at modest request volume.
2. **Chat performed redundant full-history reconciliation.** A visible chat issued five authenticated reconciliation requests per minute irrespective of healthy Realtime state.
3. **Public database responses contained avoidable fields.** The measured card projection reduction is 12.9% before enrichment.

### High-confidence preventive findings, not proven production causes

- Featured campaigns could create a 242-call worst case, but there were zero active campaigns in the production sample.
- Public categories were repeatedly fetched, but the payload is only 1,216 bytes and cannot explain GB-scale usage alone.

## B. Historical traffic

The spikes on November 2–6 and November 12–13 cannot be attributed to a Supabase service or endpoint without organization usage breakdowns or retained logs.

Repository history shows correlation only:

- November 2–6 included loading/navigation work, chat/notifications, favorites, Auth recovery, sitemap recovery, and listing-image variant work.
- November 12–13 included R2 media support, profile media, seller growth/featured listings, and collectibles work.

These dates contain many commits and likely test/deploy activity, but correlation is not causation. In particular, there is no evidence available here that automated tests, a specific deploy, Realtime, Auth, or Storage generated either spike.

## C. Implemented fixes

- `lib/data.ts`: separate card/detail projections and bounded batch hydration for known listing IDs.
- `lib/featured-listings.ts`: one batch hydration pass; no expiration mutation on public reads.
- `lib/message-reconciliation.ts`: strict timestamp cursor parsing and fallback policy.
- `app/api/conversations/[id]/messages/route.ts`: incremental, RLS-scoped reads capped at 100 rows; invalid cursors rejected.
- `components/chat-interface.tsx`: Realtime-first reconciliation, one-minute failure fallback, in-flight deduplication, and existing cleanup preserved.
- `lib/public-catalog.ts` plus category callers: five-minute shared cache for public active categories only.

No SQL migration, Admin change, Storage mutation, production data mutation, or media migration is included.

## D. Before/after measurements

| Scenario | Before | After |
|---|---:|---:|
| Five active listing rows, raw JSON | 7,193 bytes | 6,268 bytes |
| Featured, 60 campaigns, database/RPC call bound | 242 | 5 |
| Healthy visible chat timer reads | 5/minute | 0/minute |
| Failed/disconnected visible chat timer reads | 5/minute, up to 500 rows each | 1/minute, cursor-window rows plus one boundary overlap, max 100 |
| Category reads within five-minute cache window | one per dependent render | one per cache key/region |

These are request/payload measurements and deterministic code bounds, not a claim of production GB savings.

## E. Test results

| Check | Result |
|---|---|
| TypeScript (`npm run typecheck`) | Passed |
| ESLint (`npm run lint`) | Passed with 0 errors and 0 warnings after dependency correction |
| Complete Vitest (`npx vitest run --maxWorkers=1`) | Passed: 128 files, 815 tests |
| Production build (`npm run build`) | Passed: Next.js 16.4.5, 72 static pages generated |
| npm audit | 0 critical, 0 high, 7 moderate; all are transitive ESLint/typescript-eslint/minimatch development-tooling findings |
| RLS/migration/security regression coverage | Included in the complete 815-test Vitest run and passed |
| Read-only Playwright Chromium/WebKit | Blocked locally: the production sample includes two R2 images but the local environment has no R2 signing credentials, so public pages fail closed with `MediaStorageConfigurationError`. The run was stopped; no state-changing test ran. |
| State-changing Playwright suites | Skipped by policy: no approved disposable Supabase project was available. |

## F. Security review

- Category caching contains only rows readable by anonymous users under the active-only RLS policy.
- No user ID, cookie, session, private profile, favorite, notification, conversation, message, offer, trade, signed-media URL, or authorization decision is shared-cached.
- Message reconciliation still calls `getUser` and relies on conversation RLS; the cursor only narrows `created_at` and is validated before query construction.
- Realtime filters remain user/conversation scoped and subscriptions are removed on cleanup.
- Private buckets and signed delivery remain unchanged; no public bucket conversion was made.
- `202611200001_catalog_categories_read_policy.sql` is unchanged.

## G. GitHub status

Branch: `perf/supabase-egress-optimization`, pushed to `origin`. Pull request: [#48 — perf: reduce Supabase egress and redundant reads](https://github.com/pavlospetrides/ggmarket/pull/48).

## H. Deployment plan

1. Deploy the application branch without media mutation.
2. Smoke-test anonymous home/marketplace/browse, authenticated chat, notifications, listing detail/edit, Seller Verification, and Admin Moderation.
3. For 24 hours, record uncached egress, cached egress, Storage request count/cache status, Database API request count, Realtime messages/connections, Auth requests, and deploy timestamps.
4. Compare per-hour rates to the same traffic window before deployment; do not compare raw daily totals without traffic normalization.
5. Roll back the application if chat missed-event recovery, category freshness, or listing cards regress. No database rollback is required.
6. Separately approve a one-time legacy-media variant backfill (prefer R2 under the established provider design) after dry-run object counts and byte totals are reviewed. Do not delete originals in the same operation.

## I. Monitoring and prevention

### Daily until safely below quota

- Organization Usage: uncached egress and cached egress separately; alert operationally at 60%, 75%, and 90% of monthly quota.
- Storage logs: top GET paths and `cf_cache_status`; investigate repeated `/storage/v1/object/sign/` and original-object paths.
- API/Auth logs: group request count and response bytes by `/rest/v1`, `/auth/v1/user`, `/storage/v1`, and `/realtime/v1`.
- Correlate hourly changes with Vercel deploy IDs, commit SHAs, E2E runs, backfill runs, and feature-flag changes.

### Weekly after stabilization

- Review top Storage cache misses and cache-hit ratio.
- Sample active listing images for missing `card_path`/`detail_path` and provider distribution.
- Review PostgREST endpoints by count and response size; pay particular attention to search, conversations, and seller profiles.
- Confirm Realtime channel counts roughly match active authenticated tabs and that reconnect rates are not elevated.

Supabase defines cached and uncached egress as independent quotas; cached egress applies to Storage CDN hits. Database, Auth, Realtime, Functions, Supavisor, and cache-miss Storage traffic contribute to uncached egress. In Logs Explorer, Storage hits include `HIT`, `STALE`, `REVALIDATED`, and `UPDATING` cache statuses.

## J. Remaining risks and final verdict

### Remaining risks

- Historical service/endpoint attribution requires Supabase dashboard or Management API access.
- Legacy media remains the largest measured source until a separately approved backfill is executed.
- Signed URL regeneration reduces Smart CDN reuse; safe shared signing needs explicit authorization/invalidation design.
- Search results, conversation previews, saved searches, and favorite IDs need production cardinality evidence before further schema/query changes.
- R2 object sizes and deployed `MEDIA_STORAGE_PROVIDER` configuration are not visible from this environment.

### Verdict

**CONDITIONAL GO** — deploy the code optimizations after all verification gates pass, but expect the largest Storage reduction only after a separately approved legacy-variant/R2 remediation. Monitor the first 24 hours and do not claim the quota issue resolved from code changes alone.
