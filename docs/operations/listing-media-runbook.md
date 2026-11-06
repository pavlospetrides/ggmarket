# Listing Media Operations Runbook

Last updated: 2026-11-06 (Europe/Athens)

## Safety boundary

GGMarket listing media remains in the private `listing-images` Supabase Storage bucket. Application reads are authorized through the existing `listing_images` RLS policies and one-hour signed URLs. Upload processing uses the narrowly isolated server-only Supabase admin client; browser code never receives a service-role or secret key.

Never make the bucket public, disable RLS, run the backfill against production without written approval, log signed URLs, or delete legacy originals. A Storage URL is not proof of authorization.

## Architecture at a glance

- New uploads are decoded once at the authenticated server boundary and produce metadata-stripped WebP variants: `card` (maximum 640 px, quality 78), `detail` (maximum 1600 px, quality 82), and normalized `original` (maximum 2560 px, quality 86).
- Object names are deterministic and owner-scoped: `<owner UUID>/<listing UUID>/<image UUID>/<purpose>.webp`.
- `listing_images.storage_path` remains the canonical original. Nullable `card_path` and `detail_path` provide backward compatibility.
- Collection queries sign only the first ordered card path. Detail/edit queries sign ordered detail paths in one batched request. Missing variants fall back to the authorized legacy original.
- `ListingMediaImage` sets `unoptimized` only for user listing media, bypassing Vercel `/_next/image` while retaining Next.js dimensions, lazy loading, and layout behavior. Static brand assets keep normal Next.js optimization.
- Signed URLs expire after one hour. New objects use `cacheControl: 300`; replacement objects use new UUID paths.

## Release sequence

### Stage 1: emergency image restoration

Commit `05466b2` is the independently reviewable recovery boundary. It changes listing-media consumers to direct signed-source delivery without requiring the variant migration. Review it separately with:

```powershell
git show --stat 05466b2
git diff 05466b2^ 05466b2
```

It can be cherry-picked onto a current `main`-based emergency branch if the full media branch is not ready. Do not claim restoration until an approved deployment is live and desktop/mobile network traces show listing requests going directly to the signed Supabase source with no listing requests through `/_next/image`.

### Stage 2: additive database migration

Migration: `supabase/migrations/202611050001_listing_image_variants.sql`.

Before approval:

1. Create or select a disposable Supabase project.
2. Confirm its project ref without printing keys.
3. Run the repository migration/bootstrap and RLS suites there.
4. Inspect the migration diff and lock implications.

Production commands are intentionally not run by this branch. After explicit approval, an operator may use the linked Supabase CLI:

```powershell
supabase migration list --linked
supabase db push --dry-run
supabase db push
supabase migration list --linked
```

Stop if the linked project ref is not the approved production ref, if earlier migration history differs, or if the dry run includes anything beyond reviewed pending migrations.

Post-migration verification (read-only): confirm nullable variant columns and unique partial indexes exist; confirm `listing-images` remains private; confirm Storage SELECT uses exact recorded original/card/detail paths; confirm direct client insert/update policies remain absent.

### Stage 3: full application rollout

Deploy application code only after the additive migration is present. Smoke-test:

- a legacy active listing (null variants) renders its signed original directly;
- a new draft upload creates three private objects and one metadata row;
- the draft is inaccessible anonymously;
- publish makes the listing visible through existing RLS;
- a suspended owner cannot upload or mutate;
- card pages sign only the ordered primary card image;
- detail pages load detail variants progressively;
- deleting/replacing an image targets only exact database-recorded paths.

Observe error rate, upload failures, Storage usage, and image request status for at least one normal traffic window before considering backfill.

### Stage 4: legacy backfill (separate approval)

Requirements: Node.js 22.6+ (TypeScript type stripping), reviewed application release deployed, migration verified, server-only Supabase admin variables present, recent backup/restore plan, and explicit production-backfill approval.

Help is credential-free:

```powershell
node scripts/backfill-listing-image-variants.mjs --help
```

Read-only dry run is the default. Start with a bounded page:

```powershell
node scripts/backfill-listing-image-variants.mjs --batch-size 25
```

The dry run lists row IDs and deterministic missing variant paths but performs no download, upload, or database update. Resume after the last reported image UUID:

```powershell
node scripts/backfill-listing-image-variants.mjs --batch-size 25 --cursor <last-image-uuid>
```

Apply mode requires both flags and refuses a mismatched configured URL:

```powershell
node scripts/backfill-listing-image-variants.mjs --batch-size 25 --cursor <last-image-uuid> --apply --confirm-project-ref <approved-project-ref>
```

Never paste keys into the command line. Use the existing server-only environment names (`SUPABASE_URL` plus `SUPABASE_SECRET_KEY`, or the documented legacy fallbacks). Do not redirect output to public CI logs: exact object paths contain account/listing UUIDs.

The maximum batch is 100. Progress is the nullable database metadata itself: completed rows are skipped, partial rows generate only missing variants, paths are deterministic, and reruns safely overwrite only the same row-owned derivative path. Originals are read but never overwritten or deleted. A failed row is logged with a sanitized code and the process continues; any failed row makes the command exit nonzero.

## Rollback

### Emergency recovery rollback

Revert only commit `05466b2` if direct signed-source delivery causes an unexpected regression. This restores the previous Vercel optimizer dependency and may reintroduce HTTP 402 while quota remains exhausted. Prefer fixing forward if the incident is active.

### Full application rollback

Roll back consumers and selection logic to `storage_path`; nullable migration columns and unreferenced variant objects are harmless. Do not drop columns or delete variants during an incident. Revert application commits in reverse order only after confirming the target release:

```powershell
git revert 3406b5c 000e9dd acca11b 3e90e8e 1e31f01
```

The exact revert set depends on what was deployed. Never copy this command blindly across a different release graph.

### Backfill rollback

Stop the CLI. The application already falls back to `storage_path`. Leave populated nullable paths and derivative objects in place during the incident. A later, separately approved cleanup may remove exact orphan paths after database reconciliation; never delete Storage objects with SQL.

## Incident response

### Listing images are broken

1. Record route, listing ID, browser, time, and response status without recording signed query strings.
2. Determine whether the request is `/_next/image` or direct Supabase Storage.
3. For `/_next/image` HTTP 402, verify Vercel Image Optimization usage and confirm the deployed listing component contains the direct-media boundary.
4. For direct Storage 4xx, verify listing visibility/RLS, signed URL age, object-path metadata, seller moderation/suspension state, and bucket privacy.
5. For 5xx, inspect sanitized application and Supabase status logs; do not broaden policies.
6. Test the exact source only through an authorized browser/session and redact the query string from evidence.

### Upload failures

- HTTP 400: validate real decoder format, byte/pixel limits, frame count, sort order, and metadata constraint errors.
- HTTP 401/404: verify session, ownership, listing status, and suspended-user enforcement.
- HTTP 429/5xx: the client performs at most three attempts with 250/500 ms backoff using one stable upload UUID.
- Network interruption: outcome is ambiguous, so the client does not replay automatically; it triggers deterministic draft cleanup.
- Storage succeeds but metadata fails: the route removes only paths created by that attempt.
- A stable owner/listing/image upload UUID permits server-side upsert only at those deterministic derivative paths, so an explicit 5xx retry can repair a partial attempt without choosing arbitrary objects.
- If any artifact upload result is ambiguous, the route does not delete deterministic paths that a concurrent same-ID request may own. It returns 503 and logs only listing/image IDs plus object count; the stable retry repairs those private paths. Use the IDs to reconstruct and reconcile them if retries are exhausted.
- If metadata insertion fails, cleanup runs only after a successful same-ID lookup conclusively finds no concurrent winner. A lookup error fails closed with 503 and leaves deterministic private paths for retry/reconciliation.
- Metadata deletion succeeds but Storage cleanup fails: the API returns 202 and leaves an inaccessible orphan for later exact-path cleanup.

### Signed URL or revocation issue

Token expiry and cache expiry are independent. Supabase documents that cached signed responses can outlive token expiry, and Smart CDN deletion invalidation can take up to 60 seconds. Browser caches can remain longer. For moderation/suspension, stop issuing new URLs through RLS and delete/move the underlying object when immediate object revocation is required; allow for CDN propagation and do not promise instant purge.

## Monitoring recommendations

These alerts require operator configuration; this repository does not claim that dashboards already exist.

- Vercel Image Optimization: warn at 70% and page at 90% of transformations/cache units; separately alert on listing-media `/_next/image` requests because the expected count is zero.
- Image HTTP status: warn when listing-image 4xx exceeds 2% for 10 minutes (excluding expected authorization denial); page on 5xx above 1% for 5 minutes.
- Upload pipeline: warn above 2% failed uploads for 15 minutes; page above 5%; alert on any sustained `processing-failed` or metadata cleanup failure.
- Variant backlog: warn when legacy/partial rows stop decreasing during an approved backfill; page if failures exceed 1% of a batch.
- Storage: warn at 70% and 85% of plan allowance; forecast monthly growth from the capacity script.
- Cached egress: warn at 70% and 85% of plan allowance and investigate card/detail size drift.
- Security: alert on service-role variables appearing in client bundles/logs, bucket visibility changes, direct Storage write-policy changes, repeated cross-account denials, and unusual signed-URL creation spikes.

Use structured logs containing operation name, row/listing ID when required, status, sanitized error code, attempt count, and duration. Never log signed URLs, tokens, credentials, raw image bytes, or private user content.

## Capacity command

```powershell
node scripts/media-capacity-model.mjs
```

The output is a planning model, not a bill. Update assumptions with measured average variants, page impressions, gallery depth, and browser-cache reuse before budgeting.

## Provider references (retrieved 2026-11-06)

- Supabase pricing: https://supabase.com/pricing
- Supabase Smart CDN and signed URL caching: https://supabase.com/docs/guides/storage/cdn/smart-cdn
- Supabase private buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase image transformations: https://supabase.com/docs/guides/storage/serving/image-transformations
- Vercel Image Optimization limits/pricing: https://vercel.com/docs/image-optimization/limits-and-pricing
- Cloudflare Images pricing: https://developers.cloudflare.com/images/pricing/
