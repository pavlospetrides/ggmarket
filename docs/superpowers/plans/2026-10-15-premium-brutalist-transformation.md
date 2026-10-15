# Premium Minimal x Neo-Brutalist Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete GGMarket's existing frontend rebuild with one coherent 70% premium minimal gaming / 30% neo-brutalist identity across every current user-facing route without changing data contracts or protected Supabase state.

**Architecture:** Extend the established token and shared-component layer instead of adding a parallel component system. The homepage category switchboard is a small client boundary for pointer/focus spotlight behavior; route pages remain server components and consume shared surface, type, button, form, card, and responsive rules. Existing Radix Sheet/Dialog primitives, taxonomy helpers, and URL contracts remain authoritative.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4/global CSS tokens, Radix Dialog, Lucide, Vitest, Playwright.

**Spec:** `C:/Users/Pavlos/.codex/attachments/cc78b5c9-d917-48fa-89d0-05780bdd905b/Pasted text.txt`

## Global Constraints

- Preserve all existing worktree changes, business logic, Supabase authentication/RLS, API contracts, taxonomy behavior, and real data.
- Do not install a large animation framework; adapt the retrieved 21st.dev spotlight pattern with native pointer events and CSS custom properties.
- Do not modify migrations, production data, secrets, or protected Supabase state; do not commit, push, or deploy.
- All controls remain keyboard accessible, touch targets remain at least 44px, and motion honors `prefers-reduced-motion`.
- Required widths are 320, 360, 375, 390, 393, 430, 768, 1024, 1280, 1440, and 1920 in Chromium and WebKit.

## Review Focus

- 320px category layout: no overlap, clipping, or horizontal scroll; all four category links remain distinct and tappable.
- Keyboard/reduced-motion: spotlight is decorative, focus is visible, and content/interaction never depends on animation.
- Taxonomy links: Consoles, PC Hardware, Games, and Accessories resolve to canonical marketplace category URLs.
- Protected routes: anonymous browser coverage must be reported as redirects, never as authenticated page verification.
- Existing filter sheet and mobile navigation: global visual changes must not regress focus return, scroll lock, or bottom clearance.

---

### Task 1: Lock the new design contract

**Files:**
- Modify: `DESIGN.md`
- Test: `tests/design-system.test.ts`

- [ ] Write a failing contract test for the 70/30 identity, square/brutalist accent tokens, shared focus/motion tokens, and reduced-motion handling.
- [ ] Run the focused Vitest file and confirm the new assertions fail.
- [ ] Document the premium foundation, brutalist accent rules, and route allocation in `DESIGN.md`; extend root tokens without replacing established brand colors.
- [ ] Run the focused test and confirm it passes.

### Task 2: Build the interactive category switchboard

**Files:**
- Create: `components/category-switchboard.tsx`
- Modify: `components/mobile-home-hero.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/design-system.test.ts`
- Test: `tests/e2e/homepage-hero.spec.ts`

- [ ] Write failing source/browser contracts for four canonical links, no center GG mark, accessible navigation, pointer/focus spotlight, and narrow-width containment.
- [ ] Run Vitest to confirm the source contract fails for the missing component.
- [ ] Implement the switchboard as a focused client island using native pointer movement, CSS variables, semantic links, Lucide iconography, and a reduced-motion-safe surface inspired by the retrieved 21st.dev Spotlight component.
- [ ] Integrate the same component into the mobile hero and desktop homepage category discovery without duplicating taxonomy URLs.
- [ ] Run focused Vitest and Chromium/WebKit homepage specs.

### Task 3: Apply the shared 70/30 system across route families

**Files:**
- Modify: `app/globals.css`
- Modify only where necessary: current route/page and shared component files already changed by the approved rebuild.
- Test: existing design, layout, taxonomy, and UI-contract Vitest suites.

- [ ] Audit route markup against the shared classes and identify isolated legacy treatments.
- [ ] Add shared premium/brutalist page-header, panel, card, selected-state, toolbar, form, and empty-state treatments; keep task-heavy controls visually restrained.
- [ ] Verify homepage, Browse/Marketplace, listing detail, sell/edit, profile/account, auth, messaging, favorites, notifications, saved searches, settings, admin, error/offline, and footer use the same token vocabulary.
- [ ] Run focused Vitest contracts and static accessibility checks.

### Task 4: Visual, accessibility, and performance refinement

**Files:**
- Modify: only defects found by browser review.
- Test: `tests/e2e/homepage-hero.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/browse.spec.ts`, and other safe read-only specs.

- [ ] Capture and inspect homepage, browse/marketplace, listing, auth, and available account-state screenshots at phone/tablet/desktop sizes.
- [ ] Verify pointer, touch, keyboard, focus, Escape/Close, reduced motion, no overflow, and mobile-nav clearance.
- [ ] Fix the highest-impact visual/accessibility defects and rerun their focused regressions.
- [ ] Run the full required width matrix in Chromium and WebKit with only read-only flows enabled.

### Task 5: Final verification and ledger

**Files:**
- Modify: `.superpowers/sdd/2026-10-14-complete-product-rebuild/progress.md`

- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check`.
- [ ] Run safe Chromium and WebKit suites; record exact pass/fail counts and environment limitations.
- [ ] Run the design-taste lint/inspection and shadcn audit checklist; inspect final screenshots.
- [ ] Update the progress ledger with implementation, MCP provenance, browser evidence, and authenticated-state limitations.

