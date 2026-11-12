# Cloudflare R2 Listing Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, reversible R2 provider for new listing media while every legacy Supabase image continues to authorize, render, and delete correctly.

**Architecture:** Store a constrained provider discriminator on each `listing_images` row and route exact-key storage operations through server-only Supabase and R2 adapters. Supabase RLS continues to determine which rows a request may access; only afterward does the application create provider-specific signed GET URLs.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase PostgreSQL/RLS/Storage, Sharp, Cloudflare R2 S3 API, AWS SDK for JavaScript v3, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-r2-listing-media-design.md`

## Global Constraints

- Keep `MEDIA_STORAGE_PROVIDER=supabase` as the default and never require R2 credentials for legacy-only operation.
- Keep the R2 bucket private; never expose credentials, direct unrestricted writes, arbitrary keys, or signed URL tokens in logs.
- Preserve existing RLS authorization, suspension/moderation behavior, drafts, eight-image limit, object paths, variants, order, and `unoptimized` listing delivery.
- Do not deploy, merge, run production SQL, run production backfill, or delete a Supabase source object.
- Use test-first implementation and mocked cloud clients; label any real integration check separately.

## Review Focus

- A missing or partial R2 configuration must fail before writes, without leaking which secret is missing to an API caller.
- Mixed Supabase/R2 result sets must sign only exact authorized keys with the correct provider and preserve result ordering.
- Metadata failure or deletion cleanup must never remove an object belonging to a concurrent retry or the other provider.
- A migrated row must switch providers only after all recorded variants exist in R2 and match expected byte length/integrity metadata.
- Suspended, draft, removed, foreign-owner, and deleted rows must not gain an R2 signing path outside existing RLS-backed queries.

---

### Task 1: Provider metadata and configuration

**Files:**
- Create: `supabase/migrations/202611120002_listing_image_storage_provider.sql`
- Create: `lib/media-storage/config.ts`
- Modify: `.env.example`
- Test: `tests/listing-media-provider-migration.test.ts`
- Test: `tests/media-storage-config.test.ts`

**Interfaces:**
- Produces: `MediaStorageProvider = "supabase" | "r2"`, `resolveMediaStorageProvider(env)`, and `resolveR2Config(env)`.

- [ ] Write failing tests for the additive default, provider constraint, allowed flags, malformed account/bucket values, incomplete credentials, secret-safe errors, and Supabase operation without R2 variables.
- [ ] Run the focused tests and verify the missing interfaces/migration fail.
- [ ] Add the migration, environment examples, and pure validated config resolvers.
- [ ] Run focused tests to green.
- [ ] Commit.

### Task 2: Exact-key storage adapters

**Files:**
- Create: `lib/media-storage/types.ts`
- Create: `lib/media-storage/r2.ts`
- Create: `lib/media-storage/supabase.ts`
- Create: `lib/media-storage/index.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/media-storage-providers.test.ts`

**Interfaces:**
- Produces: `MediaStorage` with `upload`, `remove`, `createSignedUrls`, `download`, and `head`; `createMediaStorage(provider, dependencies?)`.

- [ ] Write failing behavioral tests for R2 endpoint/region/bucket inputs, WebP upload metadata, bounded signed GET expiry, exact batched delete keys, Supabase compatibility, invalid-key rejection, and provider-unavailable failure.
- [ ] Run focused tests and verify red.
- [ ] Install the modular AWS S3 client/presigner and implement server-only adapters with dependency injection for mocks.
- [ ] Run focused tests to green and confirm no R2 module enters client imports.
- [ ] Commit.

### Task 3: Provider-aware upload and cleanup

**Files:**
- Modify: `lib/listing-media-storage.ts`
- Modify: `app/api/listings/[id]/images/route.ts`
- Modify: `app/api/listing-images/[id]/route.ts`
- Modify: `app/api/listings/[id]/route.ts`
- Test: `tests/listing-media-routes.test.ts`
- Test: `tests/listing-media-provider-routes.test.ts`

**Interfaces:**
- Consumes: `createMediaStorage`, provider config, and exact image paths.
- Produces: metadata rows containing `storage_provider` and provider-grouped cleanup for image/listing deletion.

- [ ] Write failing route tests for R2 selection, Supabase default, missing-R2 fail-closed behavior, metadata-after-three-writes, partial failure reconciliation, cross-provider isolation, and mixed-provider listing deletion.
- [ ] Run focused tests and verify red.
- [ ] Replace direct bucket access with the provider abstraction without moving existing authentication/RLS checks.
- [ ] Run route, upload-security, API-integrity, and suspension tests to green.
- [ ] Commit.

### Task 4: RLS-gated provider-aware delivery

**Files:**
- Create: `lib/listing-media-delivery.ts`
- Modify: `lib/data.ts`
- Modify: `lib/phase2-data.ts`
- Modify: `lib/types.ts`
- Test: `tests/listing-media-provider-delivery.test.ts`
- Modify: `tests/listing-media-data.test.ts`
- Modify: `tests/data-image-signing-contract.test.ts`

**Interfaces:**
- Produces: `signAuthorizedListingImages(supabase, selections, expiresIn)` which groups already-returned exact paths by provider and restores input order.

- [ ] Write failing tests for mixed providers, exact-key grouping, legacy default fallback, order preservation, R2 config failure, one-hour expiry, and no bucket listing/proxy behavior.
- [ ] Run focused tests and verify red.
- [ ] Add `storage_provider` to existing RLS-backed selects and centralize signing after row authorization.
- [ ] Run listing, profile, favorites, discovery, conversation, and delivery tests to green.
- [ ] Commit.

### Task 5: Idempotent R2 backfill and capacity model

**Files:**
- Create: `scripts/backfill-listing-images-to-r2.mjs`
- Modify: `scripts/media-capacity-model.mjs`
- Test: `tests/r2-media-backfill.test.ts`
- Test: `tests/media-capacity-model.test.ts`

**Interfaces:**
- Produces: dry-run-default CLI with `--apply`, `--confirm-project-ref`, `--confirm-r2-bucket`, `--batch-size`, and `--cursor`; exact variant copy/head verification and sanitized JSON reports.

- [ ] Write failing tests for dry-run safety, bounded cursor paging, Supabase-only candidate selection, completed-row skipping, retry idempotence, three-variant verification, metadata-last update, no source deletion, and sanitized errors.
- [ ] Run focused tests and verify red.
- [ ] Implement the backfill using the shared provider adapters and extend cost/request scenarios for 10k/50k/100k images.
- [ ] Run focused tests plus credential-free `--help`; never invoke `--apply` against production.
- [ ] Commit.

### Task 6: Operations, rollout, and independent security review

**Files:**
- Create: `docs/operations/r2-listing-media-runbook.md`
- Create: `docs/audits/2026-11-12-r2-listing-media-security-review.md`
- Modify: `README.md`

**Interfaces:**
- Produces: exact Vercel configuration/deployment order, integration-test instructions, phased rollout, backfill/monitoring/reporting steps, rollback, and dated capacity assumptions.

- [ ] Document all server-only variables, preview-first rollout, migration order, mocked versus real integration evidence, backfill commands, rollback, and explicit production approval gates.
- [ ] Run TypeScript, ESLint, Vitest, production build, safe Playwright coverage, secret scan, npm audit, migration/security regressions, and `git diff --check`; record exact evidence and limitations.
- [ ] Dispatch the explicitly requested independent security reviewer against the branch diff, fix Critical/Important findings with regression tests, and re-run affected/full verification.
- [ ] Commit the final evidence, push `feat/r2-image-storage`, and open a PR against `main` without merging or deploying.

