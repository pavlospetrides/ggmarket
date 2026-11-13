# Collectibles & Cards Hierarchy Implementation Plan

> **For agentic workers:** Use the executing-plans workflow inline; steps use checkboxes for progress.

**Goal:** Replace the prior flat collectible taxonomy with the requested two-group native category across seller and buyer flows.

**Architecture:** Keep the `collectibles` category row and shared listing JSONB model. Store primary group as `family` and canonical leaf as `item_type`; retain old values and add these keys to older listings in a forward migration. Extend the shared selector, navigation, filter resolver, and field schema without adding standalone listing infrastructure.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase/PostgreSQL, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-collectibles-cards-hierarchy-design.md`

## Global constraints

- Exact category label: `Collectibles & Cards`.
- Exact primary groups: `Collectibles`, `Cards`.
- Six item types per group as specified in the design.
- Preserve existing listing/category data and RLS.
- Do not deploy, merge, or apply production SQL.

## Review focus

- Older `subcategory` values must remain untouched while appearing under a new group and leaf filter.
- A group change must clear the previous leaf and category-specific attributes.
- `Cards` and `Collectibles` filters must share the same taxonomy on Browse, Marketplace, and Search.
- Grading fields must be accepted only in the Cards branch and only for graded items.
- Category changes must not leak another category's labels, values, or filters.

---

### Task 1: Taxonomy and migration

**Files:** `lib/collectibles-taxonomy.ts`, `lib/gaming-taxonomy.ts`, `supabase/migrations/202611130004_collectibles_cards_hierarchy.sql`, `supabase/seed.sql`, taxonomy and migration tests.

**Interfaces:** `family` and `item_type` form canonical filters. The taxonomy root has two family children with six leaf children each. `getCollectiblesFields`, `validateCollectiblesAttributes`, and `resolveTaxonomyQuery` consume this contract.

- [ ] Write failing tests for exact labels/tree, valid and invalid seller attributes, old-value formatting, search inference, and both-level query filters.
- [ ] Run focused tests and confirm red.
- [ ] Implement taxonomy and SQL backfill; test SQL on disposable embedded PostgreSQL.
- [ ] Run focused tests and confirm green.

### Task 2: Seller selection and edit restoration

**Files:** `components/taxonomy-selector.tsx`, `components/taxonomy-attribute-fields.tsx`, `components/sell-wizard.tsx`, `components/manage-listing-form.tsx`, seller tests and UI harness.

**Interfaces:** Sellers choose `family` then `subcategory` leaf; the builder writes `item_type` alongside the new listing's `subcategory`. Editing resolves the canonical leaf from `item_type` and retains old attributes unless the taxonomy is changed.

- [ ] Add failing selector/builder and create/edit tests for both groups, conditional fields, and group switching.
- [ ] Run focused tests and confirm red.
- [ ] Implement selector and form behavior using the existing wizard and API.
- [ ] Run focused tests and confirm green.

### Task 3: Browse, marketplace, search, and detail

**Files:** `components/taxonomy-navigation.tsx`, `components/taxonomy-breadcrumbs.tsx`, `components/marketplace-browser.tsx`, `components/category-switchboard.tsx`, `app/page.tsx`, `app/listing/[id]/page.tsx`, integration and Playwright tests.

**Interfaces:** Buyer links use `category=collectibles&family=<group>&item_type=<leaf>`. Top-level category links omit both filters. Shared listing query matches both newly created and backfilled listings.

- [ ] Add failing URL/navigation and buyer flow tests for all, each group, each leaf, sorting, and search.
- [ ] Run focused tests and confirm red.
- [ ] Implement shared navigation/filter/detail integration and responsive copy.
- [ ] Run focused tests and browser matrix; confirm green.

### Task 4: Release verification and documentation

**Files:** Collectibles runbook and security review; tests as needed for discovered failures.

- [ ] Update deployment and rollback instructions for the new migration and unknown remote state.
- [ ] Run TypeScript, ESLint, full Vitest, production build, isolated Playwright matrix, and applicable RLS/security checks.
- [ ] Review the whole branch diff for data loss, query leakage, and UI regressions; fix important findings.
- [ ] Commit and push the updated feature branch/PR; report exact files, results, and migration requirement.
