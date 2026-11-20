# Supabase Egress Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce confirmed avoidable Supabase database and Realtime egress while preserving security and user-visible behavior.

**Architecture:** Keep the existing Supabase DAL and Realtime design, but reduce list projections, batch known-ID hydration, and make reconciliation incremental and fallback-only. Cache only globally public category data and leave private media/signing dynamic.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase JS/PostgREST/Realtime/Storage, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-supabase-egress-optimization-design.md`

## Global Constraints

- Preserve RLS, Auth, private media, Seller Verification, Admin Moderation, and R2 compatibility.
- Do not mutate production data, migrate/delete media, merge, or deploy.
- Shared caching is permitted only for public active categories.
- Every behavior change follows a red-green-refactor cycle.
- Preserve `supabase/migrations/202611200001_catalog_categories_read_policy.sql` unchanged.

## Review Focus

- A malicious or malformed message cursor must not broaden a query or bypass conversation RLS; Task 3 validates and rejects it.
- Realtime disconnects must still recover missed messages without full-history polling; Task 3 covers fallback state and incremental queries.
- Featured campaigns containing missing/inactive listings must preserve valid campaign order and seller fairness; Task 2 covers filtering and ordering.
- Card projections must retain intent/wanted-price fields and first-image delivery metadata; Task 1 maps representative rows through real domain logic.
- No authenticated or personalized query may enter the category cache; Task 4 tests/import-checks the isolated public cache module.

---

### Task 1: Bounded card projections

**Files:**
- Modify: `lib/data.ts`
- Test: `tests/data-egress-contract.test.ts`

**Interfaces:**
- Produces: `listingCardSelect`, `listingDetailSelect`, and card/detail row loaders used within `lib/data.ts`.

- [ ] Write a failing test proving card queries omit detail-only columns while mapped cards retain required visible behavior.
- [ ] Run `npx vitest run tests/data-egress-contract.test.ts` and confirm the expected failure.
- [ ] Split projections and route every collection query through the card projection while detail/edit reads use the detail projection.
- [ ] Run the focused test and relevant listing/data tests.
- [ ] Commit the task.

### Task 2: Batch featured listings

**Files:**
- Modify: `lib/data.ts`
- Modify: `lib/featured-listings.ts`
- Test: `tests/featured-listings.test.ts`

**Interfaces:**
- Produces: `getListingsByIds(ids: readonly string[]): Promise<Listing[]>` with a 60-ID bound and one enrichment pass.

- [ ] Write a failing test proving featured hydration calls one batch loader, never calls expiration RPC, preserves campaign order, and respects the requested limit.
- [ ] Run the focused test and confirm the expected failure.
- [ ] Implement the bounded loader and switch featured reads to it.
- [ ] Run focused featured and listing tests.
- [ ] Commit the task.

### Task 3: Incremental Realtime reconciliation

**Files:**
- Create: `lib/message-reconciliation.ts`
- Modify: `app/api/conversations/[id]/messages/route.ts`
- Modify: `components/chat-interface.tsx`
- Test: `tests/message-reconciliation.test.ts`
- Test: `tests/message-api.test.ts`

**Interfaces:**
- Produces: cursor parsing/query helpers and fallback scheduling decisions shared by route and client.
- Consumes: existing RLS-scoped message route and scoped Realtime channel.

- [ ] Write failing tests for valid/invalid cursors, a 100-row incremental bound, no polling while subscribed, 60-second polling on channel failure, and cleanup.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement incremental route reads and Realtime-first fallback behavior.
- [ ] Run message, conversation, notification, and chat-state tests.
- [ ] Commit the task.

### Task 4: Public category cache boundary

**Files:**
- Create: `lib/public-catalog.ts`
- Modify: category callers in `app/marketplace/page.tsx`, `app/search/page.tsx`, `app/browse/page.tsx`, `app/sell/page.tsx`, `app/saved-searches/page.tsx`, and `app/listing/[id]/edit/page.tsx`
- Test: `tests/public-catalog-cache.test.ts`

**Interfaces:**
- Produces: `getCachedCategories(): Promise<Category[]>`, backed by a five-minute Next data cache over `getCategories` only.

- [ ] Write a failing test proving only the public category query is cached and no request/session input is consumed.
- [ ] Run the focused test and confirm the expected failure.
- [ ] Implement the isolated cache wrapper and update callers.
- [ ] Run category, taxonomy, marketplace, and security tests.
- [ ] Commit the task.

### Task 5: Report, monitor, and verify

**Files:**
- Create: `docs/operations/supabase-egress-investigation-2026-11-20.md`

**Interfaces:**
- Produces: evidence table, measurement method, historical limitations, monitoring cadence, rollout and rollback gates.

- [ ] Record confirmed findings, hypotheses, before/after request counts and byte measurements, and security boundaries.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm audit`.
- [ ] Run relevant RLS/security and browser suites only against a verified disposable target; otherwise record them as blocked.
- [ ] Review the complete diff, stage intended files only, and commit.
- [ ] Push the branch and create a PR when authenticated tooling permits; otherwise provide the compare URL.
