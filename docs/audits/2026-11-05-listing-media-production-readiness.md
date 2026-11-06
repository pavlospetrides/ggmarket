# GGMarket Listing Media Production Readiness

Report date: 2026-11-06 (Europe/Athens)

Branch: `feat/secure-scalable-media`

Base at implementation start: `c897e18` (`origin/main`)

Deployment status: not deployed; no production mutation, migration, or backfill performed

## Executive decision

GGMarket should use private upload-time variants with centralized signed delivery. This removes the exhausted Vercel optimizer from the listing-media hot path, bounds browser bytes, preserves draft/moderation revocation controls, and avoids per-view transformations. The emergency bypass is isolated in commit `05466b2`; the rest of the branch adds backward-compatible variant metadata, processing, upload reliability, bounded signing, and guarded operations.

Current gates before final verification:

| Gate | Decision | Reason |
| --- | --- | --- |
| Emergency image restoration | GO for preview/deployment review; not yet live | Independent commit, no migration dependency; live restoration remains unverified until deployment |
| Full scalable media rollout | NO-GO | Final full-suite/build/review and disposable migration/RLS evidence are pending |
| Production database migration | NO-GO | Additive SQL is prepared but has not been applied or verified on the production target |
| Legacy image backfill | NO-GO | Requires deployed variant-aware code, verified migration, dry-run review, monitoring window, and explicit approval |

## 1. Incident root cause

On 2026-11-05, anonymous Chromium diagnostics reproduced HTTP 402 responses from Vercel `/_next/image` with `OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`. The embedded private Supabase signed sources returned HTTP 200 with valid JPEG/PNG/WebP bodies, including multi-megabyte originals. Listing metadata rendered normally. This isolated the confirmed incident to exhausted Vercel Hobby Image Optimization allowance rather than missing objects or invalid Storage signatures.

A later read-only check on 2026-11-05 observed optimizer responses returning HTTP 200 again while the same large signed originals remained valid. That does not invalidate the incident: Vercel documents that Hobby over-limit new transformations return 402 and previously cached images can continue working. Production is still vulnerable until the bypass is deployed.

No evidence showed missing originals in the sampled requests. Production-wide object completeness, every listing state, and current quota telemetry were not exhaustively verified.

## 2. Existing media architecture

- Private Supabase Storage bucket `listing-images`.
- One `listing_images` row per ordered photo with canonical `storage_path`.
- Authenticated server upload route; Sharp decoding/normalization; isolated server admin client for Storage; caller/RLS client for metadata.
- Direct client Storage insert/update policies removed by prior hardening.
- Batched one-hour signed URLs for authorized rows.
- Listing cards/details passed signed sources into `next/image`, causing Vercel `/_next/image` transformations.
- Existing RLS ties reads/writes to active visibility, ownership, admin access, suspension, and moderation state.

## 3. New architecture

- Upload-time WebP variants generated once: card 640/78, detail 1600/82, normalized original 2560/86.
- EXIF orientation normalized; re-encoding omits EXIF/GPS; aspect ratio preserved; sources never enlarged.
- JPEG, PNG, and WebP only; maximum 10 MiB, 40 MP, 12,000 px/side, single frame/page.
- Deterministic owner/listing/image UUID paths and private Storage.
- Additive nullable card/detail paths, byte counts, MIME type, and media version on the existing row.
- Central path selection with legacy fallback.
- One batched signing request; collection mode selects one ordered card image, detail mode selects ordered detail images.
- Listing-only `unoptimized` wrapper sends signed sources directly; static brand assets remain optimized normally.
- Guarded, resumable legacy backfill creates missing derivatives without replacing originals.

## 4. Architecture decision and rejected alternatives

Selected: bounded upload-time private variants. Processing cost occurs once, repeated views reuse stable derivatives, and the provider adapter is centralized.

Rejected now:

- Global Next.js `images.unoptimized`: overly broad; would affect unrelated static/brand assets.
- Continued Vercel optimization: confirmed quota failure and commercial Hobby-plan mismatch. Official 2026 pricing includes 5,000 Hobby transformations/month; over-limit new transformations return 402.
- Supabase native transformations: unavailable on Free; Pro includes 100 origin images then charges $5/1,000 origin images. At 50k/250k/500k source images this is materially more expensive than storing three bounded variants.
- Cloudflare Images: technically viable, but adds credentials, migration, delivery billing, and a new authorization/revocation boundary. Official paid pricing is $5/100k stored images and $1/100k delivered images; remote transformations beyond 5k are $0.50/1k unique transformations.
- Public derivatives: better shared-cache hit rate but unacceptable draft/moderation/suspension exposure and weaker revocation semantics.
- Open/on-demand proxy: adds SSRF, bandwidth, latency, and a server hot path.

## 5. Implementation changes

- Emergency direct-media boundary across cards, galleries, favorites, messages, edit thumbnails, and discovery surfaces.
- Central media path/variant processor and typed metadata.
- Additive migration and exact recorded-path Storage authorization.
- Three-object trusted upload with partial cleanup; exact multi-variant deletion.
- Purpose-aware batched signing and bounded collection payloads.
- Sell Wizard drag/drop, stable ordering/cover marker, progress, cancellation, transient HTTP retry, and ambiguous-network cleanup.
- Stable client upload UUID and idempotent server retry lookup.
- Guarded backfill, capacity model, runbook, and this report.

## 6. Files created or materially modified

See `git diff --name-status origin/main...HEAD` at handoff. Principal additions include:

- `components/listing-media-image.tsx`
- `lib/listing-media.ts`
- `lib/listing-media-storage.ts`
- `lib/listing-upload.ts`
- `supabase/migrations/202611050001_listing_image_variants.sql`
- `scripts/backfill-listing-image-variants.mjs`
- `scripts/media-capacity-model.mjs`
- `docs/operations/listing-media-runbook.md`
- media unit, route, migration, delivery, data, upload, backfill, and safe browser tests

## 7–9. Processing, sizes, and validation

| Purpose | Maximum | Quality | Typical planning size |
| --- | ---: | ---: | ---: |
| Card | 640 × 640 | WebP 78 | 70 KB |
| Detail | 1600 × 1600 | WebP 82 | 220 KB |
| Normalized original | 2560 × 2560 | WebP 86 | 600 KB |

Server validation does not trust filename or browser MIME. Sharp must decode an allowed real format; SVG, animation/multipage, empty, malformed, oversized, over-dimension, and decompression-bomb inputs are rejected. Processing is sequential to bound decoded-buffer concurrency.

## 10–12. Storage authorization, RLS, and signed URLs

- Bucket remains private; no public derivative bucket.
- Browser never receives admin credentials and cannot choose Storage paths.
- Upload route authenticates, validates listing UUID, verifies caller ownership and allowed listing status, derives paths from authenticated user/listing/image IDs, and inserts through the RLS client.
- Backfill is a separate server-only operator tool with exact project-ref confirmation and no user-controlled paths.
- Existing rows authorize exact recorded `storage_path`, `card_path`, or `detail_path`; no arbitrary prefix read was added.
- Signed URLs are generated in one server batch for 3,600 seconds and never persisted or logged.
- RLS/disposable-database results will be recorded in final verification. No production RLS change has been applied.

## 13. CDN/cache design

- New private objects: five-minute browser cache directive.
- Replacement: new UUID path, avoiding stale overwrites.
- Smart CDN can cache signed responses; unique signed tokens can create separate cache entries.
- Token expiry does not purge CDN/browser cache. Supabase documents deletion invalidation can take up to 60 seconds and browser cache can persist independently.
- Moderation/suspension immediately prevents new authorized signing through RLS; deletion/move is required for strongest object revocation, subject to propagation.

## 14–15. Existing-image migration and production requirements

Variant-aware reads ship first and always fall back to `storage_path`. No seller re-upload is required. The CLI is dry-run by default, maximum 100 rows, cursor-resumable, skips complete rows, fills only missing variants, uses deterministic exact paths, sanitizes errors, and never deletes originals.

Production requires separate approvals for migration and backfill. Deployment order, exact commands, verification, and rollback are in `docs/operations/listing-media-runbook.md`.

## 16–17. Performance and scale results

The reproducible model uses five photos/listing and three objects/photo:

| Listings | Source images | Stored objects | Storage | Estimated monthly delivered egress after 35% browser reuse |
| ---: | ---: | ---: | ---: | ---: |
| 10,000 | 50,000 | 150,000 | 44.5 GB | 44.2 GB |
| 50,000 | 250,000 | 750,000 | 222.5 GB | 221 GB |
| 100,000 | 500,000 | 1,500,000 | 445 GB | 442 GB |

Query scale is bounded by existing pagination, one primary image per collection listing, deterministic ordering, and one signing request per result batch. No 50k/100k database fixture was created because no verified disposable Supabase target was available. This is a capacity model, not a measured database load result. Final local performance/build/browser evidence will be added after Task 8.

## 18. Cost estimate

Assumptions: Supabase Pro $25/month; 100 GB Storage included then $0.0213/GB; 250 GB cached egress included then $0.03/GB; 50 card impressions/listing/month; five detail views/listing/month; three detail images/view; 35% browser-cache reuse. Prices were retrieved from official provider pages on 2026-11-06 and can change.

| Listings | Storage overage | Cached-egress overage | Estimated Supabase Pro total |
| ---: | ---: | ---: | ---: |
| 10,000 | $0.00 | $0.00 | $25.00/month |
| 50,000 | $2.61 | $0.00 | $27.61/month |
| 100,000 | $7.35 | $5.76 | $38.11/month |

This excludes database compute upgrades, VAT/tax, uncached egress categories, log drains, backups, and traffic above assumptions. Run `node scripts/media-capacity-model.mjs` and replace assumptions with observed metrics.

## 19–20. Browser, unit, and security results

Completed before Task 7:

- Tasks 1–5 focused suites: 22/22, 18/18, 9/9, 28/28, and 35/35 respectively, with TypeScript gates where recorded.
- Task 6: 34/34 focused unit/security tests; typecheck and targeted ESLint passed; complete Chromium safe Sell harness 5/5; focused WebKit cover-order and cancellation 2/2.
- A later complete WebKit harness run hit runner heap/hydration instability; it is not reported as green.

Task 8 will replace this section with fresh whole-branch evidence. State-changing Supabase/RLS and real upload E2E remain blocked unless a disposable target is verified.

## 21. Known limitations

- The branch is not deployed; current live restoration is unverified.
- Production migration history/schema and Storage policy state were not mutated or exhaustively revalidated.
- No isolated 100k-row database load test was run.
- Private signed media has lower shared-cache efficiency than a public bucket by design.
- Signed URL/CDN/browser revocation is not instantaneous.
- Backfill uses Node.js 22.6+ TypeScript loading and has not been pointed at production.
- Legacy originals exceeding current decoder limits will fail safely and require manual review.

## 22–23. Rollback and monitoring

See `docs/operations/listing-media-runbook.md` for commit-isolated emergency rollback, additive migration rollback policy, backfill stop/retry behavior, incident diagnosis, and recommended alert thresholds. No monitoring dashboard is claimed to exist until operators configure it.

## 24. Pull request

Pending Task 8 push and PR creation.

## 25. GO/NO-GO acceptance decisions

Final decisions will be updated after full verification. No decision authorizes merge, deployment, migration, or backfill; each external action still requires explicit approval.

## Official pricing and behavior sources

- https://supabase.com/pricing
- https://supabase.com/docs/guides/storage/serving/image-transformations
- https://supabase.com/docs/guides/storage/cdn/smart-cdn
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://vercel.com/docs/image-optimization/limits-and-pricing
- https://developers.cloudflare.com/images/pricing/
