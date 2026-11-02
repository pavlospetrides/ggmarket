# Listing Anchor RSC Boundary Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the production React Server Component boundary violation while preserving every Smart Back Navigation anchor key and behavior.

**Architecture:** Move `listingAnchorKey(context, listingId)` from the client component module into one pure `lib/` module. Server listing cards and the client navigation module consume the same function; a synthetic server-rendered card route exercises the real Next.js RSC boundary without a database.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, TypeScript, Vitest, Playwright.

**Spec:** User request “GGMarket — CRITICAL Production Runtime Fix” dated 2026-10-30 (conversation-only specification).

## Global Constraints

- Preserve the exact `${context}:${listingId}` anchor-key format and existing session-state compatibility.
- Do not turn Server Components into Client Components, disable SSR, remove Smart Back Navigation, or change Supabase/security behavior.
- Do not connect to production Supabase or commit, push, merge, deploy, or modify production data.
- Production runtime verification must use `next start`; unavailable isolated infrastructure is reported, never replaced with production credentials.

## Review Focus

- Home and related-listing server grids must render without calling a client-exported function.
- Browse discovery cards must use the same key format as client-side restoration.
- Marketplace, Favorites, and Profile client trees must keep using the shared key without a duplicate implementation.
- The RSC regression route must render production card components, not a mock or copied card.
- The strict two-pixel WebKit anchor-restoration assertion must remain unchanged.

---

### Task 1: Pure anchor-key utility

**Files:**
- Create: `lib/listing-navigation.ts`
- Modify: `components/listing-navigation.tsx`
- Modify: `components/listing-card.tsx`
- Modify: `components/discovery-listing-card.tsx`
- Modify: `components/navigation-restoration-harness.tsx`
- Modify: `tests/listing-navigation-link.test.ts`

**Interfaces:**
- Produces: `listingAnchorKey(context: string, listingId: string): string`, safe in server and client module graphs.
- Preserves: exact anchor key output consumed by stored browsing snapshots.

- [ ] Write a Vitest import/format regression against `lib/listing-navigation.ts` and update the existing navigation tests to consume that public utility.
- [ ] Run the focused test and verify RED because the neutral module does not exist.
- [ ] Add the pure module, remove the client-module export, and update every import.
- [ ] Run focused tests and TypeScript; expect all to pass.

### Task 2: Real RSC regression harness

**Files:**
- Create: `app/test-harness/navigation/server-cards/page.tsx`
- Modify: `tests/e2e/listing-navigation.spec.ts`

**Interfaces:**
- Consumes: production `ListingCard`, `DiscoveryListingCard`, and neutral `listingAnchorKey` through their real server render paths.
- Produces: a guarded synthetic route that fails if either card calls a client-module export from the server.

- [ ] Add a server-only synthetic route and Playwright assertion for both production card variants.
- [ ] Before Task 1 implementation, run the assertion against the broken tree and record the confirmed RSC boundary failure.
- [ ] After Task 1, run the assertion in Chromium and WebKit and expect successful HTML/RSC rendering.

### Task 3: Production/runtime and regression verification

**Files:**
- No production source changes expected.

**Interfaces:**
- Consumes: the fixed module graph and existing navigation/security suites.
- Produces: evidence for release recommendation and explicit infrastructure limitations.

- [ ] Run TypeScript, ESLint, Vitest, `git diff --check`, and the Smart Back Navigation four-project matrix.
- [ ] Start disposable local Supabase from repository configuration; if Docker/Podman is unavailable, record the blocker and do not use hosted production credentials.
- [ ] Run `next build`, then the repository production start command and HTTP/browser smoke checks for `/`, `/marketplace`, `/browse`, listing, profile, and isolated authenticated routes when the disposable database is available.
- [ ] Run relevant mutation guards/security tests and confirm no RLS, auth, CSP, schema, or migration files changed.
- [ ] Report real iPhone gesture coverage separately from simulated WebKit.
