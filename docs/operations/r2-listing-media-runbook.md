# Cloudflare R2 listing media rollout

Updated 2026-11-12, Europe/Athens. This document authorizes no production changes. The implementation branch does not merge, deploy, apply SQL, change buckets, or migrate production photos.

## Architecture and authorization

Supabase remains the source of truth for authentication, listing ownership, listing/image RLS, account suspension, moderation, ordering, and marketplace data. Images use the existing sequential Sharp pipeline: metadata-stripped WebP original (2560 px, quality 86), detail (1600 px, 82), and card (640 px, 78). The input limits remain 10 MiB, 40 megapixels, 12000 px per side, JPEG/PNG/WebP only, one frame, and eight images per listing. Collection pages sign the first card image; detail pages sign detail variants. Listing photos remain `unoptimized` and go directly to the selected private storage service.

`listing_images.storage_provider` identifies each row's provider; omitted legacy values resolve to Supabase. Existing paths never change. A protected `listing_image_storage_assignments` table reserves provider, owner, listing, image ID, and processed-original SHA-256 before writing objects. Only the server's Supabase service role can access it. A database trigger derives new row providers from these reservations and prevents authenticated users from changing provider, identity, or R2 paths. Existing ownership/path/count/suspension validation and RLS still run when the caller inserts metadata. Reservation conflicts reject a different payload or namespace; retries stay on the original provider after flag changes.

Signing uses only exact paths returned by existing caller-bound RLS queries. It does not expose an arbitrary-path signing endpoint or use a service-role query to authorize public delivery. One-hour R2 GET signatures are generated locally with AWS SDK v3 against the account's S3 endpoint, region `auto`; no custom domain, image proxy, or per-view transformation is involved. Supabase legacy signing stays RLS-bound and batched. A mixed result set makes one signing operation per provider. R2 signing itself consumes no R2 API requests.

An expired image error causes a throttled `router.refresh()` to rerun the page's current RLS reads and issue fresh URLs. Permission changes can therefore prevent renewal. A signed URL is a bearer capability until expiry, and previously cached image bytes may remain in the browser for the five-minute cache lifetime. Immediate revocation of already downloaded bytes is impossible. Do not log URLs, query strings, or raw SDK errors. Like all S3 presigned URLs, the URL includes the signing access-key **identifier**; it never includes the secret access key or unrestricted write credentials.

## Required SQL, before application rollout

New migration: `supabase/migrations/202611120002_listing_image_storage_provider.sql`, after the existing `202611120001_gg_card_custom_colors.sql` and the established image-variants migration. Do not reapply or edit historical migrations.

It adds a constrained provider column defaulting to `supabase`, a server-only assignment table, the provider-binding trigger, and a transactional cleanup outbox. The outbox retains exact paths and provider without foreign keys so it survives listing/profile cascades. Completed rows remain permanent image-ID tombstones. Insertion and deletion serialize their tombstone check using a per-image PostgreSQL transaction advisory lock; a lock-order conflict may abort one transaction safely, and storage cleanup never follows a failed metadata delete. Existing listing/image authorization and suspension triggers still apply. The migration does not update paths or existing provider values, change bucket visibility, or broaden any RLS policy. Adding the constant-default column is metadata-only on modern PostgreSQL, but the ALTER still requires a brief table lock: apply during a quiet window with an operator-chosen lock timeout and an inspected backup.

First validate in a disposable Supabase project, inspect migration history, run `supabase db push --dry-run` against that explicitly verified project, then apply only the intended pending migration there. The embedded PostgreSQL tests validate the new SQL and selected existing RLS/path policies; they do not replace a complete hosted Supabase migration test. Production SQL requires separate owner approval and verified project identity. Provider-aware application selects require this migration even while new uploads remain on Supabase.

## Exact Vercel environment variables

Set these in Project → Settings → Environment Variables for the intended environment only. Add credentials directly in Vercel's secret UI; never paste them into chat, PRs, Git, screenshots, or client variables.

| Variable | Value / purpose | Scope |
| --- | --- | --- |
| `MEDIA_STORAGE_PROVIDER` | `supabase` initially; explicit `r2` enables new R2 uploads | Server only |
| `R2_ACCOUNT_ID` | Cloudflare account's 32-character hexadecimal ID | Server only |
| `R2_BUCKET_NAME` | `lootriva-images` for the approved production bucket; separate test bucket in Preview | Server only |
| `R2_ACCESS_KEY_ID` | Restricted R2 S3 API access key identifier | Server only |
| `R2_SECRET_ACCESS_KEY` | Corresponding restricted R2 S3 secret | Server only, secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing environment-specific project URL | Existing public config |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing public anon key, with RLS enabled | Existing public config |
| `SUPABASE_URL` and `SUPABASE_SECRET_KEY` | Existing privileged server configuration for uploads, reservations, and cleanup | Existing server secrets |

The existing `SUPABASE_SERVICE_ROLE_KEY` fallback remains supported. Never use `NEXT_PUBLIC_` for privileged keys or R2 configuration. Empty/absent media flag means `supabase`; unknown flags and incomplete R2 configuration fail initialization safely. Uploads fail before object writes; deletion validates provider initialization before deleting metadata. Cryptographically invalid/revoked credentials can only be detected by actual R2 operations; failures remain generic and do not create image rows.

Use bucket-scoped object read/write credentials only. Keep public access and `r2.dev` disabled and storage class Standard. Eastern Europe is a bucket placement setting; the S3 client region remains `auto`. This application does not change CORS or bucket configuration. Plain `<img>` GET delivery does not require CORS; if another feature later needs canvas/fetch access, approve a narrow GET/HEAD CORS policy for exact intended origins. No browser PUT is implemented.

## Vercel deployment sequence and approval gates

1. Review and merge the PR separately. This work does not merge it or change auto-deployment settings.
2. Apply the new SQL to an approved disposable test project. Configure an isolated Preview to use that project's public/server Supabase keys and a separate private R2 test bucket. Keep `MEDIA_STORAGE_PROVIDER=supabase`; redeploy that Preview so the new environment is loaded.
3. Verify legacy images, draft privacy, seller ownership, suspended accounts, removed listings, and deletion in Preview. Confirm no listing photo request uses `/_next/image`.
4. Set `MEDIA_STORAGE_PROVIDER=r2` **only in that Preview environment** and redeploy. Upload a disposable JPEG/PNG/WebP; verify original/detail/card objects, exact database provider, direct signed GET success, expiry recovery, replacement, and cross-account denial. Remove only disposable test records via the application. Inspect logs for generic errors and no URL tokens/secrets.
5. Before Production: approve the migration and deployment separately, verify the production project, backups, migration history, and Vercel environment. Apply the approved SQL before deploying provider-aware code. Set Production `MEDIA_STORAGE_PROVIDER=supabase`, keep both buckets private, and explicitly deploy the reviewed commit. Verify mixed/legacy reads before enabling R2.
6. After successful test integration and owner approval, enter Production R2 variables and set the Production flag to `r2`; explicitly redeploy to pick up configuration. Observe upload/signing errors, cleanup backlog, R2 request counts, bytes, and private-draft access. An old in-flight upload stays on its reserved provider.
7. Approve backfill separately and migrate small batches. Verify gallery order, thumbnails, drafts, suspended/removed content, and database provider counts after each batch.
8. Retire Supabase objects only after a separate approved backup/retention project. No script here deletes migration sources.

Do not enable R2 until a real disposable-environment integration check passes. Cloud credentials were not supplied to the tests in this branch, and no live R2 operation is claimed verified.

## Backfill: dry-run, resume, and integrity

Use Node 22+ with the installed development dependencies (`tsx`) on a trusted operator machine. Supply the existing Supabase admin and R2 variables through an approved secret environment file outside Git. The CLI needs `--conditions=react-server` because it reuses server-only adapters. It queries a bounded page of Supabase metadata; it never lists buckets.

Credential-free help:

```powershell
node scripts/backfill-listing-images-to-r2.mjs --help
```

Dry run (metadata reads only; no R2 initialization or object reads/writes):

```powershell
node --conditions=react-server --import=tsx --env-file=C:/secure/media-test.env scripts/backfill-listing-images-to-r2.mjs --batch-size 25
```

After separate approval for the exact environment, add `R2_BACKFILL_ALLOW_APPLY=1` to that process environment and run:

```powershell
node --conditions=react-server --import=tsx --env-file=C:/secure/media-test.env scripts/backfill-listing-images-to-r2.mjs --apply --confirm-project-ref YOUR_APPROVED_REF --confirm-r2-bucket YOUR_APPROVED_BUCKET --batch-size 25
```

Record the JSON reports in an access-controlled operator log. Add `--cursor IMAGE_UUID` using the prior report's `nextCursor`. Do not use `scanCursor` after a failure: `nextCursor` deliberately stops before the first failed row. Repeating a batch skips already migrated rows and compares existing R2 bytes before avoiding a PUT. The script copies each distinct recorded original/card/detail key unchanged, including legacy original formats; null variants retain the original fallback. It checks HEAD length plus a full SHA-256 GET readback. Metadata changes only after all variants verify and a compare-and-swap matches provider, listing ID, and all original path fields. Display order and listing relationships never change. Failed/CAS-conflicted copies remain private and can be reconciled on retry; source images are never removed.

Stop on error spikes. Investigate failed row IDs using privileged operator tooling without logging credentials or signed URLs. A stale source row, missing object, or unsupported original format remains on Supabase. Do not advance a cursor past unresolved failures. The older Supabase variant backfill now explicitly filters Supabase rows and guards its update against concurrent provider/path changes, so it cannot attach Supabase-only variants to R2 rows. Complete desired variant generation before the R2 migration.

## Failure recovery and cleanup

Storage and metadata are separate systems. Partial/ambiguous uploads retain private deterministic keys and their server reservation for safe retry; metadata is never created before all three objects succeed. A different payload with the same ID is rejected by its digest reservation. The application logs only listing/image IDs and counts for pending cleanup. Never delete keys merely because one concurrent metadata lookup returned no row.

Authorized deletion confirms an affected database row before removing objects. Configuration errors fail before metadata deletion. In that same deletion transaction, the database stores the actual deleted row's provider and every exact path in `listing_image_cleanup_jobs`. Object removal uses this durable snapshot, including rows captured by listing cascades, rather than an earlier application lookup. A crash or object-removal failure retains a pending job and returns `202 { cleanupPending: true }` when a response is possible. Successful cleanup marks `completed_at`; it never removes the tombstone. Both application reservations and the metadata trigger reject a deleted image ID, including outstanding retries. Replacement requires a fresh UUID.

There is no automatic background cleanup worker. Inspect pending jobs using privileged tooling, obtain approval for the exact environment, and retry with the bounded operator CLI. Credential-free help:

```powershell
node scripts/retry-listing-media-cleanup.mjs --help
```

Dry-run uses the same trusted secret environment file and target as the backfill:

```powershell
node --conditions=react-server --import=tsx --env-file=C:/secure/media-test.env scripts/retry-listing-media-cleanup.mjs --batch-size 25
```

Only after approval, set `MEDIA_CLEANUP_ALLOW_APPLY=1` in that process environment and add `--apply --confirm-project-ref YOUR_APPROVED_REF --confirm-r2-bucket YOUR_APPROVED_BUCKET`. This command deletes only exact keys already committed by an authorized metadata deletion, and marks successful jobs complete. Stop on failures and resume from `nextCursor`; repeating a removal is idempotent. Never purge completed job rows: they fence old retry IDs. Ambiguous uploads without a metadata row remain separate from authorized-deletion jobs: investigate reservations, quiesce relevant uploads, verify no current row references those exact keys, and obtain separate approval before removing them. No bucket-wide deletion or page-load bucket scan is used.

## Rollback

Set `MEDIA_STORAGE_PROVIDER=supabase` in the affected Vercel environment and explicitly redeploy after approval. Continue running provider-aware code: existing R2 rows still need R2 read credentials and their R2 objects. Retain the additive SQL and assignment records. This stops new R2 reservations; in-flight reserved R2 uploads still finish on R2. Do not delete R2 objects, rewrite paths, drop columns, or revert to provider-unaware code after R2 uploads exist.

If a migrated image must return to Supabase, use a separately approved operator procedure: verify all recorded Supabase source objects against a backup, quiesce uploads/backfill, then change only those confirmed rows' providers with the service role. New R2-only images need verified reverse copies first. No automatic reverse migration is provided.

## Capacity and request model

Run `node scripts/media-capacity-model.mjs`. The original listing-count model is retained; `r2ImageScenarios` answers image counts directly. One source image stores three objects, averaging 70 KB card + 220 KB detail + 600 KB original. Routine pages never issue HEAD or LIST calls. Each new image costs three Class A PUTs; signatures are local CPU work; each actual browser object fetch is a Class B GET. Backfill uses up to three R2 reads per variant (initial HEAD, verification HEAD, verification GET) plus one PUT and one Supabase source read; verified retries use HEAD+GET without another PUT.

| Source images | Stored objects | Storage GB | Monthly Class A PUTs | Monthly Class B GETs | Model R2 USD/month |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 | 30,000 | 8.9 | 3,600 | 84,500 | 0.00 |
| 50,000 | 150,000 | 44.5 | 18,000 | 422,500 | 0.53 |
| 100,000 | 300,000 | 89 | 36,000 | 845,000 | 1.19 |

Assumptions: five photos/listing, 50 card impressions and five detail views/listing/month, three detail images/view, 35% browser-cache reuse, 12% new/replacement images/month, full-month stable storage, and otherwise-unused account free allowances. Standard pricing checked 2026-11-12: $0.015/GB-month, $4.50/million Class A, $0.36/million Class B, 10 GB + 1m A + 10m B monthly free, no R2 internet egress fee; billable units round up. These are illustrative usage estimates, excluding Vercel compute, Supabase costs/source egress, tax, retries, monitoring, shared-account usage, and retained legacy copies. Measure actual traffic and file sizes before budgeting. [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Verification commands

```powershell
npm run typecheck
npm run lint
npm test
node scripts/verify-media-build.mjs
node scripts/backfill-listing-images-to-r2.mjs --help
node scripts/media-capacity-model.mjs
```

`verify-media-build.mjs` runs `npm run build` using a local empty API fixture and fake R2 secret sentinels. It proves compilation/prerendering without cloud access; it does not prove hosted schema/data or live R2 credentials. Do not deploy that local fixture build. Deploy the source through Vercel with the approved real environment.

Local mocked browser checks:

```powershell
$env:E2E_UI_HARNESS='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3107/test-harness/sell'
$env:PLAYWRIGHT_WEB_SERVER_COMMAND='npm run dev -- --port 3107'
$env:PLAYWRIGHT_REUSE_SERVER='false'
npx playwright test tests/e2e/media-refresh-safe.spec.ts tests/e2e/sell-touch-safe.spec.ts --project=chromium --project=webkit --reporter=line
```

Hosted Supabase security scripts require a separately verified disposable target and mutation opt-in; never point them at Production. Final observed results and independent review findings are recorded in `docs/audits/2026-11-12-r2-listing-media-security-review.md`.
