# iOS Compatibility, Favorites, and Functional Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make favorites reliable and accessible across GGMarket, repair reproducible iOS/WebKit interaction defects, and audit every existing user-facing route for non-functional controls without mutating protected data.

**Architecture:** Keep the server-rendered favorite truth and existing authenticated API, while extracting a small client-side favorite state controller that reconciles server props, coordinates duplicate controls, and serializes optimistic writes. Add route-level API fixtures and safe Playwright request interception for mutation behavior, then use public read-only navigation for the broader audit.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase SSR, Vitest, Playwright Chromium/WebKit.

**Spec:** `docs/superpowers/specs/2026-10-16-ios-favorites-functional-audit-design.md`

## Global Constraints

- Preserve existing worktree changes and completed PC taxonomy behavior.
- Do not mutate the protected Supabase project or use service-role credentials.
- Do not modify migrations, RLS, secrets, production configuration, or dependencies.
- Do not commit, push, or deploy.
- Distinguish mocked behavior, public read-only behavior, and blocked authenticated persistence in the final report.

## Review Focus

- App Router refreshes preserve client state; refreshed server truth must still win when it changes.
- Multiple buttons for one listing must converge through optimistic success and rollback.
- Rapid repeated activation must not create duplicate or out-of-order requests.
- A heart tap inside a listing card must never navigate the card link.
- WebKit touch, focus restoration, fixed mobile actions, and overlays must remain operable at narrow widths.

---

### Task 1: Reproduce and pin the favorites state defects

**Files:**
- Create: `tests/favorite-state.test.ts`
- Create: `tests/favorite-api.test.ts`
- Modify: `tests/listing-layout.test.ts`

**Interfaces:**
- Consumes: current `FavoriteButton`, `/api/favorites`, and Supabase favorites/RLS contract.
- Produces: failing behavioral tests for reconciliation, synchronization, rollback, rapid activation, and API ownership.

- [ ] Write focused tests that demonstrate stale server-prop state, unsynchronized duplicate controls, rollback, and request serialization.
- [ ] Add isolated route-handler tests for unauthenticated, invalid, unavailable, add, remove, and Supabase-error outcomes.
- [ ] Run the focused tests and verify failures are caused by missing state coordination rather than test setup.

### Task 2: Implement the smallest reliable favorites correction

**Files:**
- Create: `lib/favorite-state.ts`
- Modify: `components/favorite-button.tsx`
- Modify only if tests expose a contract bug: `app/api/favorites/route.ts`

**Interfaces:**
- Consumes: Task 1 tests and the current JSON `{ listingId }` API contract.
- Produces: a per-listing client state controller and accessible `FavoriteButton` integration.

- [ ] Implement pure favorite transition helpers/state coordination with explicit optimistic, confirmed, rollback, and server-sync actions.
- [ ] Reconcile `initialFavorite` changes, synchronize duplicate controls, keep one write in flight, and refresh after confirmation.
- [ ] Keep the button at least 44px, expose toggle/busy state, render the selected heart red and filled, and show accessible visible failure feedback.
- [ ] Run focused Vitest and safe mocked Chromium/WebKit touch tests until green.

### Task 3: Audit shared mobile interactions and non-functional controls

**Files:**
- Modify: affected client components only when a failure is reproduced.
- Create or modify: focused `tests/*.test.ts` and safe `tests/e2e/*.spec.ts` coverage.

**Interfaces:**
- Consumes: shared dialogs, sheets, navigation, marketplace controls, forms, galleries, messaging, and account controls.
- Produces: evidence-backed fixes for confirmed defects and an inventory of blocked authenticated flows.

- [ ] Scan all user-facing pages/components for placeholder destinations, inert controls, nested interactivity, swallowed async errors, touch-target violations, and unsafe overlays.
- [ ] Exercise public homepage, Browse, Marketplace, listing detail, auth pages, and redirects in Chromium and WebKit using click, tap, keyboard, Escape, and back/forward navigation.
- [ ] Add a failing regression test before each confirmed production-code correction; implement the minimum fix and rerun the focused test.
- [ ] Review authenticated-only client/API behavior through isolated fixtures without protected data mutation.

### Task 4: Responsive, accessibility, and release verification

**Files:**
- Create: `.superpowers/sdd/2026-10-16-ios-favorites-functional-audit/progress.md`
- Modify only defects found by verification.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: final evidence, screenshots, remaining limitations, and release-readiness assessment.

- [ ] Run TypeScript, ESLint, full Vitest, and the production build.
- [ ] Run safe Chromium and WebKit tests at 320, 360, 375, 390, 393, 430, 768, 820, and 1024 CSS pixels.
- [ ] Inspect desktop/mobile screenshots, touch activation, keyboard focus, modal dismissal/restoration, safe areas, and horizontal overflow.
- [ ] Perform final code review and record verified passes, failures, fixes, blocked flows, and native-iOS limitations in the progress ledger.
