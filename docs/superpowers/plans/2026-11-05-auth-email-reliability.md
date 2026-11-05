# Authentication Email Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make password recovery and email/password signup confirmation scanner-safe, cross-browser, and reliable from iPhone Gmail while preserving OAuth and recovery-session controls.

**Architecture:** Both email flows use distinct token-hash entry routes. A GET validates and stages one typed token in a short-lived HttpOnly, Secure-in-production, SameSite=Lax cookie, then redirects to a clean landing that never consumes the token and never fails merely because the cookie was omitted during the cross-site redirect. An explicit same-origin POST reads the scoped cookie, calls Supabase `verifyOtp` with the fixed flow type, validates the resulting session/account state, and redirects to the existing recovery or welcome destination.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Auth/SSR, TypeScript, Vitest, Playwright Chromium/WebKit.

**Spec:** `C:/Users/Pavlos/.codex/attachments/14acdd89-566f-411f-b575-4b2aab3de692/Pasted text.txt`

## Global Constraints

- GET email-link requests must never call `verifyOtp` or consume a one-time token.
- Recovery, signup confirmation, OAuth codes, and ordinary login redirects remain explicitly typed and separate.
- Token hashes stay out of rendered markup, analytics, logs, redirect destinations, and browser-visible error messages.
- POST verification requires a trusted same-origin request and a scoped pending cookie; cookies are never `SameSite=None`.
- Recovery password update continues to require verified JWT recovery AMR and active-account checks.
- Google OAuth callback/account-linking behavior and existing RLS/profile initialization remain unchanged.
- Dashboard, merge, and deployment changes are manual; this branch supplies exact templates and instructions only.

## Review Focus

- A cross-site email navigation whose redirect omits the new cookie must still render the explicit confirmation action; the POST then fails safely if storage truly failed.
- A scanner GET, HEAD, reload, or duplicate GET must never invoke Supabase verification.
- A cross-site POST or a cookie for the wrong auth flow must never consume either token type.
- A used signup link with an already-confirmed signed-in user must show the safe already-verified continuation; a signed-out user gets non-enumerating recovery guidance.
- OAuth errors/codes and legacy callback URLs must not enter either new token-hash confirmation path.

---

### Task 1: Cross-browser recovery staging

**Files:**
- Modify: `lib/recovery-pending.ts`
- Modify: `app/auth/recovery/continue/page.tsx`
- Modify: `tests/auth-recovery-route.test.ts`
- Modify: `tests/recovery-landing-page.test.ts`
- Modify: `tests/e2e/password-recovery.spec.ts`

**Interfaces:**
- Consumes: existing `PENDING_RECOVERY_COOKIE`, `/auth/recovery`, and `/auth/recovery/confirm` contracts.
- Produces: a SameSite=Lax scoped staging cookie and a cookie-independent explicit-confirmation landing.

- [ ] Write unit and external-origin Playwright regressions proving GET does not verify, the landing remains actionable after a cross-site redirect, the token is absent from HTML, and POST remains same-origin-only.
- [ ] Run focused Vitest/Playwright and observe the current Strict-cookie/landing assertions fail.
- [ ] Change only the staging cookie to SameSite=Lax and make the landing action independent of redirect-time cookie visibility; retain HttpOnly, production Secure, path, TTL, no-store, no-referrer, and POST validation.
- [ ] Run focused tests and commit the independently working recovery fix.

### Task 2: Scanner-safe signup confirmation

**Files:**
- Create: `lib/email-confirmation-pending.ts`
- Create: `app/auth/confirm-signup/route.ts`
- Create: `app/auth/confirm-signup/continue/page.tsx`
- Create: `app/auth/confirm-signup/verify/route.ts`
- Create: `tests/auth-confirm-signup-route.test.ts`
- Create: `tests/signup-confirmation-landing-page.test.ts`
- Create: `tests/e2e/signup-confirmation.spec.ts`
- Modify: `app/verify-email/page.tsx`

**Interfaces:**
- Consumes: Supabase SSR `createClient()`, `verifyOtp({ token_hash, type: "email" })`, `is_active_user`, and existing `/settings/verification` welcome UI.
- Produces: `/auth/confirm-signup` GET staging and `/auth/confirm-signup/verify` POST consumption with typed safe outcomes.

- [ ] Write failing route/render/browser tests for valid format, missing/invalid token, scanner GET, external-origin landing, same-origin POST, CSRF rejection, successful session/welcome redirect, inactive account, expired/reused token, already-verified session, provider failure, and duplicate submission semantics.
- [ ] Run focused tests and verify failures are caused by missing routes.
- [ ] Implement the scoped pending-token helper, clean explicit-confirmation landing, and POST verifier with fixed `type: "email"`, active-account check, session persistence through Supabase SSR, safe already-verified handling, and no token reflection.
- [ ] Run focused tests and commit the complete signup-confirmation endpoint.

### Task 3: Signup producers, templates, and callback separation

**Files:**
- Modify: `lib/auth-redirect.ts`
- Modify: `components/auth-form.tsx`
- Modify: `app/auth/register/route.ts`
- Modify: `app/api/verification/email/route.ts`
- Modify: `app/auth/callback/route.ts`
- Modify: `docs/auth/confirm-signup-email.html`
- Create: `supabase/templates/confirmation.html`
- Modify: `supabase/config.toml`
- Modify: `docs/auth/production-email-verification.md`
- Modify: `.env.example`
- Modify: `tests/auth-register-logout-routes.test.ts`
- Modify: `tests/email-verification-api.test.ts`
- Modify: `tests/auth-callback-verification.test.ts`
- Modify: `tests/confirmation-email-template.test.ts`

**Interfaces:**
- Consumes: Task 2 `/auth/confirm-signup` entry route.
- Produces: canonical `emailRedirectTo`, resend redirect, exact hosted/local templates using `TokenHash` and `type=email`, and an OAuth-focused callback that no longer auto-consumes signup tokens on GET.

- [ ] Update tests first to require the distinct canonical signup endpoint/template and to prove OAuth callback behavior is unchanged while signup token GET verification is absent.
- [ ] Run focused tests and observe old callback URLs/GET verification fail the new contract.
- [ ] Route browser/native signup and resend producers to `/auth/confirm-signup`; update exact reference/local templates, redirect allow-list, and manual production checklist; retain legacy recovery/OAuth callback handling without accepting new signup tokens there.
- [ ] Run focused tests and commit the producer/configuration integration.

### Task 4: Security, responsive browser, and release verification

**Files:**
- Modify as required by verified regressions only.

**Interfaces:**
- Consumes: Tasks 1-3 complete flows.
- Produces: reviewable branch evidence and deployment instructions; no merge or deployment.

- [ ] Run focused Chromium/WebKit external-origin, mobile, scanner, signup, recovery, and Google OAuth specs with isolated dummy Auth endpoints; run safe runtime smoke checks.
- [ ] Run TypeScript, ESLint, all Vitest, Playwright Chromium and WebKit, production build, `git diff --check`, and relevant migration/RLS contract tests.
- [ ] Review the whole diff for token leakage, arbitrary redirects, CSRF, cookie scope, AMR preservation, OAuth regressions, accessibility, and responsive screenshots; fix Critical/Important findings with RED-to-GREEN tests.
- [ ] Commit final documentation/test adjustments, push `fix/auth-email-flows`, open a PR against `main`, and confirm the Vercel Preview is Ready without merging or deploying.
