# Cookie, Auth Session, and Privacy Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden verified Supabase session cookies and publish accurate essential-storage disclosures without adding a consent banner.

**Architecture:** Centralize environment-aware Supabase cookie options and private response caching helpers, then use them from both browser/server clients and auth response paths. Add server-rendered policy pages and one shared responsive footer using the current design tokens.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase SSR, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-20-cookie-auth-privacy-compliance-design.md`

## Global Constraints

- Preserve dirty-worktree changes and all existing migrations.
- Do not commit, deploy, install dependencies, change production data, or expose tokens/secrets.
- Keep Supabase auth cookies JavaScript-readable; production-only `Secure`; `SameSite=Lax`; `Path=/`.
- Do not add analytics, trackers, optional cookies, or a consent banner.
- Policies must distinguish verified facts from owner-review items.

## Review Focus

- HTTP development and LAN authentication must not receive `Secure` cookies.
- Production authentication and PKCE cookies must receive `Secure` without forcing `HttpOnly`.
- Auth redirects and authenticated responses must not be stored in shared caches.
- Footer links must remain reachable at mobile widths without obstructing bottom navigation.
- Policy copy must not promise unverified retention, legal bases, or business identity details.

---

### Task 1: Session cookie and cache hardening

**Files:**
- Create: `lib/supabase/cookie-security.ts`
- Modify: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts`, `app/auth/**/route.ts`
- Test: `tests/cookie-session-security.test.ts`

**Interfaces:**
- Produces: `getSupabaseCookieOptions(environment)`, `hasSupabaseAuthStorageCookie(cookies)`, `withPrivateNoStore(response)`.

- [ ] Write tests for production/development cookie flags, auth-cookie recognition, and private no-store headers.
- [ ] Run the test and verify it fails because the helper does not exist.
- [ ] Implement the helpers and wire every Supabase SSR client plus auth response path.
- [ ] Run the focused test and related auth/request-security tests.

### Task 2: Essential-storage policy experience

**Files:**
- Create: `app/cookies/page.tsx`, `app/privacy/page.tsx`, `components/site-footer.tsx`
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Test: `tests/privacy-disclosure.test.ts`, `tests/e2e/privacy-disclosure.spec.ts`

**Interfaces:**
- Consumes: the verified inventory in the spec.
- Produces: public `/cookies` and `/privacy` routes plus site-wide footer links.

- [ ] Write failing policy/footer contract tests.
- [ ] Run them and verify failure because routes/footer are absent.
- [ ] Implement concise policy pages and the responsive footer; remove the homepage-only duplicate footer.
- [ ] Run focused unit tests, accessibility/browser checks in Chromium and WebKit, and inspect storage/headers.

### Task 3: Audit record and comprehensive verification

**Files:**
- Create: `docs/audits/2026-10-20-cookie-auth-privacy-audit.md`

**Interfaces:**
- Consumes: source/browser evidence and Tasks 1-2 verification.
- Produces: the final evidence-backed inventory, findings, legal basis references, test matrix, and owner-review list.

- [ ] Record cookie/storage inventory without values or secrets.
- [ ] Run typecheck, lint, full Vitest, production build, and safe browser tests.
- [ ] Re-check the working-tree diff and complete a self-review because delegation was not authorized.

