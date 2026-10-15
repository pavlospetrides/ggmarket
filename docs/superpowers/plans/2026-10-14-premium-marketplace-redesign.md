# GGMarket Premium Marketplace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign GGMarket into a cohesive, premium, responsive player-to-player gaming marketplace while preserving its current behavior and security boundaries.

**Architecture:** Keep App Router pages as Server Components and preserve current data functions. Consolidate visual language in global tokens and focused shared components, then redesign the public discovery surfaces and let authenticated/application surfaces inherit the same primitives. Existing client components remain narrow interactive islands.

**Tech Stack:** Next.js 16.3.8 App Router, React 19.2, TypeScript 5.9, Tailwind CSS 4, Supabase, Lucide, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-premium-marketplace-redesign-design.md`

## Global Constraints

- Do not modify Supabase migrations, schema, RLS, authentication, API contracts, payments, or production configuration.
- Do not install dependencies, commit, deploy, or fabricate production data.
- Preserve existing routes, real listing data, official GGMarket logo, and unrelated files.
- Minimum intended touch target: 44×44 CSS pixels.
- Required responsive widths: 320, 375, 390, 430, 768, 1024, 1440, and 1920 pixels.
- Motion must respect `prefers-reduced-motion`.
- Public pages remain server-rendered; add client boundaries only for genuine interaction.

## Review Focus

- Empty or image-less real inventory must not create broken hero/card layouts.
- Long listing titles, prices, locations, usernames, and category labels must not overflow at 320px.
- Sticky header, mobile navigation, filters, and listing action bar must not obscure content or each other.
- Keyboard focus, dialog labels, search labels, and action names must remain discoverable after visual restyling.
- Remote listing images must retain stable aspect ratios and appropriate responsive `sizes`.

---

### Task 1: Global design foundation and navigation

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `components/header.tsx`
- Modify: `components/mobile-nav.tsx`
- Modify: `components/logo.tsx`
- Test: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Produces: stable global token/class contracts for buttons, inputs, cards, page containers, headings, navigation, focus, and reduced motion.
- Consumes: current route/auth/search behavior unchanged.

- [ ] Add a single optimized variable font in the root layout and expose it through a CSS variable.
- [ ] Replace decorative gradients, resting shadows, and global grid ornament with flat graphite/navy fields and consistent tokens.
- [ ] Restyle shared primitives while preserving existing class names used across the repository.
- [ ] Recompose desktop and mobile navigation without changing accessible names or routes.
- [ ] Run TypeScript, ESLint, and Vitest.

### Task 2: Product-led homepage and discovery components

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/category-grid.tsx`
- Modify: `components/listing-card.tsx`
- Modify: `components/listing-grid.tsx`
- Modify: `components/search-bar.tsx`
- Test: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: global primitives from Task 1 and real `Listing`/`Category` data.
- Produces: compact listing-card contract reused by marketplace, favorites, seller profiles, and related listings.

- [ ] Add a source-level regression test for required homepage semantics and honest data usage; observe failure before implementation.
- [ ] Rebuild the hero around real listing media, direct search, and explicit player-to-player language with an image-less fallback.
- [ ] Recompose categories as a dense text-and-media index rather than identical outlined icon cards.
- [ ] Improve listing cards and grids for scan density, stable media, favorite action, condition, location, price, and seller cues.
- [ ] Add a concise trust/process section and seller CTA using only supported capabilities.
- [ ] Run the regression test, TypeScript, ESLint, and Vitest.

### Task 3: Marketplace, browse, listing detail, and shared states

**Files:**
- Modify: `components/marketplace-browser.tsx`
- Modify: `components/discovery-listing-card.tsx`
- Modify: `components/product-rail.tsx`
- Modify: `components/browse-hero.tsx`
- Modify: `app/browse/page.tsx`
- Modify: `app/marketplace/loading.tsx`
- Modify: `app/browse/loading.tsx`
- Modify: `app/listing/[id]/page.tsx`
- Modify: `components/listing-gallery.tsx`

**Interfaces:**
- Consumes: Tasks 1–2 global primitives and listing-card language.
- Produces: consistent discovery, filters, loading states, detail hierarchy, and sticky mobile actions.

- [ ] Preserve URL-driven filtering, sort, mobile dialog roles/labels, and current data flow.
- [ ] Simplify browse compositions into flat image fields and real-data rails; remove synthetic ornament and repetitive banners.
- [ ] Align listing detail hierarchy with the product-led system without changing messaging/favorite/report actions.
- [ ] Verify image sizing, empty/loading states, and 44px controls.
- [ ] Run TypeScript, ESLint, Vitest, and safe read-only browser interactions.

### Task 4: Authenticated and form surfaces

**Files:**
- Modify only as required: `components/auth-shell.tsx`, `components/auth-form.tsx`, `components/sell-wizard.tsx`, `components/profile-view.tsx`, `components/settings-form.tsx`, `components/chat-interface.tsx`
- Modify only as required: `app/favorites/page.tsx`, `app/profile/page.tsx`, `app/settings/page.tsx`, `app/sell/page.tsx`, `app/messages/page.tsx`, `app/notifications/page.tsx`, `app/saved-searches/page.tsx`

**Interfaces:**
- Consumes: Task 1 global tokens/classes.
- Produces: coherent form, status, empty, and account experiences without behavior changes.

- [ ] Remove visual inconsistencies that global primitives cannot safely address.
- [ ] Preserve every form label, validation/error state, live region, submission path, and authorization redirect.
- [ ] Verify mobile form flow and sticky navigation spacing through read-only or non-submitting browser checks.
- [ ] Run TypeScript, ESLint, and Vitest.

### Task 5: Visual validation, accessibility review, and release checks

**Files:**
- Modify: `tests/e2e/responsive.spec.ts` only if non-mutating regression coverage is needed.
- Modify: implementation files only for issues found during validation.

**Interfaces:**
- Consumes: all redesigned surfaces.
- Produces: evidence for responsive, visual, accessibility, performance, and build quality.

- [ ] Run design-taste lint and inspector; fix all defensible page-level failures and document brand-required exceptions.
- [ ] Capture and inspect screenshots at 320, 375, 390, 430, 768, 1024, 1440, and 1920 pixels across key public routes.
- [ ] Use Chrome DevTools MCP if the session call succeeds for runtime diagnostics; otherwise use Playwright/browser logs.
- [ ] Apply the web-design-guidelines review to changed UI and fix material accessibility/UX findings.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` with fresh output.
- [ ] Run only E2E tests proven safe for the configured environment; otherwise report the isolation blocker explicitly.
- [ ] Perform a final code review against the spec and fix Critical/Important findings.
