# Smart Back Navigation & Browsing State Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return listing visitors to the exact internal page, URL state, pagination, and clicked-listing viewport position without a document reload or visible scroll jump.

**Architecture:** Keep GGMarket's existing URL-based filter, sort, search, and pagination model. Add a small versioned session-storage state layer scoped by Next.js 16 `bfcacheId`, record source/anchor geometry only when an internal listing `<Link>` navigates, restore the anchor during back/forward rendering with condition-based animation-frame stabilization, and expose a detail-page back control that calls native history only for a validated matching internal context and otherwise client-replaces to `/marketplace`.

**Tech Stack:** Next.js 16.4.3 App Router, React 19.2, TypeScript 5.9, Lucide React, Vitest 5, Playwright 1.63.

**Spec:** `C:/Users/Pavlos/.codex/attachments/3f755fec-59e0-44fa-a958-d5e822999364/Pasted text.txt`

## Global Constraints

- Work only in `.worktrees/final-security-audit`; preserve the security, navigation-performance, mobile, and Sell Wizard work already present.
- Do not commit, push, merge, deploy, install dependencies, change production data, weaken authentication/RLS, or expose credentials.
- Use Next.js `<Link>`/App Router navigation only; never use `window.location`, reload, or unvalidated return URLs.
- Preserve existing selective prefetch behavior and avoid new Supabase/network requests for restoration.
- Keep the existing URL parameter conventions as the sole source for filters, search, sorting, and pagination.
- Support desktop Chromium, mobile WebKit/iOS-style navigation, Android-style system Back, PWA history, keyboard access, and a minimum 44×44px touch target.
- Session storage must be versioned, bounded, non-sensitive, history-entry-scoped, expiry-cleaned, and unavailable-storage-safe.
- Restoration must be anchor/condition based; arbitrary timeouts may not be the primary mechanism.

## Review Focus

- A stale or malformed session-storage record must never trigger `router.back()` or an unsafe destination; Task 1 tests validation, expiry, and bounded cleanup.
- The same listing may appear in several Browse rails; Task 2 gives every source card a stable section-qualified anchor and tests horizontal plus vertical geometry capture.
- Native restoration may run after React paints; Task 3 keeps the clicked anchor stable across late layout shifts and tests that no top-to-old-position flash survives.
- A direct/external listing visit or a refreshed detail entry must replace to `/marketplace`, while forward navigation to a known detail entry must retain its valid source; Tasks 1, 3, and 4 test both paths.
- Modifier clicks/new tabs must retain normal link semantics and must not poison the current tab's navigation context; Task 2 uses Next `onNavigate` and tests modified-link behavior.

---

### Task 1: History-entry-scoped navigation state

**Files:**
- Create: `lib/listing-navigation-state.ts`
- Test: `tests/listing-navigation-state.test.ts`

**Interfaces:**
- Produces: versioned `ListingNavigationSnapshot`, `recordListingDeparture(input)`, `activateListingEntry(input)`, `readListingEntry(input)`, `readBrowsingSnapshot(input)`, and pure validation/anchor-offset helpers.
- Consumes: `Storage`-compatible session storage, current internal URL, source/destination Next `bfcacheId`, clicked anchor geometry, optional horizontal rail geometry.

- [ ] **Step 1: Write failing Vitest coverage** for valid activation, source/destination matching, stale/malformed/external rejection, direct-entry fallback, forward-entry reuse, max-entry cleanup, unavailable storage, and anchor delta calculation.
- [ ] **Step 2: Run `npm test -- tests/listing-navigation-state.test.ts`** and verify failure because the module does not exist.
- [ ] **Step 3: Implement the minimal versioned storage module** with same-origin path validation, TTL, bounded maps, guarded JSON/storage access, and no user/listing payloads beyond IDs, URLs, and geometry.
- [ ] **Step 4: Re-run the focused Vitest file** and require a clean pass.

### Task 2: Listing links record source context without changing link semantics

**Files:**
- Create: `components/listing-navigation.tsx`
- Modify: `components/listing-card.tsx`
- Modify: `components/discovery-listing-card.tsx`
- Modify: `components/listing-grid.tsx`
- Modify: `components/product-rail.tsx`
- Modify: `app/browse/page.tsx`
- Modify: `app/page.tsx`
- Test: `tests/listing-navigation-contract.test.ts`

**Interfaces:**
- Produces: `ListingNavigationLink` (Next `<Link>` wrapper using `onNavigate`), stable `data-listing-anchor` markers, and stable `data-listing-scroll-container` markers.
- Consumes: Task 1 `recordListingDeparture`, current `bfcacheId`, and existing card children/classes/prefetch behavior.

- [ ] **Step 1: Write failing contract tests** asserting listing destinations use the wrapper, anchors are stable and context-qualified, rails expose restoration keys, ordinary internal links remain unchanged, and no full-document navigation APIs are introduced.
- [ ] **Step 2: Run the focused contract test** and verify the expected failure.
- [ ] **Step 3: Implement the client wrapper and integrate it** into standard/discovery cards while preserving modifier-click/new-tab behavior through Next `onNavigate`, existing card accessibility, and selective prefetching.
- [ ] **Step 4: Re-run focused tests plus `npm test -- tests/design-system.test.ts tests/interaction-resilience.test.ts`** and require clean passes.

### Task 3: Condition-based source restoration and safe detail back button

**Files:**
- Modify: `components/listing-navigation.tsx`
- Modify: `components/marketplace-browser.tsx`
- Modify: `components/favorite-listings.tsx`
- Modify: `components/profile-view.tsx`
- Modify: `app/browse/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/listing/[id]/page.tsx`
- Test: `tests/listing-navigation-contract.test.ts`

**Interfaces:**
- Produces: `BrowsingStateRestorer` and `ListingBackButton`.
- Consumes: Task 1 entry/snapshot readers and Task 2 anchors/rail keys.

- [ ] **Step 1: Extend failing tests** for a semantic button, `ArrowLeft`, accessible label/text, 44px target, visible focus, internal-context `router.back()`, safe `/marketplace` `router.replace()` fallback, and absence of `setTimeout`/reload/location navigation.
- [ ] **Step 2: Run the focused test** and verify failure for missing components/integration.
- [ ] **Step 3: Implement `BrowsingStateRestorer`** with layout-phase initial correction, anchor-first vertical correction, rail `scrollLeft` restoration, requestAnimationFrame/ResizeObserver/MutationObserver condition checks, bounded frame cleanup, and no network work.
- [ ] **Step 4: Implement and place `ListingBackButton`** before the detail breadcrumb using existing dark/purple tokens, Lucide `ArrowLeft`, keyboard-native `<button>`, safe-area-compatible flow layout, and source-aware label.
- [ ] **Step 5: Mount one restorer per listing source page**: Marketplace/Search, Browse/Recently Viewed, Favorites, public/own seller profiles, Home, and listing detail for related-listing chains.
- [ ] **Step 6: Re-run focused Vitest and existing layout/design tests** and require clean passes.

### Task 4: Deterministic async browser regression harness

**Files:**
- Create: `app/test-harness/navigation/[source]/page.tsx`
- Create: `app/test-harness/navigation/listing/[id]/page.tsx`
- Create: `components/navigation-restoration-harness.tsx`
- Create: `tests/e2e/listing-navigation.spec.ts`
- Test: `tests/e2e/listing-navigation.spec.ts`

**Interfaces:**
- Produces: non-production synthetic routes with asynchronously yielded listing data, 60 stable listing anchors, URL-reflected filters/sort/page/auth mode, related-listing navigation, and deterministic late layout growth.
- Consumes: production `ListingNavigationLink`, `BrowsingStateRestorer`, and `ListingBackButton`; route availability remains guarded by the established test-harness policy.

- [ ] **Step 1: Write failing Playwright scenarios** covering Marketplace, Browse, Search, multiple filters, sort, deep scroll, pagination, Favorites, seller profile, Saved Searches, Recently Viewed, related listing chains, browser Back/Forward, direct detail fallback, filtered URL refresh, anonymous/authenticated modes, console errors, browser navigation-entry count, and unexpected API/Supabase browser requests.
- [ ] **Step 2: Run Chromium for the new spec** and verify failures because the harness routes do not exist.
- [ ] **Step 3: Implement the smallest guarded async harness** using synthetic public data only; no Supabase client or production data.
- [ ] **Step 4: Run Chromium and WebKit focused specs** and require correct URL/state, clicked-anchor viewport tolerance, rail position, single document navigation entry, no console errors, and no unauthorized requests.

### Task 5: Progressive and release verification

**Files:**
- Review: all modified files

**Interfaces:**
- Consumes: Tasks 1–4 complete.
- Produces: fresh verification evidence and GO/NO-GO report.

- [ ] **Step 1: Run `npm run typecheck`.**
- [ ] **Step 2: Run `npm run lint`.**
- [ ] **Step 3: Run `npm test`.**
- [ ] **Step 4: Run `npm run test:e2e -- tests/e2e/listing-navigation.spec.ts --project=chromium`.**
- [ ] **Step 5: Run `npm run test:e2e -- tests/e2e/listing-navigation.spec.ts --project=webkit`.**
- [ ] **Step 6: Run broader safe/read-only Chromium and WebKit navigation suites only where the no-production-data environment permits; report every skipped gate explicitly.**
- [ ] **Step 7: Run `npm run build`.**
- [ ] **Step 8: Use a real browser at desktop and 390×844 to inspect Back, focus, touch geometry, safe areas, scroll stability, console, network, and screenshots; fix any visible jump or design/a11y regression.**
- [ ] **Step 9: Run the latest Web Interface Guidelines review on the modified UI files and the focused design-taste lint/inspection appropriate to this single component.**
- [ ] **Step 10: Inspect `git diff`/`git status` to confirm only intended files changed and no credentials/artifacts were added.**

## Self-Review

- Spec coverage: every requested source is either an existing production source integration or a deterministic regression scenario; URL filter/share/refresh behavior is preserved, not replaced.
- Step scan: each task follows RED → GREEN and has one independently verifiable deliverable.
- Type consistency: Tasks 2–4 consume only the explicit state/link/restorer/button interfaces from Task 1/2.
- Review focus: all five high-risk cases are assigned to concrete tests.
- Proportion: the plan records interfaces, constraints, and checks without embedding implementation bodies.
