# Gaming Taxonomy & Smart Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one comprehensive, schema-compatible gaming taxonomy that powers seller categorization, editing, buyer navigation, structured search, contextual filters, and accessible responsive discovery.

**Architecture:** Preserve the existing database category rows as stable top-level classes and store deeper stable taxonomy identifiers in the existing indexed listing JSONB. A pure central module owns taxonomy data, validation, labels, breadcrumbs, URL facets, and search inference; the current seller and marketplace components consume it so no parallel category/filter system emerges.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, React Hook Form, Supabase/PostgREST JSONB, Tailwind CSS 4, Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-10-15-gaming-taxonomy-design.md`

## Global Constraints

- Preserve the current dirty redesign worktree and all unrelated changes.
- Preserve the seven existing migrations and do not add or apply a migration unless the current JSONB architecture proves insufficient.
- Do not mutate the configured protected Supabase project or enable `E2E_ALLOW_MUTATION`.
- Preserve existing category UUIDs/slugs, listing detail URLs, search visibility, authorization, and RLS behavior.
- Do not add account trading or unsupported digital-license resale.
- Keep seller, buyer, edit, display, and query definitions centralized and compatible.
- Use stable kebab-case taxonomy IDs and controlled values; compatibility is independent from brand.
- Keep filter/search state URL-backed and preserve browser back/forward behavior.
- Support 320, 375, 390, 393, 430, 768, 1024, 1440, and 1920 CSS pixels in Chromium and WebKit.
- Do not commit, push, deploy, install dependencies, or modify production data.

## Review Focus

- Xbox game generations and standalone console models must remain distinct; Task 1 tests the exact platform labels and hierarchy.
- Multi-platform controllers must retain multiple compatibility values and match one selected compatibility filter; Tasks 1, 2, and 4 test array validation, payloads, and containment.
- Switching seller categories must remove incompatible taxonomy keys without erasing common form work; Task 2 tests category switching and wizard-step persistence.
- Editing an unclassified legacy listing must preserve unknown attributes and its current top-level category until the seller explicitly changes them; Task 3 tests merge and legacy behavior.
- Explicit URL filters must override inferred search intent, while ambiguous words must not infer a platform; Task 4 tests precedence, residual queries, and ambiguity.

---

### Task 1: Central taxonomy, attribute types, and validation

**Files:**
- Create: `lib/gaming-taxonomy.ts`
- Modify: `lib/types.ts`
- Modify: `lib/validation.ts`
- Modify: `app/api/listings/route.ts`
- Test: `tests/gaming-taxonomy.test.ts`
- Test: `tests/phase1-rules.test.ts`

**Interfaces:**
- Produces: `AttributeValue`, `ListingAttributes`, `TaxonomyField`, `TaxonomyNode`, `GAMING_TAXONOMY`, `getTaxonomyRoot`, `getTaxonomyPath`, `getTaxonomyFields`, `normalizeTaxonomyAttributes`, `validateTaxonomyAttributes`, `formatTaxonomyAttribute`, and controlled option constants.
- Consumes: existing top-level category slugs and listing condition enum.

- [ ] **Step 1: Write failing taxonomy tests** for PS5/PSP/Xbox One/Switch 2 paths, the complete required platform inventory, distinct game-platform and console-model hierarchies, contextual field sets, compatibility arrays, legacy aliases, and human-readable fallback formatting.
- [ ] **Step 2: Run `npm test -- tests/gaming-taxonomy.test.ts`** and verify failure because the central module does not exist.
- [ ] **Step 3: Implement the immutable taxonomy data and pure lookup/normalization/validation helpers** with the exact public names in Interfaces.
- [ ] **Step 4: Extend listing attribute types and Zod schemas** to accept bounded controlled `string[]` values while rejecting objects, nested arrays, oversized arrays, and non-finite numbers.
- [ ] **Step 5: Extend create-route attribute checking** so category schema primitives still work and known taxonomy values are validated against the chosen top-level category.
- [ ] **Step 6: Run `npm test -- tests/gaming-taxonomy.test.ts tests/phase1-rules.test.ts`** and verify all focused tests pass.

### Task 2: Hierarchical seller flow and dynamic product fields

**Files:**
- Create: `components/taxonomy-selector.tsx`
- Create: `components/taxonomy-attribute-fields.tsx`
- Modify: `components/sell-wizard.tsx`
- Test: `tests/sell-taxonomy.test.tsx` or `tests/sell-taxonomy.test.ts` using the project’s current viable component/pure-function boundary
- Modify: `tests/e2e/core-flow.spec.ts`

**Interfaces:**
- Consumes: Task 1 taxonomy helpers and `ListingAttributes`.
- Produces: `TaxonomySelection`, `TaxonomySelector`, `TaxonomyAttributeFields`, and `buildListingTaxonomyAttributes(selection, fields, preserved?)` for create/edit payload parity.

- [ ] **Step 1: Write failing tests** for a PS5 game path, PSP game path, Xbox One game path, Switch game path, PS5-compatible controller with multiple compatibility values, required path validation, category-switch cleanup, and step-back state retention.
- [ ] **Step 2: Run the focused seller taxonomy tests** and verify the new interfaces are missing.
- [ ] **Step 3: Build semantic hierarchy selectors** using native labelled buttons/selects/checkboxes, a visible category preview path, 44px targets, and no new dependency.
- [ ] **Step 4: Render product-specific fields in the product/detail steps** and serialize stable taxonomy keys plus `taxonomy_version: "1"` into the create payload.
- [ ] **Step 5: Keep title/photos/description/delivery state when category changes** while clearing only incompatible taxonomy values and reporting missing required selections before advancing.
- [ ] **Step 6: Run focused Vitest and the safe non-submitting seller browser assertions** in Chromium and WebKit.

### Task 3: Legacy-safe listing editing and readable detail attributes

**Files:**
- Modify: `app/listing/[id]/edit/page.tsx`
- Modify: `components/manage-listing-form.tsx`
- Modify: `app/api/listings/[id]/route.ts`
- Modify: `app/listing/[id]/page.tsx`
- Test: `tests/gaming-taxonomy.test.ts`
- Test: `tests/listing-layout.test.ts`
- Modify: `tests/e2e/listing-readonly.spec.ts`

**Interfaces:**
- Consumes: Task 1 formatting/validation and Task 2 selection/field components.
- Produces: optional update payload fields `categoryId`, `productName`, and `attributes`; unknown legacy attributes survive through `mergeListingAttributes(existing, changes, taxonomyKeysToClear)`.

- [ ] **Step 1: Write failing tests** proving unknown legacy keys survive an edit, recognized legacy aliases prefill, changed category paths clear only taxonomy-owned incompatible keys, and arrays render as readable labels rather than raw JSON.
- [ ] **Step 2: Run focused tests** and verify the merge/display behavior is absent.
- [ ] **Step 3: Pass categories into the edit page and reuse the seller taxonomy controls** with the listing’s category/attributes as defaults.
- [ ] **Step 4: Extend the authenticated PATCH route** to load/validate the selected category, merge attributes safely, retain seller scoping, and update category/product linkage only when provided.
- [ ] **Step 5: Replace raw detail-table key/value output** with stable labels, ordered taxonomy fields, joined multi-values, and humanized legacy fallbacks.
- [ ] **Step 6: Run focused unit tests and public read-only listing browser coverage** in both engines.

### Task 4: Structured marketplace queries, filters, and search intent

**Files:**
- Modify: `lib/gaming-taxonomy.ts`
- Modify: `lib/data.ts`
- Modify: `components/marketplace-browser.tsx`
- Create: `components/taxonomy-breadcrumbs.tsx`
- Create: `components/taxonomy-navigation.tsx`
- Modify: `tests/pagination.test.ts`
- Create: `tests/taxonomy-search.test.ts`
- Modify: `tests/e2e/browse.spec.ts`

**Interfaces:**
- Produces: `inferTaxonomyIntent(query)`, `resolveTaxonomyQuery(params)`, `taxonomyFilterEntries(params)`, and one shared PostgREST attribute-filter application path used by relevance and non-relevance queries.
- Consumes: Task 1 taxonomy and the current `PaginatedListings`/URL contracts.

- [ ] **Step 1: Write failing search/query tests** for `PS5 games`, `PSP games`, `Xbox One controller`, `Nintendo Switch accessories`, `RTX 4070`, explicit-filter precedence, ambiguous `switch`, JSONB scalar containment, JSONB array containment, and clearing taxonomy filters while preserving `q`.
- [ ] **Step 2: Run focused tests** and verify missing inference/filter helpers cause the expected failures.
- [ ] **Step 3: Implement bounded structured-intent inference** that returns category, controlled attributes, and residual search text without bypassing the existing RPC/security model.
- [ ] **Step 4: Apply the same controlled attribute filters** to relevance eligibility and ordinary exact-count queries; keep RPC relevance order and deterministic pagination.
- [ ] **Step 5: Extend the existing filter form and active chips contextually** rather than creating a second filter system. Use compatibility array containment and preserve every unrelated URL parameter.
- [ ] **Step 6: Add wrapping/scroll-safe breadcrumbs and hierarchy navigation links** with truthful titles and empty-state context.
- [ ] **Step 7: Run focused Vitest plus Chromium/WebKit buyer flows** for the specified platforms, controller compatibility, GPU filtering, clear filters, category URLs, empty state, and back/forward navigation.

### Task 5: Browse/category discovery integration

**Files:**
- Modify: `app/browse/page.tsx`
- Modify: `components/category-grid.tsx`
- Modify: `app/page.tsx` only if an existing category link needs a corrected stable URL
- Modify: `app/globals.css`
- Modify: `tests/e2e/browse.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: Task 4 `TaxonomyNavigation` and URL contracts.
- Produces: a structured gaming directory whose every item links to a real marketplace query.

- [ ] **Step 1: Write failing browser assertions** for Browse → Games → PlayStation → PS5, Browse → Controllers → PS5 Compatible, and Browse → PC Components → GPU at mobile and desktop widths.
- [ ] **Step 2: Run the focused Chromium test** and verify the hierarchy links/labels are absent.
- [ ] **Step 3: Integrate the loadout-tree directory** into the existing Browse composition with dense tonal surfaces, active violet path, cyan discovery cues, and no fake counts or decorative dead buttons.
- [ ] **Step 4: Add only the CSS required** for wrapping breadcrumbs, touch targets, compact mobile hierarchy, and desktop density; preserve current brand tokens and mobile navigation clearance.
- [ ] **Step 5: Run the focused Browse/responsive tests** in Chromium and WebKit at 320, 390, 430, 768, and 1440 widths.

### Task 6: Full validation, visual review, accessibility, and release evidence

**Files:**
- Modify only files implicated by verified defects.
- Update: `.superpowers/sdd/2026-10-14-complete-product-rebuild/progress.md`
- Create: `docs/audits/2026-10-15-gaming-taxonomy-release-readiness.md`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: evidence-backed route matrix, screenshot review, accessibility findings, compatibility notes, and release verdict.

- [ ] **Step 1: Run focused seller/buyer Vitest and safe Playwright** without submitting listings or constructing a service-role client.
- [ ] **Step 2: Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check`**; fix only verified task-related regressions.
- [ ] **Step 3: Run the complete safe responsive suite in Chromium and WebKit** at 320, 375, 390, 393, 430, 768, 1024, 1440, and 1920 CSS pixels.
- [ ] **Step 4: Capture and inspect seller hierarchy via mocked/isolated UI state plus Browse/Marketplace screenshots** at phone, tablet, and desktop; verify no overflow, clipping, empty dead regions, or hidden controls.
- [ ] **Step 5: Apply the current Web Interface Guidelines** to all changed UI files and run shadcn’s audit checklist; verify labels, focus, keyboard operation, touch size, URL state, dark native controls, long labels, and reduced motion.
- [ ] **Step 6: Request an independent code review** and reproduce/fix every Critical or Important finding with a failing test before rerunning affected suites.
- [ ] **Step 7: Write the release-readiness report** listing researched pages, supported platforms, categories/fields/filters/search, legacy behavior, changed files, exact test outcomes, screenshots, limitations, protected-environment gaps, migration status, and release verdict.

## Self-review

- Every requested phase maps to Tasks 1–6: research/audit is captured in the spec; taxonomy and validation in Task 1; seller flow in Task 2; edit/legacy in Task 3; buyer/search in Task 4; Browse UX in Task 5; all required verification/reporting in Task 6.
- Interfaces use the same stable attribute keys in create, edit, query, and display paths.
- Review Focus risks each have a named failing test in their owning task.
- The plan retains the current single marketplace filter form and does not require a database migration.
- Commit steps are omitted because the user explicitly prohibits automatic commits.
