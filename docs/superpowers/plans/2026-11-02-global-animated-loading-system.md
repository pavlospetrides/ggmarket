# Global Animated Loading System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the supplied three-shape SVG animation as GGMarket's accessible, performant route and foreground-operation loading system.

**Architecture:** A server-compatible SVG/CSS-module primitive supplies compact and standard presentations without React animation state. App Router loading boundaries cover route waits while existing client operation state drives delayed inline/button instances, preserving content, optimistic behavior, navigation, and scroll restoration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, CSS Modules, Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-11-02-global-animated-loading-system-design.md`

## Global Constraints

- Preserve the original circle, triangle, and square SVG geometry and path/dot animation behavior.
- Reuse `components/ui` and `app/globals.css`; do not duplicate Tailwind imports or overwrite theme variables.
- Add no dependency, image asset, database request, router patch, global network interceptor, or artificial production delay.
- Keep the header/navigation usable; never blank or remount restored marketplace content for a client filter transition.
- Use a 150 ms reveal delay only for client-controlled indicators; never delay the operation or result.
- Preserve optimistic messaging, realtime background behavior, upload status/errors, Smart Back Navigation, authorization, and security boundaries.
- Honor `prefers-reduced-motion`, safe areas, accessible status semantics, and both compact and standard sizes.
- Do not commit, push, merge, deploy, or modify production data.

## Review Focus

- A pending operation that fails must remove the loader and leave its existing error visible.
- A client operation completing before 150 ms must never expose the delayed loader.
- Reduced-motion mode must remove all path, dot, and reveal animation while retaining a visible three-shape mark.
- Marketplace filter/sort navigation must retain the current results and scroll position until replacement content is ready.
- Concurrent or repeated mutation attempts must retain existing serialization guards and never duplicate status announcements.

---

### Task 1: Build the scoped loader primitive

**Files:**
- Create: `components/ui/loader-2.tsx`
- Create: `components/ui/loader-2.module.css`
- Create: `tests/loader-2.test.ts`

**Interfaces:**
- Produces: `Loader2(props: Loader2Props): ReactElement`, `Component` alias, and `Loader2Props` with `size?: "compact" | "standard"`, `label?: string`, `delayed?: boolean`, `decorative?: boolean`, and `className?: string`.

- [ ] **Step 1: Write the failing server-render tests**

Assert literal rendered markup has one status named by `label`, exactly three SVGs with circle/polygon/rect geometry, compact/standard and delayed classes, and no status semantics in decorative mode. The regression breaks if any supplied shape or accessibility contract is removed.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/loader-2.test.ts`
Expected: FAIL because `@/components/ui/loader-2` does not exist.

- [ ] **Step 3: Implement the component and CSS module**

Use the supplied view boxes/points/dimensions verbatim. Complete scoped path/dot sizing, stroke, dash-array, dash-offset, cubic-bezier animation, purple token colors, 150 ms reveal, and reduced-motion static fallback. Remove the supplied unused `cn`, `useState`, and `count`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- tests/loader-2.test.ts`
Expected: PASS.

### Task 2: Use the loader for App Router waits

**Files:**
- Create: `app/loading.tsx`
- Modify: `app/marketplace/loading.tsx`
- Modify: `app/browse/loading.tsx`
- Test: `tests/loader-2.test.ts`

**Interfaces:**
- Consumes: `Loader2` from Task 1.
- Produces: shared route fallback markup with label and route-safe minimum height.

- [ ] **Step 1: Add failing render tests for route fallbacks**

Assert the root, Marketplace, and Browse fallback modules render the shared loader, preserve route-specific accessible labels, and do not render a full-screen fixed overlay. The regression breaks if a route returns to a competing skeleton or covers navigation.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/loader-2.test.ts`
Expected: FAIL because the root fallback is missing and nearer boundaries do not use `Loader2`.

- [ ] **Step 3: Implement shared route fallbacks**

Render the standard loader in the page content area with responsive minimum height and safe-area-aware spacing. Do not modify `app/layout.tsx`, so header, footer, mobile navigation, prefetching, and streaming remain intact.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- tests/loader-2.test.ts`
Expected: PASS.

### Task 3: Add delayed marketplace foreground feedback without replacing results

**Files:**
- Modify: `components/marketplace-browser.tsx`
- Modify: `app/test-harness/marketplace/page.tsx`
- Create: `tests/e2e/loading-system.spec.ts`

**Interfaces:**
- Consumes: `Loader2` with `size="compact"` and `delayed`.
- Preserves: URL-backed `ListingQuery`, `useTransition`, focus restoration, Link pagination, and `scroll: false` for dependent taxonomy transitions.

- [ ] **Step 1: Write failing Playwright coverage**

Against the safe marketplace harness, intercept a category/sort navigation and hold the response. Assert current listing content and navigation remain usable, one delayed status appears only after 150 ms, completion removes it, failure removes it, and no extra request is emitted. Add a fast-response case asserting no visible flash and a history/back case asserting scroll is restored.

- [ ] **Step 2: Run Chromium coverage and verify RED**

Run: `npx playwright test tests/e2e/loading-system.spec.ts --project=chromium`
Expected: FAIL because Marketplace has no shared pending status and some router pushes are outside the transition.

- [ ] **Step 3: Implement the marketplace pending region**

Route category, sort, and dependent filter pushes through the existing transition, keep the listing grid mounted, and render exactly one inline delayed loader adjacent to the results context. Native search/filter forms and pagination continue using App Router fallbacks.

- [ ] **Step 4: Run Chromium coverage and verify GREEN**

Run: `npx playwright test tests/e2e/loading-system.spec.ts --project=chromium`
Expected: PASS.

### Task 4: Add compact feedback to meaningful foreground mutations

**Files:**
- Modify: `components/sell-wizard.tsx`
- Modify: `components/manage-listing-form.tsx`
- Modify: `components/message-seller-button.tsx`
- Modify: `components/chat-interface.tsx`
- Modify: `components/settings-form.tsx`
- Modify: `components/saved-searches-manager.tsx`
- Modify: `components/notifications-list.tsx`
- Modify: relevant existing safe Playwright specs under `tests/e2e/`

**Interfaces:**
- Consumes: decorative compact `Loader2` inside controls whose visible text already names the operation.
- Preserves: existing busy booleans/IDs, request serialization, `finally` cleanup, errors, optimistic messages, Supabase upload sequence, and current live-region text.

- [ ] **Step 1: Extend existing safe E2E specs with failing pending/error assertions**

For controlled delayed responses, assert publish/upload status retains its phase text, listing update, conversation open, offer/trade actions, settings save, saved-search mutation, and notification mutation each show at most one compact loader. For rejected responses, assert the loader disappears and the existing error is visible. Do not assert loaders for optimistic sends or background realtime/notification refresh.

- [ ] **Step 2: Run the affected Chromium specs and verify RED**

Run: `npx playwright test tests/e2e/sell-touch-safe.spec.ts tests/e2e/message-seller-safe.spec.ts tests/e2e/chat-messaging-safe.spec.ts tests/e2e/notifications-safe.spec.ts --project=chromium`
Expected: FAIL on the new loader assertions.

- [ ] **Step 3: Render compact decorative loaders from existing operation state**

Keep visible operation labels and errors intact; do not add new state, requests, progress percentages, providers, or client boundaries. Use operation-specific pending IDs so chat actions only decorate the invoked control.

- [ ] **Step 4: Run the affected Chromium specs and verify GREEN**

Run the same command as Step 2.
Expected: PASS.

### Task 5: Verify animation, accessibility, responsive layout, and regressions

**Files:**
- Modify: `tests/e2e/loading-system.spec.ts`
- Create: screenshot artifacts under Playwright's configured temporary output directory only.

**Interfaces:**
- Consumes: completed loader system.

- [ ] **Step 1: Add computed-style and responsive browser assertions**

Assert circle, triangle, and square have active path animations; triangle/rect dot pseudo-elements animate; reduced-motion computes no animation; status naming is singular; 390x844 and 1440x900 have no horizontal overflow or mobile-nav overlap; hydration produces no console/page errors.

- [ ] **Step 2: Run focused Chromium and WebKit tests**

Run: `npx playwright test tests/e2e/loading-system.spec.ts --project=chromium --project=webkit`
Expected: PASS with desktop and mobile screenshots.

- [ ] **Step 3: Run static and unit verification**

Run: `npm run typecheck`, `npm run lint`, and `npm test`.
Expected: all exit 0 with zero failures.

- [ ] **Step 4: Run relevant regression suites**

Run the loading spec plus existing Browse/marketplace, iOS filter, chat, sell, notification, responsive, performance, and security-safe specs in Chromium and WebKit when their environment requirements are satisfied. Do not run state-changing Supabase tests unless the configured target is proven disposable.
Expected: zero failures, or report each pre-existing/environment-blocked test by name.

- [ ] **Step 5: Run production verification**

Run: `npm run build`; start the built app with `npm run start` on an unused local port; smoke `/`, `/marketplace`, `/browse`, and `/test-harness/marketplace` with `E2E_UI_HARNESS=1`; then run `git diff --check`.
Expected: build/start/smokes exit successfully and diff check is clean.

- [ ] **Step 6: Review the specification line by line and report scope truthfully**

Report files, covered states, screenshots, performance observations, exact commands/results, missing My GG Card and older-message support, environment-gated checks, remaining limitations, and a GO/NO-GO recommendation without claiming unrun evidence.
