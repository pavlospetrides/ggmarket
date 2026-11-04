# Favorites Desktop Geometry and iPhone Scroll Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver large responsive desktop Favorites cards and stop application-driven iPhone scroll oscillation without regressing mobile Favorites, lanyard physics, or Smart Back Navigation.

**Architecture:** Pure rail helpers own responsive sizing and gesture classification; the rail component consumes those decisions while retaining its existing physics engine. Smart Back restoration becomes an event-driven, user-cancellable session instead of a 180-frame polling loop.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Playwright Chromium/WebKit, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-11-04-favorites-desktop-ios-scroll-design.md`

## Global Constraints

- Preserve native mobile scrolling, existing mobile Favorites styling, Supabase data/security, Smart Back Navigation, and all unrelated features.
- Do not use global scroll locks, global `preventDefault`, `touch-action: none`, browser zoom restrictions, CSS scaling of the complete rail, database changes, or new dependencies.
- Do not commit, push, merge, or deploy without explicit approval.
- Only claim physical iPhone verification if a physical iPhone Chrome/Safari run actually occurs.

## Review Focus

- Quick vertical touch beginning on a card must remain native scrolling; a deliberate held pull must still animate the card.
- Restoration must survive late layout shifts but stop immediately on real user intent and remove every observer/listener/RAF on completion or unmount.
- Five cards at 1366px should be readable without overlap; eight cards should use a large-card carousel window rather than miniature rail cards.
- Removing an item from any batch, including the last batch, must not corrupt IDs, focus, or physics arrays.
- Mobile widths 320–430px must keep the existing card-width range, carousel behavior, nav clearance, and no horizontal document overflow.

---

### Task 1: Responsive rail decisions

**Files:**
- Modify: `lib/favorite-rail.ts`
- Modify: `tests/favorite-lanyard-physics.test.ts`

**Interfaces:**
- Produces: `favoriteRailResponsiveSize(width: number, count: number): { cardWidth: number; carousel: boolean; compact: boolean }`
- Produces: collision-safe `favoriteRailLayoutTargets(...)` values for the larger width range.

- [ ] **Step 1: Write failing table tests** for 390px mobile preservation, tablet adaptation, five-card 1366px sizing, eight-card desktop carousel sizing, 1440px and 1920px caps, zero/one item, and collision-safe target gaps.
- [ ] **Step 2: Run `npm test -- tests/favorite-lanyard-physics.test.ts`** and verify failures are caused by the missing sizing API/current 168px cap.
- [ ] **Step 3: Implement the minimal pure sizing helper** and adjust pitch bounds only as required by the literal expected geometries.
- [ ] **Step 4: Re-run the focused test** and verify it passes.

### Task 2: Gesture intent and cancellation model

**Files:**
- Modify: `lib/favorite-rail.ts`
- Modify: `tests/favorite-lanyard-physics.test.ts`

**Interfaces:**
- Produces: `classifyFavoriteRailGesture(input): "pending" | "none" | "pull" | "drag" | "swipe"`.
- Consumes later: pointer type, elapsed time, deltas, hit index, carousel/reduced-motion state.

- [ ] **Step 1: Write failing tests** for quick vertical touch scroll, held touch pull, between-card vertical touch, decisive horizontal swipe, diagonal ambiguity, mouse pull, and reduced-motion drag rejection.
- [ ] **Step 2: Run the focused Vitest file** and verify the tests fail for the missing classifier.
- [ ] **Step 3: Implement the minimal classifier** with literal movement, directional, and hold thresholds named in one place.
- [ ] **Step 4: Re-run the focused test** and verify it passes.

### Task 3: Rail integration and desktop controls

**Files:**
- Modify: `components/ui/favorite-lanyard-rail.tsx`
- Modify: `tests/e2e/favorites-safe.spec.ts`
- Modify: `app/test-harness/favorites/page.tsx` only if a deterministic count fixture is required.

**Interfaces:**
- Consumes: `favoriteRailResponsiveSize` and `classifyFavoriteRailGesture`.
- Preserves: `FavoriteLanyardRailProps`.

- [ ] **Step 1: Add failing browser assertions** for card widths/modes at 320, 390, 768, 1024, 1280, 1366, 1440, and 1920px; five/eight/30-item reachability; mobile vertical drag not capturing; horizontal swipe; pointer-cancel cleanup; flip/Escape; removal; reduced motion; and no document overflow.
- [ ] **Step 2: Run the smallest Chromium Favorites test selection** and verify failures match current small desktop cards/gesture lifecycle.
- [ ] **Step 3: Integrate measured responsive sizing**, separate compact mobile geometry from desktop carousel mode, update image responsive hints, and add desktop-only previous/next controls.
- [ ] **Step 4: Integrate gesture classification and an explicit cancellation cleanup path** without global prevention or scroll locking.
- [ ] **Step 5: Re-run focused Vitest and Chromium Favorites tests** and verify they pass.

### Task 4: User-cancellable Smart Back restoration

**Files:**
- Modify: `components/listing-navigation.tsx`
- Modify: `tests/listing-navigation-link.test.ts`
- Modify: `tests/e2e/listing-navigation.spec.ts`

**Interfaces:**
- Produces: a bounded restoration session whose cleanup stops observers, event listeners, image listeners, and scheduled RAF work.
- Preserves: `captureListingDeparture`, `applyBrowsingSnapshot`, `ListingNavigationLink`, `BrowsingStateRestorer`, and `ListingBackButton` public behavior.

- [ ] **Step 1: Add a failing browser regression** that returns to a source page with an incomplete image, begins a user gesture immediately, and asserts that programmatic scroll corrections stop while the new user scroll position remains stable.
- [ ] **Step 2: Add failing unit coverage** for restoration continuation/stop decisions and bounded cleanup if a pure coordinator helper is introduced.
- [ ] **Step 3: Run the focused navigation tests** and verify the old 180-frame loop fails the programmatic-scroll bound.
- [ ] **Step 4: Replace frame polling with event-driven correction** and one idempotent `stop()` path; register passive pointer/touch/wheel listeners and keyboard intent cancellation.
- [ ] **Step 5: Re-run focused Vitest plus Chromium/WebKit listing-navigation tests** and verify exact anchor/rail restoration still passes and ordinary interaction produces no restoration loop.

### Task 5: Visual, accessibility, and performance review

**Files:**
- Modify only files already in scope if review finds a concrete defect.
- Create: `artifacts/favorites-desktop-ios-scroll/after/*.png`
- Create: `docs/audits/2026-11-04-favorites-desktop-ios-scroll.md`

**Interfaces:** none.

- [ ] **Step 1: Run the taste lint/inspector where compatible** against the Favorites harness and record justified component-specific exceptions.
- [ ] **Step 2: Capture Chromium screenshots** at 320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1366, 1440, and 1920px plus light/dark and reduced-motion states.
- [ ] **Step 3: Inspect screenshots using the fourteen-pass critique**, fix the top visible defects, and repeat for at most three rounds.
- [ ] **Step 4: Review the changed UI files against the current Vercel Web Interface Guidelines** and fix concrete accessibility/interaction findings.
- [ ] **Step 5: Record confirmed findings, hypotheses, physical-device limitations, and before/after evidence** in the audit document.

### Task 6: Full verification

**Files:** none unless a verified regression requires a focused correction.

- [ ] **Step 1: Run `npm run typecheck` and `npm run lint`.**
- [ ] **Step 2: Run `npm test`.**
- [ ] **Step 3: Run relevant Playwright suites in Chromium and WebKit**, including responsive Favorites, gesture sequences, listing restoration, and unaffected page scrolling.
- [ ] **Step 4: Run `npm run build`, start the production server, and perform smoke tests against `next start`.**
- [ ] **Step 5: Run `git diff --check`, inspect the final diff/status, and confirm the original auth checkout is untouched.**
- [ ] **Step 6: Perform a self-review equivalent to the requested code-review gate** because subagent delegation is not authorized in this session; resolve all critical/important findings before reporting.

