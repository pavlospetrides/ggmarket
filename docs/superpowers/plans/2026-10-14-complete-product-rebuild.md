# GGMarket Complete Product Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one cohesive, premium, accessible GGMarket frontend across every implemented user-facing route, with deliberate mobile behavior and durable cross-browser evidence.

**Architecture:** Preserve App Router server components and existing data/API boundaries. Establish shared tokens and a minimal accessible overlay primitive first, then rebuild discovery, profiles, transactional pages, and testing around those contracts. Use original local campaign media, URL-backed search/filter state, and isolated Supabase fixtures only where stateful E2E coverage is required.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Vitest, Playwright Chromium/WebKit, minimal shadcn Sheet dependency.

**Spec:** `docs/superpowers/specs/2026-10-14-complete-product-rebuild-design.md`

**Audit:** `docs/audits/2026-10-14-frontend-route-audit.md`

## Global Constraints

- Preserve all current worktree changes and existing backend/API/security behavior.
- Do not modify Supabase migrations, production data, secrets, RLS, or authorization.
- Do not commit, push, deploy, or install unrelated dependencies.
- Use version-pinned Next.js documentation before Next API changes.
- Use test-first changes for behavioral and regression fixes.
- Required widths: 320, 360, 375, 390, 393, 430, 768, 1024, 1280, 1440, and 1920px.
- State-changing E2E requires an explicitly isolated environment and deterministic cleanup.
- Stateful tests must refuse to construct an admin client unless `E2E_ALLOW_MUTATION=1` and an expected disposable Supabase project ref matches the configured URL; never print either credential or full URL.

## Review Focus

- Unbroken 100+ character usernames/display names wrap or truncate without covering profile actions.
- Empty, one-item, 48-item, and over-48-item inventories show truthful counts and intentional layouts.
- Mobile keyboard/fixed navigation never hides chat composers, listing actions, or final form controls.
- Dialog focus stays contained and returns to its trigger after every dismissal route.
- Authenticated responsive coverage proves protected layouts rather than login redirects.

---

### Task 1: Shared foundations and accessible overlays

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`, `package.json`, `package-lock.json`
- Create: `components/ui/sheet.tsx`, `components/ui/dialog.tsx`, `lib/utils.ts`
- Modify: `components/marketplace-browser.tsx`, `components/listing-gallery.tsx`, `components/report-button.tsx`
- Test: `tests/design-system.test.ts`, `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces: token/focus/safe-area foundations plus reusable `Sheet` (edge-attached flows) and `Dialog` (centered report/gallery/confirmation flows) exports.
- Consumes: current shadcn Sheet source and existing GGMarket tokens.

- [ ] Write failing Vitest assertions for token/focus contracts and Playwright assertions for focus cycling, Escape, Close, backdrop, scroll lock, and focus return.
- [ ] Run focused tests and confirm expected failures.
- [ ] Add only audited Sheet/Dialog dependencies and adapt the registry primitives to GGMarket tokens.
- [ ] Replace custom filter behavior with Sheet; use Dialog for report/gallery/confirmation flows rather than forcing every overlay into a drawer.
- [ ] Remove `.input:focus { outline: 0 }`; add strong focus-visible, safe-area, long-content, reduced-motion, and control-size foundations.
- [ ] Run focused Vitest/E2E in Chromium and WebKit.

### Task 2: Navigation and shared search/result controls

**Files:**
- Modify: `components/header.tsx`, `components/mobile-nav.tsx`, `components/search-bar.tsx`, `components/marketplace-browser.tsx`
- Create: `components/marketplace-toolbar.tsx`
- Test: `tests/design-system.test.ts`, `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces: labelled `MarketplaceToolbar` with URL-backed query, result count, Filters, Sort, and active-filter state.
- Consumes: Task 1 Sheet and focus contracts.

- [ ] Add failing tests for the real search shortcut (or removed false hint), mobile search visibility, labelled price inputs, query preservation, active-filter reset, and 44px controls.
- [ ] Run tests to verify failure.
- [ ] Implement the shared semantic GET-form toolbar without widening client boundaries.
- [ ] Keep fixed mobile navigation safe-area aware and clear of content/sticky controls.
- [ ] Run browser tests at 320, 390, 430, 768, and 1440px.

### Task 3: Mobile-first homepage and image art direction

**Files:**
- Modify: `app/page.tsx`, `app/globals.css`
- Create: `components/art-directed-hero-image.tsx`
- Add: `public/images/brand/ggmarket-hero-mobile-v2.webp`
- Test: `tests/design-system.test.ts`, `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces: responsive `<picture>` built with Next.js 16 `getImageProps()` and dedicated mobile artwork.
- Consumes: existing desktop art and Task 2 search control.

- [ ] Add failing assertions that only the selected source is requested, desktop remains stable, mobile actions fit narrow widths, and the hero clears navigation.
- [ ] Run tests and confirm the dual-priority implementation fails the contract.
- [ ] Generate original 9:16 artwork at 1080x1920 with one focal gaming subject, calm upper field, and no text/logos/people; optimize to a local WebP target below 250KiB, retain provenance in the audit report, and fall back to a deliberate crop only if image generation is unavailable.
- [ ] Implement the two-zone mobile composition and responsive source selection using pinned Next.js guidance.
- [ ] Verify the complete homepage argument: category discovery, honest real-listing states, capability-backed trust copy, selling CTA, and section rhythm—not only the hero.
- [ ] Capture/critique 320, 360, 375, 390, 393, 430, 768, and 1440px Chromium plus 390px WebKit screenshots; fix top defects.

### Task 4: Browse, search, marketplace, and large-result behavior

**Files:**
- Modify: `app/browse/page.tsx`, `app/marketplace/page.tsx`, `app/search/page.tsx`, `components/marketplace-browser.tsx`, `components/category-grid.tsx`, `components/product-rail.tsx`, `lib/data.ts`, `lib/types.ts`
- Test: `tests/e2e/browse.spec.ts`, `tests/e2e/responsive.spec.ts`, relevant Vitest query tests

**Interfaces:**
- Produces: `PaginatedListings = { items: Listing[]; total: number; page: number; pageSize: number }`; `MarketplaceBrowser` consumes that result plus `actionPath: "/marketplace" | "/search"` and route-aware reset semantics. Ordering uses the existing primary sort plus `id` as a deterministic tie-breaker; search preserves RPC relevance order.
- Consumes: Tasks 1-2 controls and existing listing/category queries.

- [ ] Replace stale carousel tests with failing assertions for one main, visible search, category navigation, filter/sort entry, and URL-backed transitions.
- [ ] Add query-layer unit fixtures for zero/one/48/>48 totals and isolated-E2E pagination only after the mutation preflight passes; verify invalid pages clamp to the last valid page and every URL parameter is preserved.
- [ ] Implement search-first Browse and remove the nested main.
- [ ] Extend read-only listing queries with exact count/range pagination, deterministic ordering, enrichment behavior, and preserved search relevance; update both Marketplace and Search callers.
- [ ] Implement truthful totals, pagination, active filters, and zero-result recovery.
- [ ] Run focused Vitest and Chromium/WebKit discovery tests.

### Task 5: Responsive profile system

**Files:**
- Modify: `components/profile-view.tsx`, `app/profile/page.tsx`, `app/profile/[username]/page.tsx`, `app/profile/listings/page.tsx`, `app/globals.css`
- Test: `tests/e2e/responsive.spec.ts`, `tests/e2e/core-flow.spec.ts`

**Interfaces:**
- Produces: explicit banner/avatar/identity/action/metadata/stats layout for own/public profiles.
- Consumes: shared tokens and listing-grid states.

- [ ] Add isolated long-content fixtures and failing assertions for no overlap, bounded scroll width, missing avatar, own/public actions, and bottom-nav clearance at every phone width.
- [ ] Run focused profile tests and confirm current failure.
- [ ] Rebuild with mobile actions on their own row, safe wrapping, stable fallbacks, and readable stats/empty states.
- [ ] Apply containment to reviews and profile listing management headers.
- [ ] Capture authenticated screenshots at 320, 390, 430, 768, and 1440px and fix defects.

### Task 6: Listing details, cards, and seller actions

**Files:**
- Modify: `app/listing/[id]/page.tsx`, `app/listing/[id]/not-found.tsx`, `app/favorites/page.tsx`, `components/listing-gallery.tsx`, `components/listing-card.tsx`, `components/discovery-listing-card.tsx`, `components/listing-grid.tsx`, `components/listing-client-tools.tsx`, `components/favorite-button.tsx`, `components/report-button.tsx`, `components/message-seller-button.tsx`
- Test: `tests/e2e/mobile-controls.spec.ts`, `tests/e2e/core-flow.spec.ts`, `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces: consistent card scan order and resilient listing detail/action layout.
- Consumes: Task 1 overlays and safe-area rules.

- [ ] Add failing long-attribute/seller-name, 320px action, and gallery/report keyboard containment tests.
- [ ] Implement resilient specification/seller text, action clearance, image behavior, and modal flows.
- [ ] Verify favorite, report, message, and listing navigation in both engines without changing business rules.

### Task 7: Authentication, settings, and selling

**Files:**
- Modify: `components/auth-shell.tsx`, `components/auth-form.tsx`, `components/forgot-password-form.tsx`, `components/reset-password-form.tsx`, `components/settings-form.tsx`, `components/item-verification.tsx`, `components/sell-wizard.tsx`, `components/manage-listing-form.tsx`
- Modify: `app/login/page.tsx`, `app/register/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/settings/page.tsx`, `app/settings/verification/page.tsx`, `app/sell/page.tsx`, `app/listing/[id]/edit/page.tsx`
- Test: `tests/e2e/core-flow.spec.ts`, `tests/e2e/responsive.spec.ts`, relevant Vitest form tests

**Interfaces:**
- Produces: shared form grouping/error/focus conventions and responsive multi-step selling.
- Consumes: Task 1 foundations and existing APIs/schemas.

- [ ] Add failing tests for invalid-field association/focus, keyboard-visible hidden controls, busy state, upload rejection, long copy, verification empty state, and unsaved navigation after a field becomes dirty (not on untouched forms); choose Stay/Discard behavior explicitly.
- [ ] Implement connected errors, focus management, visible keyboard state, confirmations, and mobile clearance.
- [ ] Verify auth/reset/settings/sell/edit success and error paths without weakening validation.

### Task 8: Messaging, notifications, saved searches, and admin

**Files:**
- Modify: `components/chat-interface.tsx`, `components/trade-proposal-form.tsx`, `components/notification-bell.tsx`, `components/notifications-list.tsx`, `components/saved-searches-manager.tsx`, `components/admin-report-actions.tsx`
- Modify: `app/messages/page.tsx`, `app/messages/[id]/page.tsx`, `app/notifications/page.tsx`, `app/saved-searches/page.tsx`, `app/admin/page.tsx`, `app/offline/page.tsx`
- Test: `tests/e2e/realtime-offers.spec.ts`, `tests/e2e/mobile-controls.spec.ts`, `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces: bounded conversation shell, reachable composer, live/log semantics, safe destructive flows, truthful admin totals.
- Consumes: shared overlays, tokens, safe-area, and form conventions.

- [ ] Add failing tests for long-thread composer visibility, 320/430px text containment, labelled offer amount, async announcement, destructive confirmation, failure recovery, and cleanup.
- [ ] Implement bounded chat and robust account/admin states without altering realtime/transaction contracts.
- [ ] Correct notification cleanup by recorded row IDs and verify deterministic teardown in isolation.
- [ ] Run focused Chromium/WebKit stateful coverage.

### Task 9: Authenticated responsive and accessibility coverage

**Files:**
- Modify: `tests/e2e/responsive.spec.ts`, `tests/e2e/browse.spec.ts`, `tests/e2e/mobile-controls.spec.ts`
- Create as needed: reusable fixtures under `tests/e2e/`

**Interfaces:**
- Produces: authenticated fixture and eleven-width matrix across real content.
- Consumes: all completed routes.

- [ ] Build an authenticated fixture whose first operation validates `E2E_ALLOW_MUTATION` and the expected disposable project ref before constructing a service-role client; centralize deterministic cleanup and suppress secret output.
- [ ] Cover priority routes at all eleven widths in both engines; cover every other implemented page at 320, 390, 768, and 1440px in both engines, expanding any route where a defect appears.
- [ ] Add overflow, clipping, bottom-nav, visible-search, profile-overlap, dialog-focus, and touch-target assertions.
- [ ] Run Chromium and WebKit and retain only actionable artifacts.

### Task 10: Visual QA, independent review, and release evidence

**Files:**
- Modify only files implicated by verified defects.
- Update: `DESIGN.md` and this checklist with final evidence.
- Create: `docs/audits/2026-10-14-release-readiness.md`
- Review: `app/error.tsx`, `app/browse/loading.tsx`, `app/marketplace/loading.tsx`, all `not-found`, empty, permission-denied, and offline states.

**Interfaces:**
- Produces: final route matrix, screenshot set, accessibility/tool report, and release verdict.
- Consumes: Tasks 1-9.

- [ ] Retain the baseline screenshots already captured under `.taste-skill/audit/`; capture matching after screenshots for Home, Browse, Marketplace, and authenticated Profile, plus phone/tablet/desktop screenshots for every major route in both engines.
- [ ] Run Taste lint/inspector, current Web Interface Guidelines review, Chrome DevTools console/overflow checks, and Lighthouse accessibility on representative public/authenticated pages.
- [ ] Request independent code/design review; reproduce each Critical/Important finding with a failing test, fix once, and rerun affected suites.
- [ ] Run fresh `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and full isolated Chromium/WebKit E2E.
- [ ] Write the standalone release-readiness report with route/state ownership, PASS/FAIL/NOT VERIFIED, before/after screenshots, remaining defects, untested workflows, the existing migration blocker, and readiness. Do not commit, push, or deploy.

## Self-review

- All requested routes, priority failures, registry work, design-system areas, eleven widths, both engines, screenshots, accessibility, and reporting map to Tasks 1-10.
- Tasks 2-8 consume only shared contracts produced earlier; Task 9 consumes completed routes.
- Long identities, sparse/large inventories, keyboard/fixed UI, modal focus, and authenticated coverage each have an owning failing test.
- Steps specify files, contracts, red/green evidence, and verification without transcribing bodies.
- Commit steps are omitted because the user explicitly forbids automatic commits.
