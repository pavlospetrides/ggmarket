# Lootriva Card Color Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independently persisted typography and front-pattern colors to the existing Lootriva 3D lanyard card and make the modal controls reliably accessible.

**Architecture:** Extend the existing `gg_cards` owner row with constrained nullable color columns, resolve legacy rows through theme-safe defaults, and pass separate color props into the existing HTML/SVG card faces. Keep color-only changes outside the canvas physics effect and use the existing Radix dialog for focus, Escape, and restoration behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Supabase/PostgreSQL RLS, Tailwind CSS, Radix Dialog, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-lootriva-card-color-personalization-design.md`

## Global Constraints

- Preserve the existing lanyard physics, dragging, swinging, 3D flip, card dimensions, front/back interactions, reduced-motion behavior, lazy loading, and cleanup.
- Text Color and Front Pattern Color never rewrite one another.
- Accept only canonicalizable six-digit HEX colors; warn on low contrast without blocking valid choices.
- Derive ownership from the authenticated session and retain owner-only RLS; never accept a client user ID.
- Do not run a migration against production, merge, or deploy.
- Follow `DESIGN.md`: 44 px touch targets, safe-area insets, labelled fields, visible focus, inline validation, live async status, and responsive checks.

## Review Focus

- A legacy row with both new columns `NULL` keeps theme-safe readable colors; pin this in domain mapping tests in Task 1.
- Theme selection does not overwrite either custom color; pin this in the customization browser test in Task 4.
- Lowercase valid input canonicalizes while shorthand, alpha, CSS functions, declarations, and oversized strings are rejected; pin this in domain/API tests in Tasks 1 and 2.
- Rapid text/pattern edits do not rebuild the lanyard physics effect; pin effect lifecycle instrumentation in Task 3.
- Close and flip controls remain disjoint, clickable, and in-viewport with safe-area sizing at 390, 768, and 1440 px; pin bounding-box and interaction assertions in Task 4.

---

### Task 1: Color domain and additive schema

**Files:**
- Modify: `lib/gg-card.ts`
- Modify: `lib/validation.ts`
- Create: `supabase/migrations/202611120001_gg_card_custom_colors.sql`
- Modify: `supabase/tests/gg_card_rls.test.sql`
- Modify: `tests/gg-card-domain.test.ts`
- Modify: `tests/gg-card-migration.test.ts`

**Interfaces:**
- Produces: `normalizeHexColor(value: string): string | null`, `contrastRatio(foreground: string, background: string): number`, `resolveGGCardColors(themeId, textColor, frontPatternColor)`, and `GGCardConfig` fields `textColor` and `frontPatternColor`.
- Produces database columns `text_color text` and `front_pattern_color text`, each nullable with `^#[0-9A-Fa-f]{6}$` checks.

- [ ] **Step 1: Write failing domain and migration tests**

Add assertions for valid/lowercase HEX normalization, invalid CSS-like and oversized values, WCAG contrast ratios, independent defaults, legacy row mapping, exact database checks, narrow column grants, and unchanged RLS ownership policies.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/gg-card-domain.test.ts tests/gg-card-migration.test.ts`

Expected: FAIL because the color fields, helpers, and migration do not exist.

- [ ] **Step 3: Implement the domain and migration**

Extend `GGCardConfig`/`GGCardRow`, keep legacy colors nullable at rest, return canonical resolved colors to the UI, add strict Zod HEX fields, and add the forward-only migration with constrained grants. Extend pgTAP cases for valid owner writes, malformed colors, cross-user denial, public read shape, and legacy null compatibility.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/gg-card-domain.test.ts tests/gg-card-migration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(card): add validated custom color domain`

### Task 2: Owner-derived persistence and reload mapping

**Files:**
- Modify: `app/api/gg-card/route.ts`
- Modify: `lib/data.ts`
- Modify: `tests/gg-card-api.test.ts`
- Modify: `tests/security/gg-card-direct-api.mjs`

**Interfaces:**
- Consumes: `GGCardConfig`, `ggCardSchema`, and the two migration columns from Task 1.
- Produces: PATCH response `{ card: GGCardConfig }` with canonical saved colors and server/profile reads that restore both values.

- [ ] **Step 1: Write failing API persistence tests**

Assert canonical colors are written/read, malformed or extra fields fail before database access, payload size remains bounded, session ownership overrides any client targeting, and independent values round-trip without coupling.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm test -- tests/gg-card-api.test.ts`

Expected: FAIL because the API and data selectors omit the new columns.

- [ ] **Step 3: Implement persistence**

Update both card selectors, the authenticated upsert, and the returned safe shape. Extend the disposable direct-API script with valid-color round trips, malformed-color database rejection, cross-account update denial, and approved public-column reads.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/gg-card-api.test.ts tests/gg-card-domain.test.ts tests/gg-card-migration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(card): persist independent user colors`

### Task 3: Separate card text and front-pattern rendering

**Files:**
- Modify: `components/ui/lanyard-badge.tsx`
- Modify: `components/gg-card-experience.tsx`
- Modify: `tests/gg-card-section.test.ts`
- Modify: `tests/gg-card-domain.test.ts`
- Modify: `tests/lanyard-physics.test.ts`

**Interfaces:**
- Consumes: `GGCardConfig.textColor` and `GGCardConfig.frontPatternColor`.
- Produces: optional `LanyardBadgeProps.textColor`, `frontPatternColor`, and `flipButtonPosition: "top-left" | "top-right"` while preserving existing defaults and callers.

- [ ] **Step 1: Write failing render and lifecycle tests**

Assert display name, username, slogan, and personal labels use `textColor`; only the existing front ornament/arrow layers use `frontPatternColor`; hostile text remains escaped; and changing either custom color leaves physics/canvas setup dependencies unchanged.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/gg-card-section.test.ts tests/gg-card-domain.test.ts tests/lanyard-physics.test.ts`

Expected: FAIL because the lanyard exposes only the coupled `inkColor`.

- [ ] **Step 3: Implement separated rendering**

Keep `inkColor` exclusively on the strap texture and established unrelated decoration. Apply `textColor` to the built-in front/back text and `frontPatternColor` directly to the existing front SVG geometry. Do not add either color to the physics effect dependencies. Pass top-left flip placement from `GGCardExperience`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/gg-card-section.test.ts tests/gg-card-domain.test.ts tests/lanyard-physics.test.ts`

Expected: PASS with physics numerical expectations unchanged.

- [ ] **Step 5: Commit**

Commit message: `feat(card): separate text and ornament colors`

### Task 4: Accessible customization workspace and modal controls

**Files:**
- Create: `components/gg-card-color-control.tsx`
- Modify: `components/gg-card-section.tsx`
- Modify: `components/ui/dialog.tsx`
- Modify: `app/test-harness/gg-card/page.tsx`
- Modify: `tests/gg-card-section.test.ts`
- Modify: `tests/e2e/gg-card.spec.ts`

**Interfaces:**
- Consumes: color normalization/contrast helpers, `GGCardExperience`, and the Task 2 PATCH contract.
- Produces: `GGCardColorControl` with labelled color input, HEX text input, shared presets, inline validation, and contrast warning.

- [ ] **Step 1: Write failing component and browser regressions**

Cover independent preset/custom input, immediate live 3D preview, invalid-value blocking, low-contrast non-blocking warnings, Save loading/result feedback, Reset to Defaults, reload restoration through a deterministic mocked API, Escape/focus restoration, close/flip bounding-box separation, both card faces, dragging/flipping, and 390/768/1440 responsive viewports.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/gg-card-section.test.ts`

Run: `npx playwright test tests/e2e/gg-card.spec.ts --project=chromium`

Expected: FAIL on missing controls, preview behavior, and overlap assertions.

- [ ] **Step 3: Implement the controls and modal fix**

Build a compact accessible control component, keep draft values local and cheap, render one persistent `GGCardExperience` preview without keys/remounts, and preserve slogan/theme/public controls. Add a local dialog close stacking level and safe-area offsets; keep its 44 px target. Position the card flip control top-left and reserve top-right for Close.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/gg-card-section.test.ts tests/gg-card-domain.test.ts tests/gg-card-api.test.ts`

Run: `npx playwright test tests/e2e/gg-card.spec.ts --project=chromium --project=chromium-mobile --project=webkit-desktop --project=webkit`

Expected: PASS in all four configured browser projects.

- [ ] **Step 5: Capture review screenshots**

Capture front/back viewer and customization workspace at 390, 768, and 1440 px with synthetic identities only. Confirm controls do not overlap, no overflow appears, and both arbitrary color combinations are visibly independent.

- [ ] **Step 6: Commit**

Commit message: `fix(card): polish customization and modal controls`

### Task 5: Full verification, deployment notes, and PR delivery

**Files:**
- Create: `docs/deployment/gg-card-custom-colors.md`
- Modify if findings require it: files from Tasks 1–4 only

**Interfaces:**
- Produces: exact migration/deployment order, rollback/forward-fix notes, verified test matrix, security findings, screenshots, and PR description.

- [ ] **Step 1: Document safe deployment order**

Record: back up/confirm target; apply `202611120001_gg_card_custom_colors.sql`; verify checks/grants/RLS in staging; deploy application; run owner/cross-user/public smoke checks; then monitor API errors. Explicitly state production was not changed.

- [ ] **Step 2: Run static and unit gates**

Run: `npm run typecheck`

Run: `npm run lint`

Run: `npm test`

Run: `npm run build`

Expected: all exit 0 with no test failures.

- [ ] **Step 3: Run browser gates**

Run the full Playwright suite in Chromium and WebKit only against the repository's local/synthetic harness or a verified disposable backend. Do not run state-changing Supabase E2E without proving the target is disposable.

- [ ] **Step 4: Run database security gates when available**

Run pgTAP and `tests/security/gg-card-direct-api.mjs` only against an isolated disposable Supabase project. If unavailable, report them as not run rather than inferred.

- [ ] **Step 5: Review requirements and code**

Apply the current Web Interface Guidelines to changed UI files, inspect the complete diff for authorization/XSS/performance regressions, and perform the required independent code review. Resolve all Critical and Important findings.

- [ ] **Step 6: Final verification and commit**

Re-run every command needed to support the final claims, then commit documentation/fixes with `docs(card): add rollout and verification notes`.

- [ ] **Step 7: Push and open the PR**

Push `feat/lootriva-card-colors-modal`, open a PR against `main`, attach the review screenshots, and return the PR link, migration requirement, security review, exact test results, screenshots, and production deployment instructions. Do not merge or deploy.
