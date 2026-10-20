# iPhone Interaction Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every safely testable GGMarket interaction reliable on mobile Safari, prioritizing Signup, Logout, Favorites, listing galleries, and mobile Favorites navigation.

**Architecture:** Extend the existing hydration-resilient Login pattern into shared same-origin server fallbacks for essential auth and favorite mutations. Remove stale service-worker script delivery as a shared hydration risk. Verify rich controls through real touch and outcome assertions, then maintain an honest route-family matrix separating mocked, isolated, and physical-device evidence.

**Tech Stack:** Next.js 16.3.8 App Router, React 19, Supabase SSR/browser clients, Vitest, Playwright Chromium/WebKit.

**Spec:** `docs/superpowers/specs/2026-10-16-iphone-interaction-stabilization-design.md`

## Global Constraints

- Preserve the current dirty worktree, taxonomy, and 70/30 visual design.
- Do not mutate protected Supabase data or run service-role tests.
- Do not modify migrations, RLS, production configuration, or secrets.
- Do not commit, push, or deploy.
- Physical-iPhone verification remains a distinct manual release gate.

## Review Focus

- Hydration never attaches: essential auth/favorite actions still produce a secure observable outcome.
- LAN access: redirects and mutation origins retain the browser-visible host and port.
- Nested card controls: heart taps never navigate the listing card or duplicate requests.
- Dynamic viewport/overlays: gallery, sheets, dialogs, and fixed navigation receive intended touches and restore focus.
- Protected persistence: simulated tests must never be mislabeled as genuine Supabase persistence verification.

---

### Task 1: Shared authentication fallbacks

**Files:** `components/auth-form.tsx`, `components/settings-form.tsx`, `app/auth/register/route.ts`, `app/auth/logout/route.ts`, `lib/validation.ts`, auth tests.

- [ ] Add failing mobile touch/no-hydration Signup and Logout tests.
- [ ] Implement server-backed registration and logout fallbacks using the established Supabase server client and public-origin helper.
- [ ] Preserve hydrated client behavior, visible errors, safe redirects, and dirty-form confirmation.
- [ ] Verify focused Chromium/WebKit and isolated route tests.

### Task 2: Shared hydration and service-worker stability

**Files:** `public/sw.js`, `components/service-worker-registration.tsx`, service-worker contract tests.

- [ ] Add a failing contract proving application JavaScript is never cache-first and updated workers activate promptly.
- [ ] Restrict caching to the offline shell/icon and ensure old caches/workers cannot pin stale hydration code.
- [ ] Verify registration/update behavior without adding dependencies.

### Task 3: Favorites interaction and persistence contract

**Files:** `components/favorite-button.tsx`, `app/api/favorites/route.ts`, `lib/favorite-state.ts`, favorite tests.

- [ ] Add failing touch/no-hydration, duplicate-instance, request, redirect, and rollback tests.
- [ ] Add a secure native POST fallback while retaining the optimistic synchronized client store.
- [ ] Verify add/remove intent, red fill, one request per action, Favorites route reflection contract, and safe error recovery.

### Task 4: Listing gallery and detail actions

**Files:** `components/listing-gallery.tsx`, listing/action tests.

- [ ] Add failing tests that assert actual main/lightbox image changes for arrows and thumbnails, touch target delivery, swipe, open/close, and focus return.
- [ ] Implement the smallest state/touch corrections and a useful non-hydrated image-view fallback.
- [ ] Verify single-image and multi-image behavior in Chromium/WebKit phone contexts.

### Task 5: Mobile Favorites navigation

**Files:** `components/mobile-nav.tsx`, `components/profile-view.tsx`, navigation tests.

- [ ] Add failing tests for a five-slot Favorites destination, active state, signed-out redirect, safe-area fit, and retained Messages access.
- [ ] Replace the least suitable persistent slot without adding a sixth control; expose displaced functionality in the account/profile surface.
- [ ] Verify all required phone widths and keyboard/touch navigation.

### Task 6: Website-wide outcome audit and repair

**Files:** interactive components and `tests/e2e/interaction-audit.spec.ts`; existing ledger matrix.

- [ ] Inventory every button/form/link/select/dialog by route family and map it to an outcome test.
- [ ] Run public and mocked-auth touch tests; diagnose every failure before changing code.
- [ ] Fix shared causes centrally and local defects minimally, each with RED→GREEN coverage.
- [ ] Mark protected mutations BLOCKED unless an isolated test proves persistence.

### Task 7: Comprehensive verification and handoff

**Files:** progress ledger and test artifacts only unless verification finds a defect.

- [ ] Run Vitest, TypeScript, ESLint, production build, Chromium/WebKit mobile and desktop suites.
- [ ] Exercise 320, 360, 375, 390, 393, 430, tablet, and desktop widths; inspect screenshots.
- [ ] Self-review the complete diff because delegation is not authorized; run one RED→GREEN fix pass for Critical/Important findings.
- [ ] Restore the LAN dev server and provide a minimal physical-iPhone smoke test plus honest release blockers.
