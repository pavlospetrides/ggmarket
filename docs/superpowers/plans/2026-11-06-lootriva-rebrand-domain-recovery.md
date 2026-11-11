# Lootriva Rebrand, Domain Migration, and Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reviewable Lootriva rebrand and secure apex-domain migration, preserve marketplace/security behavior, and make password recovery reliable without changing production data or external production settings.

**Architecture:** Keep the existing Next.js 16 App Router and Supabase architecture. Centralize public-origin/legacy-host policy in `lib/site-url.ts`, preserve the scanner-safe GET-stage/POST-verify auth flow, replace only the presentation identity and URL output, and keep external cutover as a documented owner-controlled sequence.

**Tech Stack:** Next.js 16.4 App Router, React 19, TypeScript 5.9, Supabase Auth/Postgres/RLS/Storage/Realtime, Vitest 5, Playwright 1.63, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-06-lootriva-rebrand-domain-recovery-design.md`

## Global Constraints

- Canonical production origin is exactly `https://lootriva.com`; `www.lootriva.com` redirects permanently to the apex.
- Brand name is exactly `Lootriva`; compact monogram is exactly `LT`; visible badge name is exactly `Lootriva Card`.
- Outbound sender target is exactly `Lootriva <no-reply@lootriva.com>`.
- Preserve Next.js, Supabase, Vercel, RLS, private Storage, signed media, data, marketplace behavior, and the existing visual system.
- Never forward auth tokens, OAuth codes, secret-bearing query parameters, or fragments from a legacy host.
- Never trust arbitrary production Host or forwarding headers for security-sensitive absolute URLs.
- Do not run production SQL, mutate production data, change production dashboards/environment variables, merge, or deploy Production.
- Do not add dependencies; do not rewrite immutable migrations, historical audits/plans, user content, or permanent database/storage identifiers.
- Every implementation task follows red-green TDD and ends with a focused commit.

## Review Focus

- A public old-domain listing URL with ordinary query state retains its path/query and reaches the apex, while a token/code-bearing URL never carries its secret across hosts (Task 1 tests).
- A reset opened in a scanner, different browser, iPhone Safari, or in-app browser consumes nothing on GET and verifies exactly once on trusted POST (Task 2 tests).
- Production/Preview/local origin selection ignores hostile forwarded hosts without breaking Vercel Preview (Task 1 tests).
- An existing Lootriva `www` pending flow restarts safely at the apex instead of attempting a cookie/token bridge (Tasks 1 and 2 tests).
- A PWA update deletes only known application caches, never unrelated Cache Storage entries, and explains reinstall behavior across origins (Task 5 tests/runbook).

---

### Task 1: Canonical Origin and Secret-Safe Legacy Redirects

**Files:**
- Modify: `lib/site-url.ts`, `proxy.ts`, `.env.example`
- Test: `tests/site-url.test.ts`, `tests/request-security.test.ts`, `tests/proxy-performance.test.ts`, `tests/auth-redirect-url.test.ts`

**Interfaces:**
- Produces: `CANONICAL_SITE_ORIGIN = "https://lootriva.com"`; `getApplicationOrigin(currentOrigin, environment, allowBrowserPreviewOrigin)`; `buildCanonicalUrl(pathname)`; `getCanonicalRedirectUrl(requestUrl)` returning a fixed-origin safe target or `null`.
- Consumes: existing `getPublicRequestOrigin` and `secure` response policy.

- [ ] **Step 1: Write failing canonical-origin and redirect tests** asserting apex output, exact `www`/legacy host matching, ordinary path/query preservation, Preview/local behavior, no redirect loop, and safe restart targets for `token_hash`, `code`, OAuth/provider/access/refresh tokens, auth routes, and fragments.
- [ ] **Step 2: Run `npx vitest run tests/site-url.test.ts tests/request-security.test.ts tests/proxy-performance.test.ts tests/auth-redirect-url.test.ts`** and confirm failures are old-domain expectations or missing secret-safe behavior.
- [ ] **Step 3: Implement the minimal host policy in `lib/site-url.ts` and use it in `proxy.ts`**, constructing all targets from the fixed canonical origin and returning 308 only for safe public migration redirects.
- [ ] **Step 4: Update `.env.example`** to document `NEXT_PUBLIC_SITE_URL=https://lootriva.com` for Production and Preview isolation.
- [ ] **Step 5: Re-run the focused tests** and require all pass.
- [ ] **Step 6: Commit** with `fix(domain): establish Lootriva canonical origin`.

### Task 2: Recovery, Signup Confirmation, and OAuth Domain Migration

**Files:**
- Modify: `lib/auth-redirect.ts`, `lib/recovery-pending.ts`, `lib/email-confirmation-pending.ts`, `app/auth/forgot-password/route.ts`, `app/auth/recovery/**`, `app/auth/confirm-signup/**`, `app/auth/callback/route.ts`, `app/auth/update-password/route.ts`, `components/forgot-password-form.tsx`, `components/reset-password-form.tsx`, `supabase/config.toml`, `supabase/templates/recovery.html`, `supabase/templates/confirmation.html`, `docs/auth/reset-password-email.html`, `docs/auth/confirm-signup-email.html`
- Test: `tests/password-recovery.test.ts`, `tests/auth-recovery-route.test.ts`, `tests/password-update-route.test.ts`, `tests/reset-password-page.test.ts`, `tests/password-recovery-email-template.test.ts`, `tests/auth-confirm-signup-route.test.ts`, `tests/confirmation-email-template.test.ts`, `tests/auth-callback-verification.test.ts`, `tests/auth-register-logout-routes.test.ts`, `tests/email-verification-api.test.ts`, `tests/e2e/password-recovery.spec.ts`, `tests/e2e/signup-confirmation.spec.ts`, `tests/e2e/google-oauth-safe.spec.ts`

**Interfaces:**
- Consumes: Task 1 origin policy.
- Produces: canonical `buildPasswordRecoveryUrl`, `buildSignupConfirmationUrl`, and `buildAuthCallbackUrl`; Lootriva pending-cookie names; hosted/local token-hash templates; unchanged recovery-AMR password-update authorization.

- [ ] **Step 1: Add failing unit/template tests** for Lootriva URLs/subjects/copy, `TokenHash` plus exact OTP type, absence of visible `ConfirmationURL`, no enumeration, GET non-consumption, one POST verification, modified/missing/reused/expired token handling, repeated submission, active-user enforcement, and recovery-AMR enforcement.
- [ ] **Step 2: Add failing redirect tests** for an old-host recovery/signup/OAuth link proving the response contains no incoming secret and directs the user to restart safely.
- [ ] **Step 3: Run the focused Vitest auth suite** and confirm red failures.
- [ ] **Step 4: Implement the minimal domain/template/cookie-name changes** without changing Supabase client privilege, CSRF checks, SameSite/Secure/Path policy, error secrecy, or one-time verification order.
- [ ] **Step 5: Run the focused Vitest auth suite** and require all pass.
- [ ] **Step 6: Run simulated Playwright recovery/signup specs in Chromium and WebKit** only after verifying a local/disposable target; otherwise record the exact environment blocker and manual cases.
- [ ] **Step 7: Commit** with `fix(auth): migrate secure email flows to Lootriva`.

### Task 3: Original LT Identity and Shared Brand Assets

**Files:**
- Modify: `components/brand-mark.tsx`, `components/logo.tsx`, `components/site-footer.tsx`, `components/auth-shell.tsx`, `components/gg-card-experience.tsx`, `components/gg-card-section.tsx`, `app/icon.svg`, `app/apple-icon.png`, `app/layout.tsx`
- Create: `public/brand/lootriva-logo-dark.svg`, `public/brand/lootriva-logo-light.svg`, `public/brand/lootriva-mark-dark.svg`, `public/brand/lootriva-mark-light.svg`, `public/brand/lootriva-open-graph.svg`, `public/brand/lootriva-open-graph.png`, `public/brand/lootriva-app-icon-192.png`, `public/brand/lootriva-app-icon-512.png`
- Remove after replacements are proven: old `public/brand/ggmarket-*` logo/social assets
- Test: `tests/brand-identity.test.ts`, `tests/design-system.test.ts`, `tests/gg-card-api.test.ts`

**Interfaces:**
- Produces: shared LT `BrandMark` with unchanged `className` API; full/compact dark/light/monochrome assets with stable view boxes and explicit accessible titles where standalone.
- Consumes: existing design tokens and component dimensions.

- [ ] **Step 1: Write failing identity tests** for Lootriva/LT labels, exact asset inventory/dimensions, absence of ordinary-text-only monogram markup, favicon/Apple/PWA/social references, and visible `Lootriva Card` copy while `gg_card` data contracts remain stable.
- [ ] **Step 2: Run `npx vitest run tests/brand-identity.test.ts tests/design-system.test.ts tests/gg-card-api.test.ts`** and confirm red failures.
- [ ] **Step 3: Draw the LT portal mark and wordmark as maintainable SVG**, preserving current dark/light palette roles, clear space, favicon legibility, and layout sizes.
- [ ] **Step 4: Rasterize the approved SVG sources to required PNG sizes** with existing tooling or a one-off non-runtime tool; do not add a package dependency.
- [ ] **Step 5: Wire shared components and card copy**, preserving lanyard physics, animation, APIs, and responsive geometry.
- [ ] **Step 6: Re-run the focused tests** and require all pass.
- [ ] **Step 7: Commit** with `feat(brand): introduce Lootriva LT identity`.

### Task 4: Customer-Facing Copy, Current Documentation, and Legal Review Flags

**Files:**
- Modify: active files listed under “Application and component source” in `docs/audits/2026-11-06-lootriva-rebrand-domain-recovery-audit.md`; `DESIGN.md`, `README.md`, `AGENTS.md`, `SECURITY_AUDIT.md`, `docs/google-oauth-setup.md`, `docs/operations/listing-media-runbook.md`
- Test: `tests/brand-identity.test.ts`, `tests/privacy-disclosure.test.ts`, affected route/component tests

**Interfaces:**
- Consumes: Task 3 brand components/assets.
- Produces: Lootriva customer copy with no changes to user-generated data or legal facts.

- [ ] **Step 1: Add failing repository/customer-output assertions** covering page metadata, accessibility labels, API fallback HTML, auth/account/browse/profile/settings/notification copy, and legal-page review markers.
- [ ] **Step 2: Run the focused brand/privacy tests** and confirm stale-brand failures.
- [ ] **Step 3: Replace active customer-facing brand text and asset paths**; rename the editorial hero path; preserve historical docs, immutable migrations, synthetic test domains, data keys, and user content.
- [ ] **Step 4: Update privacy/cookie copy only for observable Lootriva behavior** and leave controller/legal-entity/address/retention/legal-basis facts flagged for owner/legal review.
- [ ] **Step 5: Re-run focused tests and `git grep`**, explaining every intentional active survivor.
- [ ] **Step 6: Commit** with `feat(brand): rebrand customer experience to Lootriva`.

### Task 5: SEO, Sitemap, PWA, and Browser Compatibility

**Files:**
- Modify: `lib/site-metadata.ts`, `lib/sitemap-public.ts`, `app/robots.ts`, `app/sitemap.xml/route.ts`, `app/pages/sitemap.ts`, listing/profile metadata files, `app/manifest.ts`, `public/sw.js`, `public/sw-bootstrap.js`, `components/service-worker-registration.tsx`, `app/offline/page.tsx`
- Test: `tests/seo-domain.test.ts`, `tests/sitemap-public-data.test.ts`, `tests/sitemap-routes.test.ts`, `tests/sitemap-data-security.test.ts`, `tests/service-worker.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 3 canonical URL/brand assets.
- Produces: apex canonical metadata/sitemaps/robots, Lootriva manifest/icon set, bounded known-prefix cache migration.

- [ ] **Step 1: Write failing SEO/PWA tests** for apex canonical/OG/Twitter URLs, new social image, valid sitemap index/children, private-route exclusion, manifest identity/icons, and cache cleanup that preserves unrelated caches.
- [ ] **Step 2: Run the focused SEO/PWA tests** and confirm old-origin/old-brand failures.
- [ ] **Step 3: Implement metadata/manifest/service-worker output changes** without touching sitemap data queries, RLS assumptions, signed media delivery, or unrelated storage.
- [ ] **Step 4: Re-run the focused tests** and require all pass; validate generated XML parsing and HTTP 200 behavior in a safe runtime.
- [ ] **Step 5: Commit** with `feat(seo): migrate metadata and PWA to Lootriva`.

### Task 6: Active Tooling, Test Fixtures, and Scoped Old-Brand Cleanup

**Files:**
- Modify: `package.json`, `package-lock.json`, `playwright.config.ts`, active scripts/security targets listed by the audit, remaining non-historical test fixtures
- Test: full Vitest plus active script unit tests

**Interfaces:**
- Consumes: all prior public contracts.
- Produces: active tooling that names Lootriva/canonical apex while preserving explicit legacy redirect fixtures and historical evidence.

- [ ] **Step 1: Update failing fixture/tool expectations** to Lootriva, keeping `ggmarket.eu` only where a test explicitly proves legacy compatibility and keeping `.test`/`.invalid` hosts where non-public.
- [ ] **Step 2: Rename internal browser event/cache/storage identifiers atomically where chosen by the design**, with bounded legacy cleanup only where same-origin data can exist.
- [ ] **Step 3: Run full `npm test`** and fix only regressions caused by this branch.
- [ ] **Step 4: Run the exact repository search from the audit** and classify every survivor as legacy compatibility, historical evidence, immutable identifier, or defect; eliminate defects.
- [ ] **Step 5: Commit** with `test: align active tooling with Lootriva`.

### Task 7: Deployment, External Configuration, and Rollback Runbook

**Files:**
- Create: `docs/operations/lootriva-cutover-runbook.md`
- Update: `docs/audits/2026-11-06-lootriva-rebrand-domain-recovery-audit.md`, `docs/auth/production-email-verification.md`, `docs/google-oauth-setup.md`

**Interfaces:**
- Consumes: final code behavior and verified public DNS/HTTP observations.
- Produces: owner checklist with dashboard location, verified current/unknown value, desired value, cutover timing, verification, and rollback for Vercel, Papaki, Supabase, Resend, Google Cloud, Search Console, PWA, and monitoring.

- [ ] **Step 1: Write the ordered runbook** separating code, Vercel, DNS, Supabase, Google, Resend, and SEO responsibilities.
- [ ] **Step 2: Record verified public current state** (apex→www, live www app, detached old domain) and label private dashboard state unknown unless directly verified.
- [ ] **Step 3: Add exact fresh-email manual tests** for new/old password, reuse, expiry, scanner, cross-device, iPhone Safari, Gmail in-app, Chrome, modified/missing token, signup, Google OAuth, refresh/logout/protected routes, and no token leakage.
- [ ] **Step 4: Add independent rollback steps** for code, Vercel domains/env, DNS, Auth URL/template, SMTP sender, OAuth branding, and SEO.
- [ ] **Step 5: Review for secret safety and no invented legal/DNS values, then commit** with `docs: add Lootriva production cutover runbook`.

### Task 8: Final Verification, Visual Review, and Pull Request

**Files:**
- Modify only defects found by verification; update audit/runbook test evidence

**Interfaces:**
- Consumes: completed branch.
- Produces: fresh evidence and a PR targeting `main`; no merge or Production deployment.

- [ ] **Step 1: Read the relevant installed Next.js 16 guides** for Proxy, redirects, cookies, metadata, icons, manifest, robots, and sitemap; reconcile any version-specific mismatch before verification.
- [ ] **Step 2: Run `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm test`, and focused recovery/signup/OAuth/redirect/sitemap/brand tests**; record exact counts and failures.
- [ ] **Step 3: Run `npm run build`** with a verified non-production configuration; do not substitute production secrets or mock production data.
- [ ] **Step 4: Run Playwright Chromium/WebKit desktop/mobile suites only against a disposable/local target**, distinguish simulated from real-email results, and record blocked cases precisely.
- [ ] **Step 5: Run visual/accessibility review** at representative 390, 768, and 1440 widths; inspect screenshots, verify no overflow/layout shift/missing assets, and confirm the Lootriva Card physics remain intact.
- [ ] **Step 6: Run security/quality gates:** project secret scan, dependency audit, `git diff --check`, scoped old-brand search, and a manual review of redirects/CSRF/cookies/token logs/RLS/signed media/suspension behavior.
- [ ] **Step 7: Request independent whole-branch code review**, fix Critical/Important findings, and rerun affected plus full verification.
- [ ] **Step 8: Commit final evidence, push `feat/lootriva-rebrand-recovery`, and open a PR to `main`** with configuration dependencies, test evidence, manual gates, cutover, and rollback. Do not merge or deploy Production.
