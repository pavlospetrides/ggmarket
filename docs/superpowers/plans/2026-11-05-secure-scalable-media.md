# Secure Scalable Listing Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore listing images without Vercel transformations and add a private, upload-time variant pipeline with legacy fallback, bounded delivery, migration tooling, and production-readiness evidence.

**Architecture:** Generate `card`, `detail`, and normalized `original` WebP objects at trusted upload time, store their exact paths on the existing `listing_images` row, and centrally choose/sign the smallest authorized variant. Listing media bypasses only the Next.js optimizer; legacy rows fall back to their current private signed original until a separately approved backfill.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Sharp, Supabase PostgreSQL/RLS/Storage, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-secure-scalable-media-design.md`

## Global Constraints

- Do not deploy, merge, apply a production migration, run a production backfill, mutate production data, or add a paid service.
- Never weaken RLS, make the private bucket public, expose privileged keys, accept arbitrary remote URLs, or log signed URL tokens.
- Preserve all legacy object paths, listing ownership, order, drafts, suspension/moderation behavior, and unrelated functionality.
- Use test-first implementation and immutable/versioned object names; every destructive operation must target exact recorded paths.
- State-changing Supabase/browser security tests require a verified disposable environment.

## Review Focus

- A legacy row with no variant metadata must render through its authorized original without `/_next/image`.
- A partial upload must remove only newly created objects and must not leave a metadata row.
- Cross-account, suspended, moderated, and draft access must remain denied by the existing database/Storage boundary.
- Deletion must cover original, card, and detail paths without accepting caller-controlled paths.
- Collection pages must not sign or download every gallery image.

---

### Task 1: Emergency direct-media boundary

**Files:**
- Create: `components/listing-media-image.tsx`
- Modify: listing-card, discovery-card, gallery, edit-thumbnail, message, and favorites listing-image consumers
- Test: `tests/listing-media-delivery.test.ts`

**Interfaces:**
- Produces: `ListingMediaImage(props: ImageProps)` that preserves Next image layout/lazy behavior while setting `unoptimized`.

- [ ] Write a failing render/contract test proving listing media bypasses `/_next/image` while static brand images remain unchanged.
- [ ] Run the focused test and confirm the wrapper/consumer contract is absent.
- [ ] Add the wrapper and migrate every user listing-image consumer.
- [ ] Run the focused test and relevant existing layout/gallery tests.
- [ ] Commit the independently deployable emergency recovery.

### Task 2: Variant processing and path selection

**Files:**
- Create: `lib/listing-media.ts`
- Modify: `lib/listing-image-security.ts`
- Modify: `lib/types.ts`
- Test: `tests/listing-media.test.ts`
- Test: `tests/image-upload-security.test.ts`

**Interfaces:**
- Produces: `selectListingImagePath(record, purpose)`, `buildListingImagePaths(ownerId, listingId, imageId)`, and `processListingImage(bytes)` returning original/card/detail artifacts and metadata.

- [ ] Write failing table tests for exact variant preference, legacy fallback, immutable safe paths, accepted formats, rejected spoof/SVG/animation, and output dimension bounds.
- [ ] Run focused tests and confirm failures are caused by missing interfaces.
- [ ] Implement pure selection/path helpers and sequential bounded Sharp outputs.
- [ ] Run focused tests to green and mutation-check wrong-purpose/wrong-limit branches.
- [ ] Commit.

### Task 3: Additive schema and Storage authorization

**Files:**
- Create: `supabase/migrations/202611050001_listing_image_variants.sql`
- Test: `tests/listing-media-migration.test.ts`

**Interfaces:**
- Produces nullable `card_path`, `detail_path`, byte counts, `mime_type`, and `media_version` columns; exact-path private Storage SELECT policy.

- [ ] Write a failing migration contract test covering additive columns, uniqueness, exact recorded-path authorization, unchanged private bucket state, and absence of broad grants.
- [ ] Run it and confirm failure.
- [ ] Add an idempotent-safe, forward-only migration without editing prior history.
- [ ] Run migration and fresh-bootstrap contract tests.
- [ ] Commit.

### Task 4: Atomic trusted upload and deletion

**Files:**
- Modify: `app/api/listings/[id]/images/route.ts`
- Modify: `app/api/listing-images/[id]/route.ts`
- Modify: `app/api/listings/[id]/route.ts`
- Test: `tests/listing-media-routes.test.ts`

**Interfaces:**
- Consumes: Task 2 artifacts/paths and Task 3 columns.
- Produces: three-object upload with cleanup and exact multi-variant delete.

- [ ] Write failing route tests for generated ownership paths, cache control, metadata fields, partial cleanup, and deletion of all recorded paths.
- [ ] Run focused tests and verify red.
- [ ] Implement uploads only after all processing succeeds; remove created paths on any Storage/database failure.
- [ ] Update image/listing deletion to select and remove exact non-null recorded paths.
- [ ] Run route, security, API-integrity, and admin-config tests.
- [ ] Commit.

### Task 5: Centralized signing and bounded collection payloads

**Files:**
- Modify: `lib/data.ts`
- Modify: `lib/types.ts`
- Test: `tests/listing-media-data.test.ts`
- Modify: `tests/data-image-signing-contract.test.ts`

**Interfaces:**
- Consumes: `selectListingImagePath`.
- Produces: card/detail signing modes and enriched image records carrying authorized URLs only.

- [ ] Write failing tests proving collection mode signs only first ordered card paths, detail mode signs every detail path, and legacy rows fall back.
- [ ] Run focused tests and verify red.
- [ ] Extend the select shape and enrichment mode; keep one batched signing request and one-hour expiry.
- [ ] Route listing detail/edit to detail mode and collection consumers to card mode.
- [ ] Run data, pagination, listing, favorites, browse, and profile tests.
- [ ] Commit.

### Task 6: Resilient Sell Wizard uploads

**Files:**
- Create: `lib/listing-upload.ts`
- Modify: `components/sell-wizard.tsx`
- Test: `tests/listing-upload.test.ts`
- Modify: `tests/task7-forms.test.ts`

**Interfaces:**
- Produces: abortable XHR upload with progress and bounded transient retry; ordered photo list controls.

- [ ] Write failing tests for retry classification/backoff, abort propagation, progress aggregation, count/size rejection, and stable ordering.
- [ ] Run focused tests and verify red.
- [ ] Implement the pure retry/progress helpers, then connect XHR transport in the wizard.
- [ ] Add drag/drop, left/right ordering, progress/status, cancellation, and actionable errors without changing listing ownership.
- [ ] Run focused unit tests and safe Sell Wizard Playwright harness tests in Chromium/WebKit.
- [ ] Commit.

### Task 7: Gated legacy backfill and operations

**Files:**
- Create: `scripts/backfill-listing-image-variants.mjs`
- Create: `scripts/media-capacity-model.mjs`
- Create: `docs/operations/listing-media-runbook.md`
- Create: `docs/audits/2026-11-05-listing-media-production-readiness.md`
- Test: `tests/media-backfill-guard.test.ts`

**Interfaces:**
- Produces: dry-run-default, bounded, resumable, idempotent backfill; reproducible object/storage/bandwidth model; incident and rollback guidance.

- [ ] Write failing guard tests for explicit apply/project confirmation, batch ceiling, completed-row skipping, exact-path logs, and no secret/signed-URL output.
- [ ] Run focused tests and verify red.
- [ ] Implement the CLI using existing admin-config resolution and shared processing logic.
- [ ] Add capacity output for 10k/50k/100k listings and document dated official price assumptions separately from guarantees.
- [ ] Document deployment order, migration verification, alerts, cache/revocation limits, rollback, and three independent GO/NO-GO gates.
- [ ] Run the backfill only in dry-run/no-credential help mode; do not point it at production.
- [ ] Commit.

### Task 8: Full verification and delivery

**Files:**
- Modify audit/runbook only for observed results.

**Interfaces:**
- Produces the reviewable feature branch and PR against `main`.

- [ ] Run focused tests after each task, then full `npm test`, TypeScript, ESLint, production build, security scripts, secret scan, and `git diff --check`.
- [ ] Run read-only Chromium mobile/desktop production diagnostics and local safe browser coverage; never claim state-changing E2E without a disposable target.
- [ ] Use `verification-before-completion`, then `requesting-code-review` and address findings.
- [ ] Inspect commits/diff against `origin/main`, push `feat/secure-scalable-media`, and open a PR without merging or deploying.
- [ ] Complete the production-readiness report with exact passed, failed, skipped, and blocked evidence.
