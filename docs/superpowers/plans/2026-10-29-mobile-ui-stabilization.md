# Mobile UI Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove mobile navigation and listing-action collisions, reflow marketplace controls, and prove route-wide phone usability with deterministic Chromium and WebKit checks.

**Architecture:** A shared CSS geometry contract owns the mobile fixed stack and is consumed by the existing navigation and listing page. Deterministic read-only harnesses exercise geometry without Supabase, while production components keep their existing data and security boundaries.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-mobile-ui-stabilization-design.md`

## Global Constraints

- Preserve App Router server rendering, current navigation prefetch behavior, authentication, Supabase RLS, security controls, migrations, and user workflows.
- Do not install dependencies, modify production data, commit, push, merge, or deploy.
- Use existing design tokens and primitives; maintain the premium dark purple-accented identity.
- Support 320, 360, 375, 390, 414, 430, 768, and existing desktop review widths in Chromium and WebKit.
- Do not weaken CSP or production security configuration for browser testing.

## Review Focus

- iOS standalone safe-area inset changes total navigation height without separating the contextual action.
- Safari toolbar collapse changes the visual viewport while fixed controls remain reachable and non-overlapping.
- Long prices, titles, locations, and seller names wrap without horizontal overflow or action displacement.
- Signed-out and owner listing states do not leave an empty fixed action layer.
- The last footer link and listing control can scroll clear of persistent navigation.

---

### Task 1: Shared Mobile Fixed-Stack Contract

**Files:**
- Modify: `app/globals.css`
- Modify: `components/mobile-nav.tsx`
- Modify: `tests/design-system.test.ts`
- Modify: `tests/listing-layout.test.ts`

**Interfaces:**
- Consumes: existing `data-mobile-navigation` and CSS safe-area environment variables.
- Produces: shared `--mobile-nav-height`, `--mobile-action-height`, and reusable navigation/action layout classes.

- [ ] **Step 1: Write failing Vitest source-contract tests** asserting the shared variables/classes exist and the old independent `78px` offsets are absent.
- [ ] **Step 2: Run the focused tests and verify the expected contract failures.**
- [ ] **Step 3: Implement shared CSS geometry and migrate `MobileNav` to the reusable class without changing its links or prefetch policy.**
- [ ] **Step 4: Run focused and full Vitest suites.**

### Task 2: One Mobile Listing Contact Action

**Files:**
- Modify: `app/listing/[id]/page.tsx`
- Modify: `app/globals.css`
- Create: `app/test-harness/mobile-fixed-stack/page.tsx`
- Modify: `tests/listing-layout.test.ts`
- Create: `tests/e2e/mobile-fixed-stack.spec.ts`

**Interfaces:**
- Consumes: Task 1 fixed-stack CSS variables/classes and existing `MessageSellerButton` behavior.
- Produces: one mobile contextual CTA, canonical in-flow price, desktop-only in-flow contact action, and deterministic read-only geometry harness.

- [ ] **Step 1: Write failing source and Playwright assertions** for one mobile CTA, no repeated sticky price, no action/navigation intersection, 44px targets, long-content containment, and end-of-page clearance.
- [ ] **Step 2: Run Vitest and Chromium harness checks to verify the failures.**
- [ ] **Step 3: Remove duplicate mobile price/action rendering, conditionally render the contextual bar only for non-owner listings, and consume the shared fixed-stack contract.**
- [ ] **Step 4: Run focused Vitest plus Chromium and WebKit harness checks at every required phone width.**

### Task 3: Marketplace Mobile Composition

**Files:**
- Modify: `components/marketplace-browser.tsx`
- Modify: `components/taxonomy-navigation.tsx`
- Modify: `app/globals.css`
- Modify: `tests/design-system.test.ts`
- Modify: `tests/e2e/ios-marketplace-filters.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: existing URL-backed filters, Sheet primitive, category links, and listing grid.
- Produces: a phone-first result toolbar and explicit contained category scrolling.

- [ ] **Step 1: Add failing tests** for toolbar row geometry at 320–430px, 44px controls, category containment, and element-level overflow detection.
- [ ] **Step 2: Verify the focused tests fail for the intended layout reason.**
- [ ] **Step 3: Recompose count/Filters/Sort markup and add responsive CSS; retain URLs, focus restoration, and native no-JS fallback.**
- [ ] **Step 4: Verify marketplace harnesses in Chromium and WebKit across required widths.**

### Task 4: Route-Wide Mobile Audit and Visual Repair

**Files:**
- Modify only confirmed affected files under `app/` or `components/`.
- Modify: `tests/e2e/responsive.spec.ts`
- Create/update: `artifacts/mobile-audit/after/*`

**Interfaces:**
- Consumes: shared layout contract from Tasks 1–3 and existing route compositions.
- Produces: route matrix evidence for Home, Browse, Marketplace, listing detail, profiles, Favorites, Messages, Sell, auth, Settings, and Notifications.

- [ ] **Step 1: Extend the responsive test to identify overflowing elements and persistent-layer intersections instead of checking document width alone.**
- [ ] **Step 2: Run the route matrix and record only reproducible failures, distinguishing rendered coverage from auth redirects and missing local data.**
- [ ] **Step 3: Apply minimal root-cause fixes for confirmed failures, one behavior at a time, with failing tests first.**
- [ ] **Step 4: Capture after screenshots at 320, 390, 430, and tablet widths and visually critique them against the approved design system.**

### Task 5: Comprehensive Regression Gate

**Files:**
- Review: all files changed by Tasks 1–4.

**Interfaces:**
- Consumes: completed implementation and tests.
- Produces: deployment recommendation and evidence-backed limitations.

- [ ] **Step 1: Run `npm run typecheck`.**
- [ ] **Step 2: Run `npm run lint`.**
- [ ] **Step 3: Run `npm test`.**
- [ ] **Step 4: Run focused Playwright suites in Chromium and WebKit, then the safe responsive suite.**
- [ ] **Step 5: Run `npm run build`.**
- [ ] **Step 6: Inspect `git diff`, verify navigation-performance/security files were not regressed, and perform the web-interface source review.**
- [ ] **Step 7: Report confirmed issues, root causes, files changed, screenshots, exact test outcomes, limitations, and GO/NO-GO without committing or deploying.**
