# PC Hardware Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comprehensive, dependency-safe PC hardware taxonomy that powers seller creation/editing and buyer filtering/search through the existing JSONB architecture.

**Architecture:** A dedicated pure PC taxonomy module owns component definitions and compatibility constraints. The current gaming-taxonomy facade composes it into existing seller, display, URL, and query flows so there is one taxonomy contract and no database migration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Supabase/PostgREST JSONB, Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-10-16-pc-hardware-taxonomy-design.md`

## Global Constraints

- Preserve every pre-existing worktree change and the completed gaming-console taxonomy.
- Do not commit, push, deploy, install dependencies, mutate Supabase, enable `E2E_ALLOW_MUTATION`, add migrations, or modify RLS/secrets.
- Preserve existing category IDs/slugs and legacy listing attributes.
- Seller, buyer, edit, display, validation, and query behavior must share one definition.
- Physical Format must remain removed.

## Review Focus

- A crafted URL or payload must not pair an Intel/AMD socket, family, generation, chipset, or model incorrectly.
- Changing a dependency must clear every invalid descendant without clearing unrelated filters or listing fields.
- Arrays must be accepted only for declared multi-select fields such as cooler sockets and case motherboard support.
- Free-text fallback models must remain bounded and must not grant inferred compatibility.
- Legacy PC listings without taxonomy metadata must remain browsable and safely editable.

---

### Task 1: Central PC taxonomy and compatibility engine

**Files:**
- Create: `lib/pc-hardware-taxonomy.ts`
- Modify: `lib/gaming-taxonomy.ts`
- Create: `tests/pc-hardware-taxonomy.test.ts`

**Interfaces:**
- Produces `PC_HARDWARE_ROOT`, `getPcHardwareFields`, `validatePcHardwareAttributes`, `prunePcHardwareAttributes`, dependency metadata, and PC search intent.
- Existing taxonomy helpers continue as the public facade.

- [ ] Write failing table-driven tests for representative CPU, GPU, RAM, motherboard, PSU, storage, case, cooling, and expansion paths.
- [ ] Run `npm test -- tests/pc-hardware-taxonomy.test.ts` and confirm failures are caused by the missing module/behavior.
- [ ] Implement immutable definitions, dependency resolution, validation, pruning, labels, and representative verified models with `other` fallback.
- [ ] Compose the PC root and field resolver into `gaming-taxonomy.ts`.
- [ ] Run the focused test and `npm run typecheck`; expect pass.

### Task 2: Server validation, serialization, and legacy safety

**Files:**
- Modify: `lib/validation.ts`
- Modify: `lib/gaming-taxonomy.ts`
- Modify: `tests/gaming-taxonomy.test.ts`
- Modify: `tests/listing-api-integrity.test.ts`

**Interfaces:**
- Consumes resolved field definitions and pruning from Task 1.
- Produces safe scalar/multiselect payload validation and legacy-preserving edit behavior.

- [ ] Add failing tests for controlled arrays, trimmed fallback values, impossible combinations, hidden stale values, and unknown legacy preservation.
- [ ] Run focused tests and verify the expected failures.
- [ ] Generalize array validation to declared multiselect fields and sanitize submitted strings without rewriting stored legacy data.
- [ ] Ensure create/PATCH validation checks the final category-specific PC payload.
- [ ] Run taxonomy/API tests and typecheck; expect pass.

### Task 3: Seller create, edit, and preview integration

**Files:**
- Modify: `components/taxonomy-selector.tsx`
- Modify: `components/taxonomy-attribute-fields.tsx`
- Modify: `components/sell-wizard.tsx`
- Modify: `components/manage-listing-form.tsx`
- Modify: `tests/sell-taxonomy.test.ts`
- Modify: `tests/taxonomy-ui-integrity.test.ts`

**Interfaces:**
- Consumes the shared dynamic field resolver/pruner.
- Produces progressive accessible controls and identical create/edit serialization.

- [ ] Add failing behavior tests for parent changes clearing descendants and representative seller payloads.
- [ ] Run focused tests and confirm expected failures.
- [ ] Render dependency-aware fields from current values, prune on every parent change, expose bounded `other` model input, and show taxonomy/specifications in Preview.
- [ ] Preserve unknown legacy data during edit while preventing stale taxonomy fields from being resubmitted.
- [ ] Run seller/UI/taxonomy tests and typecheck; expect pass.

### Task 4: Buyer filters, URLs, search, and query consistency

**Files:**
- Modify: `lib/gaming-taxonomy.ts`
- Modify: `components/marketplace-browser.tsx`
- Modify: `components/taxonomy-navigation.tsx` if necessary
- Modify: `tests/taxonomy-search.test.ts`
- Modify: `tests/e2e/browse.spec.ts`

**Interfaces:**
- Consumes Task 1 dependency metadata and field options.
- Produces exact JSONB filters, dependent URL updates, active labels, and structured CPU/GPU search intent.

- [ ] Add failing tests for exact numeric/boolean/array filters, invalid crafted combinations, search precedence, and dependency clearing.
- [ ] Run focused tests and confirm expected failures.
- [ ] Extend the filter allowlist and dynamic sidebar/sheet controls using the current URL as field context.
- [ ] Add immediate Native History API updates plus `router.refresh()` for dependency-changing controls, preserving unrelated state and focus.
- [ ] Run search/filter unit tests and focused Chromium/WebKit Browse tests; expect pass.

### Task 5: Full verification and progress record

**Files:**
- Modify: `.superpowers/sdd/2026-10-16-pc-hardware-taxonomy/progress.md`
- Modify only defects discovered by verification.

**Interfaces:**
- Consumes all preceding work.
- Produces evidence-backed release assessment.

- [ ] Run TypeScript, ESLint, full Vitest, production build, and diff integrity checks.
- [ ] Run safe Chromium and WebKit coverage for PC filters at required widths without database mutation.
- [ ] Inspect seller controls through fixtures/source contracts and public buyer screens visually at mobile and desktop sizes.
- [ ] Review accessibility, focus continuity, URL back/forward behavior, listing display, legacy behavior, and changed files.
- [ ] Perform final code review and record findings/rulings in the ledger.
