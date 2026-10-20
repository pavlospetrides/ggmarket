# Real iPhone Hydration Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reliable interaction on a physical iPhone using the LAN development origin, eliminate Marketplace toolbar overflow, and provide safe opt-in diagnostics when hydration still fails.

**Architecture:** Treat the three symptoms as one proven delivery failure plus two component-level robustness gaps. Allow the machine's loopback/LAN hosts to access Next development resources, generate listing request UUIDs without requiring a secure context, use direct semantic category buttons, and make the toolbar fit both hydrated and fallback states. A development-only pre-hydration diagnostic reports coarse readiness and hit-testing state without exposing user data.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Tailwind CSS, Vitest, Playwright Chromium/WebKit

**Spec:** User-provided “REAL iPHONE SAFARI BUGS STILL BROKEN” report attached on 2026-10-20.

## Global Constraints

- Preserve all unrelated uncommitted changes; do not commit, deploy, install dependencies, or mutate Supabase.
- Run state-changing journeys only against repository test harnesses and mocked network endpoints.
- Do not claim physical-iPhone success from Playwright evidence.
- Preserve desktop behavior, authentication fallbacks, taxonomy, RLS, and origin hardening.

## Review Focus

- A non-`localhost` development origin must hydrate instead of remaining in server fallback state.
- An insecure LAN origin without `crypto.randomUUID` must still render and operate the Sell wizard.
- Toolbar content must remain within 320, 360, 375, 390, 393, and 430 CSS-pixel viewports before and after hydration.
- Category selection, Next/Back persistence, and password visibility must use real touch interactions.
- Diagnostic mode must be development-only and must not display field values, URLs with query strings, credentials, cookies, or tokens.

---

### Task 1: Development-origin hydration and client UUID resilience

**Files:**
- Modify: `next.config.ts`
- Create: `lib/client-id.ts`
- Modify: `components/sell-wizard.tsx`
- Test: `tests/client-id.test.ts`
- Test: `tests/e2e/iphone-lan-hydration.spec.ts`

- [ ] Write tests that fail when a loopback/LAN-origin page remains unhydrated and when `crypto.randomUUID` is unavailable.
- [ ] Run the focused tests and confirm the failures match the reproduced causes.
- [ ] Add development-only allowed origins derived from local IPv4 interfaces and a UUID-v4 fallback based on `crypto.getRandomValues`.
- [ ] Re-run the focused tests to green.

### Task 2: Mobile toolbar and semantic Sell controls

**Files:**
- Modify: `components/marketplace-browser.tsx`
- Modify: `components/sell-wizard.tsx`
- Modify: `app/globals.css` only if component utilities cannot express the layout safely
- Test: `tests/e2e/ios-marketplace-filters.spec.ts`
- Test: `tests/e2e/sell-touch-safe.spec.ts`

- [ ] Add viewport overflow and hit-target tests across all required widths, including the non-hydrated fallback.
- [ ] Add category-button selection, Next/Back persistence, and navigation-overlap assertions using `tap()`.
- [ ] Confirm the new assertions fail for the current toolbar/label implementation.
- [ ] Implement the compact responsive toolbar and semantic category buttons with explicit React Hook Form state updates.
- [ ] Re-run both focused specs in Chromium and WebKit.

### Task 3: Password interaction and development-only evidence

**Files:**
- Modify: `components/password-field.tsx`
- Create: `public/dev-diagnostics.js`
- Modify: `app/layout.tsx`
- Test: `tests/e2e/ios-login.spec.ts`
- Test: `tests/dev-diagnostics.test.ts`

- [ ] Expand touch tests across Login, Sign Up, and Reset Password for repeated toggles, value retention, focus, and no submission.
- [ ] Add behavior tests for opt-in development diagnostics and production inactivity.
- [ ] Confirm the new tests fail before implementation.
- [ ] Add safe control markers and the opt-in `?ggdebug=1` diagnostic overlay loaded before hydration in development only.
- [ ] Re-run focused tests in Chromium and WebKit.

### Task 4: Regression verification

**Files:** No intended production changes.

- [ ] Run the relevant Vitest suite and all safe focused E2E specs against the isolated harnesses.
- [ ] Run the full Vitest suite, TypeScript, ESLint, and production build.
- [ ] Review the complete focused diff for security, accessibility, and unrelated changes.
- [ ] Record native-device verification as a remaining manual gate.
