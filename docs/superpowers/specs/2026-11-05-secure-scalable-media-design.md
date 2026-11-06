# Secure Scalable Listing Media Design

## Intent

Restore GGMarket listing images immediately without Vercel Image Optimization, then make the same recovery path the compatibility layer for a bounded, private, upload-time variant pipeline. The system must retain the existing Supabase RLS and private Storage model, keep every legacy image usable, and avoid paid infrastructure or production mutations without approval.

## Verified incident and current architecture

On 2026-11-05, anonymous Chromium requests to the live homepage and a live listing detail page consistently returned HTTP 402 from `/_next/image` with `OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`. Fetching the exact signed Supabase Storage sources from the same browser returned HTTP 200 with valid JPEG, PNG, or WebP content. Observed source sizes ranged from roughly 24 KB to 3.38 MB. This proves that the immediate failure is at Vercel's optimizer boundary, not missing Storage objects or invalid signed URLs. It also proves that direct legacy delivery is a recovery mechanism, not an adequate permanent card-size strategy.

The application currently stores one private object path per `listing_images` row, signs all selected paths in one Supabase request for one hour, and passes the signed URLs to `next/image`. Uploads cross an authenticated server route, are decoded by Sharp, normalized to WebP, stored with a narrowly isolated admin client, and recorded through the caller's RLS-bound Supabase client. Direct client insert/update Storage policies have already been removed. Public reads are limited to active listings; owners and admins retain controlled access to non-public listings.

## Goals

- Stop listing-media requests from using `/_next/image` while leaving static brand imagery on the normal Next.js path.
- Generate correctly bounded card and detail media once per upload, not once per view.
- Preserve private drafts, moderation/suspension behavior, ownership checks, signed URLs, existing object paths, ordering, and legacy rows.
- Keep database and Storage operations recoverable across partial failures.
- Reduce signing and browser downloads on collection pages to the primary card image.
- Provide an idempotent, resumable, explicitly gated legacy backfill tool without running it.
- Provide measurable security, image-size, scale, and rollout evidence without stress-testing production.

## Non-goals and approval boundaries

- No deployment, merge, production migration, production backfill, destructive production test, or paid-plan/vendor change.
- No public derivative bucket. Active listing media remains in the private bucket because suspension and moderation revocation are higher priority than cross-user public-cache reuse.
- No continuously running Vercel worker and no on-demand open image proxy.
- No deletion or replacement of legacy originals during rollout or backfill.
- No promise of immediate CDN revocation: Supabase documents that signed-token expiry and cached-response expiry differ, and object deletion invalidation can take up to about one minute.

## Architecture decision

### Selected: upload-time private variants

Each accepted upload is decoded once through the trusted server boundary and produces three metadata-stripped WebP objects under a generated image namespace:

| Purpose | Maximum dimensions | WebP quality | Consumer |
| --- | ---: | ---: | --- |
| `card` | 640 × 640, contain | 78 | cards, rails, search, favorites, messages, edit thumbnails |
| `detail` | 1600 × 1600, contain | 82 | listing gallery and fullscreen gallery |
| `original` | 2560 × 2560, contain | 86 | authorized large fallback and future reprocessing source |

All variants preserve aspect ratio, rotate from EXIF orientation, strip EXIF/GPS metadata by omission, retain transparency through WebP, and never enlarge the source. Input remains limited to 10 MiB and 40 megapixels; decoded formats are explicitly limited to JPEG, PNG, and WebP, with SVG and animated/multipage inputs rejected.

The database keeps `storage_path` as the canonical normalized original and adds nullable `card_path`, `detail_path`, byte counts, `media_version`, and `mime_type`. Nullable paths make the migration backward-compatible. The existing row remains the authorization source of truth; the private Storage SELECT policy is extended only to the three exact recorded paths. New uploads use immutable UUID-based object names and a five-minute object cache directive.

`lib/listing-media.ts` becomes the centralized variant/path selector. `lib/data.ts` requests the primary `card` path on collection surfaces and all `detail` paths on detail/edit surfaces, signs the resulting unique paths in one request, and falls back to `storage_path` for every legacy or partially backfilled row. A dedicated listing-media image component always uses `unoptimized`, which preserves Next.js layout/lazy-loading behavior while sending the signed Supabase URL directly to the browser.

### Rejected alternatives

- **Global `images.unoptimized`:** restores images but needlessly changes brand/static assets and hides which media is intentionally direct.
- **Vercel Image Optimization:** the exhausted Hobby quota is the live incident; continued dependence repeats the failure and commercial production is not an appropriate Hobby workload.
- **Supabase transformations:** currently Pro-only and billed per distinct transformed origin beyond quota. They remain a future adapter option, but are unnecessary when bounded variants can be generated during the already trusted upload.
- **Cloudflare Images or another vendor:** technically viable, but introduces credentials, migration, another authorization boundary, and paid usage before current scale justifies it.
- **Public derivative bucket:** improves shared caching but weakens revocation semantics for suspended or moderated listings and risks exposing draft derivatives.
- **On-demand application proxy:** would add server bandwidth, latency, SSRF/cache risks, and a new hot path.

## Upload and failure model

The server validates UUID/listing ownership/status, multipart size, file size, real decoder format, pixel limits, frame count, and sort order. It completes all three Sharp outputs before any Storage write. It then uploads immutable objects with bounded concurrency. If any upload or metadata insert fails, it removes only the paths created by that attempt. The RLS-bound client, not caller-supplied ownership data, creates the metadata row. No service key enters client code.

The Sell Wizard gains drag/drop, explicit left/right ordering, per-file progress, an abort control, and bounded retry for transient upload failures. A successful response is required for every image before publication. Existing cleanup of the draft listing remains the deterministic failure rollback.

## Delivery, caching, and revocation

- Collection pages sign only the first ordered card path for each listing.
- Detail/edit pages sign all ordered detail/card paths as needed.
- Signed URLs live for one hour; new objects request a five-minute Storage cache lifetime.
- URLs are never logged, proxied, or persisted in the database.
- Replacements use new versioned object paths, preventing stale content at an old URL.
- Deletion removes the original and all recorded variants before deleting metadata. Listing deletion does the same in one bounded batch.
- Moderation/suspension prevents generation of new signed URLs through existing RLS. Already cached signed responses may remain available for at most the provider cache/invalidation window; this limitation is documented operationally.

## Legacy migration and rollback

The application ships variant-aware reads before any backfill. Rows with null variant paths continue to sign and render the original directly. The backfill CLI defaults to dry-run, requires an explicit apply flag plus a project-ref confirmation, processes a bounded page, skips completed rows, writes immutable variant objects, and updates only the matching image row. It records no secrets or signed URLs. Production execution requires separate approval.

Rollback is application-first: revert consumers/data selection to `storage_path`; nullable columns and unused variant objects are harmless. The additive migration is not rolled back destructively in production. A later approved cleanup can remove orphaned variants only after verification.

## Scale and cost assumptions

At five images per listing, object counts are 150,000 / 750,000 / 1,500,000 with three variants for 10k / 50k / 100k listings. Assuming average stored sizes of 70 KB card, 220 KB detail, and 600 KB normalized original, media storage is approximately 44.5 GB / 222.5 GB / 445 GB. Actual cost depends on the active Supabase plan and measured cache/egress. Upload-time generation has no per-view transformation fee; browser bandwidth is dominated by page size and cache hit rate. Official pricing and dated assumptions are recorded in the production-readiness report rather than embedded as guarantees.

## Verification and acceptance

Tests cover variant selection and legacy fallback, decoder validation, dimensions/metadata behavior, upload cleanup, exact-path Storage policy changes, collection signing bounds, deletion of all variants, retry/cancel helpers, and `/_next/image` avoidance. Full TypeScript, ESLint, Vitest, build, secret scan, diff check, and safe browser tests run before handoff. State-changing Supabase/RLS/E2E tests run only if a disposable target can be verified; otherwise they remain an explicit NO-GO item.
