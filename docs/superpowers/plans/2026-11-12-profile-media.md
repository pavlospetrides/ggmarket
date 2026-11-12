# Profile Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, cropped, persistent R2-backed avatars and profile covers throughout Lootriva.

**Architecture:** Store only owner-scoped object keys on `profiles`, normalize crop results with Sharp, and batch-sign keys during existing server data reads. Use an authenticated RLS metadata mutation plus a database cleanup outbox for failure-safe replacement/removal and a PostgreSQL upload ledger for serverless-safe throttling.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL RLS, Cloudflare R2/S3 adapter, Sharp, Radix Dialog, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-profile-media-design.md`

## Global Constraints

- Preserve the private R2 bucket, existing listing media, current CSP fix, all existing migrations, public profile layout, RLS protections, and My Lootriva Card animations.
- Do not store signed URLs, accept client object keys/profile IDs, expose server credentials, proxy routine image bytes, or invoke Vercel image optimization.
- Do not apply a migration to Production, merge, or deploy automatically.
- Maximum source is 10 MiB, 12,000px per dimension, 40 megapixels, JPEG/PNG/WebP, and one frame.
- Avatar output is 1024x1024 WebP; cover output is 2400x800 WebP; upload limit is 10 claims per account per hour.
- New controls meet 44px touch targets, keyboard operation, focus management, safe-area, reduced-motion, and responsive requirements.

## Review Focus

- Concurrent replacement requests must never enqueue or delete the object ultimately stored in the profile row; pin with route reconciliation and SQL trigger tests in Task 3.
- A malformed multipart request without a trustworthy content length must stop at the streaming byte cap; pin with bounded-reader tests in Task 2.
- Crop rectangles affected by EXIF orientation must still yield the previewed region; pin with oriented fixture tests in Task 2.
- One expired signed avatar among repeated seller identities must trigger at most one refresh and no query-per-avatar behavior; pin with delivery/component tests in Task 4.
- Long names and 320px safe-area layouts must keep owner controls reachable without overlap; pin with Chromium/WebKit responsive assertions in Task 6.

---

### Task 1: Additive profile-media schema and ownership contract

**Files:**
- Create: `supabase/migrations/202611120003_profile_media.sql`
- Create: `tests/profile-media-migration.test.ts`

**Interfaces:**
- Produces: nullable `profiles.cover_path`, constrained `avatar_path`/`cover_path`; `claim_profile_media_upload()`; `profile_media_cleanup_jobs`; replacement trigger.

- [ ] Write migration contract tests for nullable rollout, public select grants, owner-only updates, suspended-account trigger coverage, exact key constraints, rate limit, cleanup snapshots, safe `search_path`, and no changes to listing storage.
- [ ] Run `npx vitest run tests/profile-media-migration.test.ts` and verify the new migration is missing.
- [ ] Add the ordered additive migration. Revoke direct access to ledgers/jobs, grant the narrow RPC to authenticated, preserve existing profile grants, and make the cleanup trigger snapshot only old non-null keys after a distinct metadata change.
- [ ] Re-run the focused test and `npx vitest run tests/listing-media-provider-sql.test.ts tests/account-ratings-migration.test.ts`.
- [ ] Commit as `feat: add profile media data contract`.

### Task 2: Image validation, crop math, and R2 object contract

**Files:**
- Create: `lib/profile-media.ts`
- Create: `lib/profile-media-storage.ts`
- Modify: `lib/security.ts`
- Create: `tests/profile-media-processing.test.ts`
- Create: `tests/profile-media-storage.test.ts`
- Modify: `tests/image-upload-security.test.ts`

**Interfaces:**
- Produces: `ProfileMediaKind`, `ProfileCrop`, `processProfileMedia(bytes, kind, crop)`, `buildProfileMediaPath(ownerId, kind, mediaId)`, `readLimitedMultipartForm(request, limit?)`, and outbox-only cleanup helpers.

- [ ] Write failing tests for valid avatar/cover crops, zoom-derived rectangles, EXIF orientation, Retina output dimensions, WebP encoding, bad MIME/content, malformed bytes, animation, oversized bytes/pixels/dimensions, invalid crop bounds, UUID/path manipulation, streaming body overflow, upload failure, and pending cleanup.
- [ ] Run the focused tests and confirm behavior is absent.
- [ ] Implement strict crop parsing and sequential Sharp metadata/decode/render with `failOn: "error"`, pixel limits, single-frame validation, orientation normalization, fixed cover/avatar output, and metadata stripping.
- [ ] Implement server-generated `profile-media/<owner>/<kind>/<uuid>.webp` paths and R2 upload/removal wrappers that accept only derived paths or database outbox rows.
- [ ] Re-run focused tests and existing listing media/security tests.
- [ ] Commit as `feat: secure profile media processing`.

### Task 3: Authenticated upload, replacement, removal, and retryable cleanup

**Files:**
- Create: `app/api/profile/media/[kind]/route.ts`
- Create: `lib/profile-media-service.ts`
- Modify: `app/api/profile/route.ts`
- Create: `tests/profile-media-api.test.ts`
- Create: `tests/profile-media-cleanup.test.ts`

**Interfaces:**
- Consumes: Task 1 RPC/outbox and Task 2 processing/storage.
- Produces: `POST /api/profile/media/{avatar|cover}` and `DELETE /api/profile/media/{avatar|cover}` returning current media metadata and cleanup status.

- [ ] Write failing route tests for auth, session-derived ownership, cross-account/path rejection, suspension, rate limiting, invalid kind/file/MIME/content/crop, successful upload, replacement, remove/reset, metadata failure reconciliation, ambiguous R2 failure, cleanup retry, and protected-column non-modification.
- [ ] Run the focused tests and verify the routes are absent.
- [ ] Implement the Node route: authenticate, validate kind and bounded multipart data, check active status, claim a DB rate slot, process, generate UUID/path, upload, update only the matching owner media column through the session client, reconcile, and drain only verified outbox jobs.
- [ ] Keep textual profile updates independent and ensure media endpoints cannot accept username, profile ID, object key, admin, or suspension fields.
- [ ] Re-run focused API/cleanup tests plus existing profile/listing route tests.
- [ ] Commit as `feat: add profile media mutation routes`.

### Task 4: Authorized delivery and shared avatar rendering

**Files:**
- Create: `lib/profile-media-delivery.ts`
- Create: `components/profile-media-image.tsx`
- Create: `components/profile-avatar.tsx`
- Modify: `lib/types.ts`
- Modify: `lib/data.ts`
- Modify: conversation data/types and existing seller identity components found by the implementation inventory.
- Create: `tests/profile-media-delivery.test.ts`
- Modify: `tests/data-image-signing-contract.test.ts`
- Create: `tests/profile-avatar.test.tsx`

**Interfaces:**
- Produces: batch `signAuthorizedProfileMedia`, `Seller.coverUrl`, an unoptimized refresh-on-expiry image, and initials fallback shared by profile, listings, seller cards, and conversations.

- [ ] Write failing tests for R2 signing, private bucket URLs, expiry refresh, missing/stale object fallback, unique-path batching, no per-avatar profile queries, public seller rendering, persistence after a fresh data read, and stable initials/gradient fallbacks.
- [ ] Run focused tests and confirm raw object keys are currently exposed as URLs.
- [ ] Batch-sign distinct profile keys already returned by authorized queries, preserve server-render parallelism, and never store signatures. Add cover data to profile reads and avatar data to existing conversation/seller reads without new per-item queries.
- [ ] Render signed images with `next/image` `unoptimized`, fixed dimensions/sizes, one guarded router refresh on signature failure, and accessible fallback behavior.
- [ ] Re-run focused delivery/data tests and listing-media regression tests.
- [ ] Commit as `feat: deliver authorized profile media`.

### Task 5: Accessible crop editor and owner profile/settings UI

**Files:**
- Create: `components/profile-media-editor.tsx`
- Create: `components/profile-media-controls.tsx`
- Modify: `components/profile-view.tsx`
- Modify: `components/settings-form.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/globals.css` only if existing utilities cannot express crop/safe-area behavior.
- Create: `tests/profile-media-editor.test.tsx`
- Modify: `tests/profile-layout.test.ts`

**Interfaces:**
- Consumes: Task 3 routes and Task 4 renderers.
- Produces: upload/change/remove/reset controls, local preview, pointer/keyboard repositioning, zoom, confirmations, and immediate refresh.

- [ ] Write failing component/contract tests for selection preview, avatar 1:1 crop, cover 3:1 crop, zoom, pointer and keyboard position, save/loading/error/success states, replacement/removal confirmation, owner-only controls, public absence, dialog focus/escape/labels, and object URL cleanup.
- [ ] Run focused tests and confirm editor UI is absent.
- [ ] Implement a dynamically loaded client editor using the existing Radix Dialog, native range input, normalized crop coordinates, high-density preview, live regions, guarded object URLs, and explicit upload/removal actions.
- [ ] Integrate the shared avatar and cover into the existing header without changing dimensions; add dark cover scrim and owner-only avatar/Edit Cover affordances. Add Profile Photo and Cover Photo settings sections while keeping textual form dirty-state behavior isolated.
- [ ] Re-run component/layout/settings tests, typecheck, and lint affected files.
- [ ] Commit as `feat: add profile media editor`.

### Task 6: Browser coverage, security review, operations docs, and delivery evidence

**Files:**
- Create: `app/test-harness/profile-media/page.tsx` if authenticated disposable data is unavailable.
- Create: `tests/e2e/profile-media.spec.ts`
- Create: `docs/profile-media-deployment.md`
- Modify: `.env.example`
- Modify: `next.config.ts`/`proxy.ts` only if source inspection and browser evidence show the merged R2 CSP is insufficient.

**Interfaces:**
- Produces: mocked-R2 unit evidence, explicitly gated real-R2 integration instructions, responsive screenshots, deployment/rollback runbook, and PR evidence.

- [ ] Write browser tests for desktop/mobile avatar and cover workflows, public rendering, refresh persistence, loading/error states, keyboard/focus, 320/390/768/1440 layouts, Chromium, and WebKit. Gate state-changing tests on a verified disposable Supabase target.
- [ ] Run focused Chromium and WebKit tests only against an isolated test target; otherwise run the non-mutating harness coverage and report the environment limitation without claiming live persistence.
- [ ] Document migration order, R2/Vercel variables, private bucket/CSP requirements, mocked versus real integration checks, rollout smoke tests, cleanup monitoring/retry, rollback, and the explicit instruction not to modify Production automatically.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, relevant Playwright Chromium/WebKit projects, `npm run build`, `npm audit`, and `npx supabase db lint`/local migration checks when a disposable local Supabase runtime is available.
- [ ] Inspect the final diff against every requirement and perform the requesting-code-review checklist inline because repository policy disables subagents unless explicitly authorized. Fix Critical/Important findings and rerun affected gates.
- [ ] Capture clean desktop/mobile UI screenshots without secrets, commit as `test: verify profile media feature`, push `feat/profile-media`, and open a PR against `main` with exact results and limitations. Do not merge or deploy.

## Self-review

- Coverage: storage, schema/RLS, ownership, upload hardening, crop/reposition, replacement/removal/fallback, public rendering, expiry, lifecycle, UI, performance, tests, deployment, and rollback all map to tasks.
- Boundaries: listing media is reused only through the generic R2 adapter and bounded reader; listing paths, providers, routes, and cleanup remain unchanged.
- Type consistency: `ProfileMediaKind`, `ProfileCrop`, `Seller.coverUrl`, and the two media endpoints are introduced once and consumed downstream.
- Highest-risk concurrency, streaming, orientation, expiry, query batching, and responsive cases are pinned in the owning tasks.
