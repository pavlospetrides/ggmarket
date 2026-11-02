# Sell Specification Mapping Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make seller specifications category-aware and consistent across preview, API payloads, editing, and published listing details without rewriting stored listings.

**Architecture:** `lib/gaming-taxonomy.ts` owns schema-aware display formatting. Sell preview, marketplace chips, and listing detail pass category context into that formatter, while `buildListingTaxonomyAttributes` remains the canonical category-isolation and persistence boundary.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright, Supabase JSONB.

**Spec:** `docs/superpowers/specs/2026-10-29-sell-specification-mapping-design.md`

## Global Constraints

- Preserve commit `ca3d70a` mobile UI repairs, navigation performance, authentication, RLS, and security hardening.
- Do not commit, push, merge, deploy, install dependencies, or mutate the configured Supabase project.
- Use deterministic test harnesses and mocked browser API responses for state-changing flows.
- Do not silently rewrite existing listing attributes.

## Review Focus

- Free-text values that collide with another field's option value remain unchanged.
- Structural values such as platforms and console models remain human-readable.
- Category switches remove known incompatible fields without deleting unrelated legacy metadata.
- Draft/edit restoration uses the same stable identifiers as creation.
- Preview and published detail produce identical labels and values for the same category payload.

---

### Task 1: Schema-Aware Taxonomy Formatting

**Files:**
- Modify: `tests/gaming-taxonomy.test.ts`
- Modify: `lib/gaming-taxonomy.ts`

**Interfaces:**
- Produces: `formatTaxonomyAttribute(key, value, categorySlug?, attributes?)` with category-specific field resolution.

- [ ] Add failing tests for Gaming PC RAM `16`, Games PEGI `16`, free-text/option collisions, structural values, and every configured taxonomy root.
- [ ] Run the focused Vitest test and confirm RAM incorrectly formats as `PEGI 16`.
- [ ] Replace the global value-only lookup with field/category-specific option resolution.
- [ ] Run focused taxonomy tests to green.

### Task 2: Preview and Published Detail Consistency

**Files:**
- Modify: `components/sell-wizard.tsx`
- Modify: `components/marketplace-browser.tsx`
- Modify: `app/listing/[id]/page.tsx`
- Modify: `tests/taxonomy-ui-integrity.test.ts`

**Interfaces:**
- Consumes: Task 1 formatter context.
- Produces: consistent preview, filter-chip, and detail formatting.

- [ ] Add failing behavioral/source contracts requiring category context at every formatter call.
- [ ] Pass the selected category slug and complete attributes from each consumer.
- [ ] Verify preview and listing formatting tests pass.

### Task 3: Category Isolation, Drafts, and Editing

**Files:**
- Modify: `tests/sell-taxonomy.test.ts`
- Modify: `tests/listing-api-integrity.test.ts`
- Modify: `app/test-harness/edit/page.tsx`

**Interfaces:**
- Consumes: `buildListingTaxonomyAttributes`, API sanitization/validation, and the edit form's normalized attributes.
- Produces: regressions for category switching, draft payload preservation, and edit restoration.

- [ ] Add tests proving Games PEGI cannot survive a switch to Gaming PCs and Gaming PC RAM cannot survive a switch to Games.
- [ ] Add API/edit fixtures proving correctly keyed values survive storage-shaped round trips.
- [ ] Run the focused suites and change production code only if a confirmed persistence defect appears.

### Task 4: Six-Step Browser Regression

**Files:**
- Modify: `app/test-harness/sell/page.tsx`
- Modify: `tests/e2e/sell-touch-safe.spec.ts`

**Interfaces:**
- Uses only the production Sell Wizard with deterministic categories and mocked network responses.

- [ ] Extend the safe harness with Gaming PCs and Consoles.
- [ ] Add a complete six-step Gaming PC scenario asserting `RAM: 16 GB`, absence of PEGI, and the exact captured POST attributes.
- [ ] Add a complete Games scenario asserting PEGI belongs only to the Games payload and preview.
- [ ] Add a mid-wizard category-change scenario proving incompatible fields disappear.
- [ ] Run Chromium and WebKit with `E2E_UI_HARNESS=1` and no Supabase mutations.

### Task 5: Final Verification

- [ ] Run TypeScript, ESLint, full Vitest, focused Playwright in Chromium/WebKit, and the production build.
- [ ] Inspect the final diff for storage/security changes and verify no migration or Supabase data mutation exists.
- [ ] Report root cause, affected categories, before/after values, files, test evidence, existing-listing impact, and GO/NO-GO.
