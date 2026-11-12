# Cloudflare R2 Listing Media Design

## Intent

Move all newly uploaded Lootriva listing images to the private Cloudflare R2 bucket `lootriva-images` behind an explicit server-side feature flag, while preserving Supabase Auth, PostgreSQL, RLS, Realtime, every existing Supabase Storage object, and the established upload-time `card`, `detail`, and normalized `original` WebP pipeline.

## Existing system

The current trusted upload route authenticates the seller, relies on an RLS-bound listing lookup for ownership and suspension enforcement, validates multipart and file limits, decodes real JPEG/PNG/WebP bytes with Sharp, rejects animated or oversized images, and generates three deterministic owner/listing/image WebP paths. Metadata is written only after storage succeeds. Collection reads sign one card image per listing; detail reads sign all detail variants. Listing media bypasses Vercel Image Optimization. Supabase Storage remains private and legacy rows fall back to `storage_path` when variant columns are null.

## Architecture

Add `listing_images.storage_provider` as a constrained, non-null text column with default `supabase`. The default is backward-compatible: existing rows and any old application version continue to represent Supabase objects without rewriting paths. New uploads read `MEDIA_STORAGE_PROVIDER`; `supabase` remains the default and `r2` is accepted only when all server-only R2 settings validate.

The implementation also requires protected upload assignments and a transactional deletion outbox. Assignments pin the server-selected provider and payload digest across retries; a binding trigger prevents client provider tampering. Cleanup jobs retain the actual deleted row's provider and exact paths across listing cascades and process crashes. Completed jobs remain permanent image-ID tombstones; transaction advisory locking serializes insertion checks with deletion, fencing outstanding retries. This additional additive metadata was required by independent security review to make deletion recoverable and prevent resurrection races.

`lib/media-storage/` owns a small provider interface for exact-key upload, exact-key removal, signed GET creation, object download, and object metadata lookup. The Supabase adapter wraps the existing private bucket. The R2 adapter uses the official AWS SDK v3 against `https://<account-id>.r2.cloudflarestorage.com` with region `auto`, path-style disabled, and server-only credentials. No browser upload or application image proxy is introduced.

Authorization remains in Supabase. Application queries first retrieve `listing_images` rows through the same RLS-backed listing/profile relationships and status filters. Only those returned rows are grouped by provider and signed. R2 credentials never decide who may see an image; they only sign an already-authorized exact object key. Signed GET URLs expire after 3,600 seconds, matching current navigation behavior.

Uploads keep the current server-controlled UUID namespace and Sharp pipeline. All three artifacts are uploaded to the selected provider before the RLS client inserts metadata with that provider. Ambiguous partial failures remain retryable by stable upload ID and never delete a possible concurrent winner. Metadata insert failure reconciliation removes only exact keys from the selected provider when safe.

Deletion validates provider initialization first, uses the existing authenticated/RLS mutation and an affected-row result as its authorization gate, then removes exact paths captured transactionally in the cleanup outbox. Listing deletion groups durable jobs by provider. Cleanup failure returns `202 cleanupPending`; the gated manual retry CLI can finish it without reconstructing legacy paths or reusing deleted image IDs.

## Configuration and failure behavior

Server-only variables are `MEDIA_STORAGE_PROVIDER`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. `MEDIA_STORAGE_PROVIDER` defaults to `supabase`; an unknown value fails closed. Selecting `r2` with an incomplete or malformed configuration returns a generic service-unavailable response before object writes. Secrets are never included in errors, logs, API responses, client imports, or documentation values.

## Migration and rollout

The schema migration is additive and forward-only. Phase A deploys provider-aware reads/deletes with Supabase still the default. Phase B validates mocked coverage and then a separately approved non-production R2 integration test. Phase C sets `MEDIA_STORAGE_PROVIDER=r2` only in the intended Vercel environment. Phase D runs a dry-run-first, cursor-resumable backfill in bounded batches. The backfill copies exact existing variants, verifies destination length and SHA-256 metadata, updates `storage_provider` only after all required destination objects verify, emits sanitized JSON progress, and never deletes Supabase sources.

Rollback resets `MEDIA_STORAGE_PROVIDER=supabase` for new uploads. Provider-aware reads continue serving already migrated R2 rows and untouched Supabase rows. The additive column stays in place; no automatic object or column deletion is part of rollback.

## Cost and performance

Routine reads do not list either bucket and sign only selected thumbnail/detail keys already present in query results. Each upload performs three writes. Each R2-backed delivered image requires one local signature computation and one browser GET. Backfill uses one source read and, for a new destination, one PUT plus initial/verification HEADs and a full GET readback per variant. The capacity report retains 10k/50k/100k listing scenarios and adds explicit 10k/50k/100k source-image scenarios, each with three stored objects per image.

## Non-goals and approval boundaries

- Do not deploy, merge, modify a production database, run a production backfill, delete Supabase sources, or retire the legacy bucket.
- Do not expose direct R2 writes, credentials, unrestricted presigned operations, public bucket access, custom-domain presigning assumptions, or caller-selected object keys.
- Do not change listing visibility, suspension, moderation, ownership, image counts, image dimensions, quality, display order, or Vercel image handling.
- Real R2 integration tests require credentials supplied only through an approved environment; unit and route tests use mocks.

