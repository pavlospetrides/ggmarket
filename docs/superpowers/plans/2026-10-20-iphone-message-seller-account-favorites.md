# iPhone Message Seller and Account-Scoped Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Message Seller resilient to delayed or missing iPhone hydration and make favorite UI state instant, persistent, and isolated by authenticated account.

**Architecture:** Keep Supabase session ownership, RLS, and the existing idempotent `start_conversation` RPC authoritative. Add a same-origin native-form fallback to Message Seller while retaining the hydrated fetch/navigation experience, and partition the favorite coordinator by viewer identity plus listing identity so late Account A responses cannot alter Account B state. Refresh authenticated Server Component data after client login and pass the server-verified viewer scope through listing surfaces.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase SSR/PostgreSQL, Vitest, Playwright Chromium/WebKit

**Spec:** User-provided `GGMarket — FIX REAL iPHONE MESSAGE SELLER & MULTI-ACCOUNT FAVORITES BUGS` attachment dated 2026-10-20.

## Global Constraints

- Do not modify the working Sell wizard, taxonomy, production Supabase data, migrations, RLS, secrets, or dependencies.
- Preserve all unrelated uncommitted changes; do not commit, push, or deploy.
- Keep the existing Proxy origin/CSRF enforcement and server-derived Supabase user identity authoritative.
- Run mutation journeys only through mocked routes or isolated test harnesses; do not mutate the protected Supabase project.
- Do not claim physical-iPhone verification without device access.

## Review Focus

- A tap before or without hydration must submit the intended listing through a same-origin native form instead of remaining inert.
- Repeated hydrated Message Seller taps must create at most one request and route only from a valid conversation response.
- Favorite state, listeners, queued intent, confirmation, and rollback must be keyed by viewer identity and listing identity.
- A late Account A response after switching to Account B must not change Account B UI or its Favorites list.
- Client login must cause server-rendered favorite inputs to be fetched for the new session without adding a favorite-triggered route refresh.

---

### Task 1: Pin Message Seller delivery and route behavior

**Files:**
- Create: `tests/conversation-api.test.ts`
- Create: `app/test-harness/message-seller/page.tsx`
- Create: `tests/e2e/message-seller-safe.spec.ts`
- Modify: `components/message-seller-button.tsx`
- Modify: `app/api/conversations/route.ts`

**Interfaces:**
- Consumes: `POST /api/conversations`, `{ listingId }`, `start_conversation(target_listing_id)`.
- Produces: JSON `{ id }` for hydrated requests and a `303` same-origin redirect for native form submissions.

- [ ] Write route tests for invalid input, unauthenticated JSON, unauthenticated form redirect preserving listing context, successful JSON, successful form redirect, RPC failure, and idempotent reuse of the returned conversation ID.
- [ ] Write Chromium mobile tests that tap the detail and sticky controls, verify one request during repeated taps, assert listing context, assert signed-out login navigation, preserve the intentional own-listing state without a self-conversation, and expose visible failure feedback.
- [ ] Write a JavaScript-disabled mobile test proving the native form submits `listingId`; verify it fails because the current button is disabled and has no form action.
- [ ] Implement a semantic form in `MessageSellerButton`; intercept its submit only after hydration, disable only while a hydrated request is in flight, and keep the native submit available before hydration.
- [ ] Extend the conversation route to parse JSON or URL-encoded form input and return safe redirects/errors without accepting any client-supplied user or seller identity.
- [ ] Run the focused Vitest and Chromium tests to green, then run the same spec in WebKit when the browser runtime is available.

### Task 2: Partition favorite coordination by authenticated viewer

**Files:**
- Modify: `lib/favorite-state.ts`
- Modify: `tests/favorite-state.test.ts`
- Modify: `components/favorite-button.tsx`
- Modify: `components/listing-card.tsx`
- Modify: `components/listing-grid.tsx`
- Modify: `components/favorite-listings.tsx`
- Modify: `components/marketplace-browser.tsx`

**Interfaces:**
- Consumes: server-verified `viewerId: string | null`, `listingId`, and server-rendered `initialFavorite`.
- Produces: favorite snapshots and operations addressed by `{ viewerId, listingId }`, with stale completions confined to their originating viewer.

- [ ] Add failing unit tests for two viewers sharing a listing ID, independent persistence, independent rollback, queued rapid intent, and a delayed Account A confirmation after Account B becomes active.
- [ ] Change the store API to require a viewer scope for every snapshot, subscription, sync, toggle, confirm, and rollback operation.
- [ ] Update `FavoriteButton` to capture the operation's viewer scope, ignore stale component callbacks after a scope change, retain optimistic updates and visible rollback errors, and avoid `router.refresh()` or document navigation after a favorite write.
- [ ] Propagate the viewer scope through listing cards, grids, marketplace results, and Favorites-list removal; reset `FavoriteListings` visible state when its viewer/listing inputs genuinely change.
- [ ] Run focused state and component/browser tests to green.

### Task 3: Supply fresh viewer identity across account transitions

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/marketplace/page.tsx`
- Modify: `app/search/page.tsx`
- Modify: `app/listing/[id]/page.tsx`
- Modify: `app/favorites/page.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `app/profile/[username]/page.tsx`
- Modify: `components/profile-view.tsx`
- Modify: `components/auth-form.tsx`
- Modify: `app/test-harness/favorites/page.tsx`
- Create: `app/test-harness/favorites/favorite-account-harness.tsx`
- Modify: `tests/e2e/favorites-safe.spec.ts`

**Interfaces:**
- Consumes: `getUser()`/`requireUser()` results and the Task 2 viewer-scoped component props.
- Produces: server-rendered favorite state associated with the current authenticated user after every login transition.

- [ ] Add a two-account harness test that performs A add, B isolation/add/remove, A restoration, same-listing overlap, delayed A completion, failure rollback, rapid taps, duplicate controls, Favorites removal, and zero document requests during favorite mutations.
- [ ] Pass only the server-derived viewer ID to every favorite-rendering surface; never derive authorization from a client-provided ID.
- [ ] After successful browser-client login, replace the route and refresh Server Components so cookies and user-scoped favorite inputs are read for the new session.
- [ ] Re-run account-transition Vitest and Chromium tests; run WebKit when installed.

### Task 4: Focused regression and release verification

**Files:** No intended production changes.

- [ ] Run relevant Vitest tests, then the full Vitest suite.
- [ ] Run TypeScript and ESLint.
- [ ] Run the production build.
- [ ] Run the focused Message Seller and Favorites specs in Chromium at 320, 375, 390, 393, and 430 CSS pixels.
- [ ] Run the same focused specs in WebKit at those widths after installing or otherwise making the configured browser runtime available; if unavailable, report the exact missing executable/tool state.
- [ ] Review the final diff for Sell-flow regressions, origin/CSRF weakening, client-supplied authorization, accidental Supabase mutation, and unrelated worktree changes.
- [ ] Report confirmed causes, files changed, account-isolation evidence, browser evidence, and the remaining physical-device gate.
