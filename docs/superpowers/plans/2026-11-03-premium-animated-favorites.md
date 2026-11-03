# Premium Animated Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated Favorites grid with a lazy-loaded, GGMarket-branded physical lanyard rail backed by real favorite listings and the existing secure mutation/navigation architecture.

**Architecture:** Keep server fetching and authorization unchanged. A client collection controller owns batches, selection, and optimistic removal; a focused `components/ui/favorite-lanyard-rail.tsx` module adapts the supplied ref-driven physics engine and emits selection/flip events, while a separate detail panel contains the accessible listing actions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Next Image/Link, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-premium-animated-favorites-design.md`

## Global Constraints

- Preserve `requireUser`, `getFavoriteListings`, `/api/favorites`, signed images, Supabase RLS, and active-listing visibility rules.
- Use the supplied custom spring/RAF mechanics; add no animation dependency and do not replace the feature with basic CSS flip cards.
- Simulate at most eight listings per batch and key every persistent state transition by listing ID.
- Keep badge actions outside the draggable badge button; all touch targets are at least 44px and reduced motion remains fully functional.
- Keep App Router server/client boundaries valid and lazy-load the physics component from a Client Component.
- Do not modify migrations, production Supabase, unrelated files, or the parent worktree's uncommitted changes.

## Review Focus

- A listing is removed while it is the last item on the last batch: the controller clamps to the preceding batch and leaves a valid selection.
- A favorite mutation fails after the optimistic removal: the listing returns once, in stable order, without a ghost physics slot.
- The document becomes hidden or the rail scrolls offscreen mid-spring: RAF stops and later resumes/settles without duplicate loops.
- A 320px touch user starts mostly vertical movement on a badge: the page scrolls and does not become trapped in the carousel.
- A long unbroken title, missing image, long location, and absent optional metadata remain readable and do not overflow the viewport.

---

### Task 1: Favorite rail domain helpers

**Files:**
- Create: `lib/favorite-rail.ts`
- Create: `tests/favorite-rail.test.ts`

**Interfaces:**
- Consumes: existing `Listing`, `formatPrice`, and condition labels.
- Produces: `FAVORITE_RAIL_BATCH_SIZE`, `FavoriteRailItem`, `toFavoriteRailItem(listing)`, `getFavoriteRailBatch(items, batch)`, `reconcileFavoriteRailState(state, items)`, and `shouldRunFavoriteRailAnimation(input)`.

- [ ] **Step 1: Write failing domain tests** for exact listing mapping, wanted-price semantics, batches of eight, last-batch removal clamping, stable selection by ID, empty collections, and hidden/offscreen/reduced animation decisions.
- [ ] **Step 2: Run `npm test -- tests/favorite-rail.test.ts`** and confirm failure is caused by the missing module.
- [ ] **Step 3: Implement the typed pure helpers** without DOM or React dependencies.
- [ ] **Step 4: Run `npm test -- tests/favorite-rail.test.ts`** and confirm all cases pass.
- [ ] **Step 5: Commit** `lib/favorite-rail.ts` and `tests/favorite-rail.test.ts` with `test: define favorite rail behavior`.

### Task 2: Physical listing rail

**Files:**
- Create: `components/ui/favorite-lanyard-rail.tsx`
- Create: `tests/favorite-lanyard-physics.test.ts`
- Modify: `lib/favorite-rail.ts`

**Interfaces:**
- Consumes: `FavoriteRailItem[]`, `shouldRunFavoriteRailAnimation`, controlled `activeId`/`flippedId`, and change callbacks.
- Produces: `FavoriteLanyardRail` with labelled stage, stable listing-ID identity, desktop rail, mobile swipe carousel, keyboard controls, stopped-at-rest RAF, page visibility/intersection guards, and deterministic cleanup.

- [ ] **Step 1: Add failing physics/lifecycle tests** for layout targets, soft pull limit, collision gap, identity reset, carousel next index, and schedule decisions when hidden/offscreen/reduced.
- [ ] **Step 2: Run `npm test -- tests/favorite-lanyard-physics.test.ts`** and confirm missing exports fail.
- [ ] **Step 3: Implement exported pure physics helpers**, then adapt the supplied rail renderer and simulation around `FavoriteRailItem` with Next Image front/back faces and no embedded action links.
- [ ] **Step 4: Add visibility/intersection observers, reduced-motion snapping, stable ID reset, timer/RAF cleanup, and an idle stop condition.**
- [ ] **Step 5: Run `npm test -- tests/favorite-rail.test.ts tests/favorite-lanyard-physics.test.ts`**, `npm run typecheck`, and focused ESLint for the new files.
- [ ] **Step 6: Commit** with `feat: add physical favorite listing rail`.

### Task 3: Favorites collection integration and expanded details

**Files:**
- Create: `components/favorite-lanyard-collection.tsx`
- Create: `components/favorite-listing-detail.tsx`
- Modify: `components/favorite-listings.tsx`
- Modify: `app/favorites/page.tsx`
- Modify: `app/test-harness/favorites/page.tsx`
- Modify: `tests/e2e/favorites-safe.spec.ts`

**Interfaces:**
- Consumes: Task 1 batching/reconciliation, Task 2 `FavoriteLanyardRail`, existing `FavoriteButton`, `ListingNavigationLink`, `BrowsingStateRestorer`, and real `Listing[]` props.
- Produces: lazy rail loading, masthead/count, accessible expanded detail panel, range controls, real View Listing navigation, optimistic remove/rollback, empty state, and mobile navigation clearance.

- [ ] **Step 1: Extend the Playwright Favorites harness test first** to require the real title/price/image, select/flip/detail semantics, View Listing href/anchor metadata, range label, keyboard Escape, confirmed removal, rollback restoration, and no horizontal overflow at 320/390/430px.
- [ ] **Step 2: Run the focused Chromium spec** and confirm the new assertions fail against the grid.
- [ ] **Step 3: Implement the detail panel and collection controller**, dynamically importing `FavoriteLanyardRail` at module scope with a stable loading fallback.
- [ ] **Step 4: Replace only the Favorites presentation**, preserving the page's server fetching, navigation restorer, empty state, count, Browse action, and existing mutation callback contract.
- [ ] **Step 5: Add long-content/missing-image fixtures to the harness and satisfy the review-focus responsive assertions.**
- [ ] **Step 6: Run focused Vitest, typecheck, ESLint, and the Chromium Favorites spec.**
- [ ] **Step 7: Commit** with `feat: redesign favorites as animated collection`.

### Task 4: Cross-browser, visual, production, and security verification

**Files:**
- Modify: implementation/tests only if a failing gate exposes a defect.
- Create: `docs/screenshots/2026-11-03-premium-animated-favorites/*`
- Create: `docs/audits/2026-11-03-premium-animated-favorites.md`

**Interfaces:**
- Consumes: the complete feature and synthetic test harness.
- Produces: reproducible screenshots, visual critique, performance/lifecycle notes, gate results, limitations, and GO/NO-GO recommendation.

- [ ] **Step 1: Run design lint/inspection and capture 1440, 768, 430, 390, 375, 360, and 320px screenshots** from the synthetic harness; inspect front, flipped/details, and post-removal states.
- [ ] **Step 2: Write the screenshot critique**, fix up to the top three visible issues through a failing regression test where behavior changes, then re-capture.
- [ ] **Step 3: Run relevant Favorites Playwright tests in Chromium and WebKit.** Do not run state-changing Supabase tests unless the environment is proven disposable.
- [ ] **Step 4: Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check`.**
- [ ] **Step 5: Start the production server**, request the harness HTML and RSC navigation response, and run a browser smoke test against `next start`.
- [ ] **Step 6: Document mechanics, architecture, data mapping, screenshots, functional/security/accessibility/performance evidence, known limitations, and deployment recommendation.**
- [ ] **Step 7: Commit** evidence with `docs: record animated favorites verification`.
