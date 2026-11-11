# Lootriva rebrand, domain, and recovery audit — 2026-11-06

## Scope and baseline

- Audited clean branch `feat/lootriva-rebrand-recovery` from `origin/main` at `ff0badd`.
- Preserved the source checkout's unrelated uncommitted authentication work.
- Baseline `npm test`: 85 files, 600 tests, 0 failures.
- Repository search: 159 tracked files contain `GGMarket`, `GG Market`, `ggmarket`, `ggmarket.eu`, `www.ggmarket.eu`, or `ggmarket-sage.vercel.app`.
- No production SQL, data, DNS, Vercel, Supabase, Resend, or Google settings were changed.

Reproduce the inventory with:

```powershell
git grep -In -i -e 'GGMarket' -e 'GG Market' -e 'ggmarket.eu' -e 'www.ggmarket.eu' -e 'ggmarket-sage.vercel.app' -e 'ggmarket'
```

## Immediate findings

### Critical: the public cutover is internally inconsistent

Public checks at 2026-11-06 15:13 Europe/Athens showed:

- `https://lootriva.com` returns a permanent redirect to `https://www.lootriva.com`, opposite the required apex-canonical direction.
- `https://www.lootriva.com` serves the application, but its HTML still identifies the product as GGMarket and emits `https://ggmarket.eu` canonical, Open Graph, Twitter, sitemap, and asset URLs.
- `https://ggmarket.eu` and `https://www.ggmarket.eu` return Vercel `DEPLOYMENT_NOT_FOUND` rather than compatibility redirects.
- The application still pins its production origin to `https://ggmarket.eu`. A reset request made from the live Lootriva host therefore generates an old-domain recovery destination in code.

Risk: search engines receive contradictory canonical signals; password recovery and signup links can target a detached hostname; old bookmarks are broken; changing only the dashboard Site URL cannot correct code-generated URLs.

### Password-recovery reproduction and bounded root cause

The pre-fix recovery implementation is preserved in Git immediately before commit `185dad5`:

1. `resetPasswordForEmail` used `/auth/callback?next=/reset-password`.
2. Supabase's default `ConfirmationURL` verified on GET and returned a PKCE authorization code.
3. A mail scanner could consume the one-time GET, and a different browser/device lacked the requesting browser's PKCE verifier.
4. The callback then surfaced the fresh link as invalid/expired.

Commit `185dad5` replaced that flow with a direct `TokenHash`, a scanner-safe staging GET, and explicit same-origin POST verification. Commits `d272eeb`, `c964091`, and `3c2add6` hardened cross-browser and iPhone behavior. The current focused unit suite passes 25/25 tests, so the old code path is not reproducible on current `main`.

The current deployment has a second, independently confirmed failure source: production origin generation and the checked-in hosted templates still target `https://ggmarket.eu`, while that host currently returns `DEPLOYMENT_NOT_FOUND`. The Supabase dashboard template cannot be inspected from the repository. A real fresh email remains required to determine whether hosted Auth is still using `ConfirmationURL`, the old GGMarket `TokenHash` template, or another stale value.

The attempted local Playwright run was stopped because the clean worktree has no disposable Supabase configuration and the server health check fails closed at the homepage. Production was not used as a mutable test target.

## Disposition by reference class

| Class | Why it exists | Disposition | Main risk |
| --- | --- | --- | --- |
| Customer-facing copy and accessibility labels | Current product name in pages, forms, API fallback HTML, cards, notifications, legal pages | Change to Lootriva | Visible stale brand, misleading legal text |
| Logo, icon, hero, and social assets | Current GG symbol and file naming | Replace with original LT assets; preserve dimensions and layout contracts | Broken icons, layout shift, stale social previews |
| Canonical URL and SEO generation | Central production origin, metadata, robots, sitemap | Change to `https://lootriva.com` and add regression coverage | Split indexing, broken auth links |
| Host redirects | Canonicalizes `www` and generated Vercel host | Add apex canonicalization and legacy public-path redirects; never forward auth secrets | Token leakage, open redirects, loops |
| Auth templates and redirect builders | Signup/recovery/OAuth destinations | Change to canonical Lootriva routes while retaining scanner-safe POST verification | Fresh links fail or tokens are consumed twice |
| Cookie, event, cache, and storage identifiers | Existing browser compatibility contracts | Rename only where safe; dual-read/cleanup legacy names where needed; document intentional survivors | Installed-app breakage, stale listeners, pending-flow loss |
| Tests and fixtures | Assert old brand/domain behavior | Update expected public identity; retain explicit legacy-host migration cases | False confidence or lost compatibility coverage |
| Security scripts and smoke targets | Target inventory and temporary paths | Point active checks to Lootriva; keep explicit legacy redirect probes | Testing wrong host or sending auth probes to production |
| Historical audits, plans, screenshots, and reports | Immutable evidence of earlier work | Retain as historical records; label through this audit rather than rewrite history | Destroyed provenance |
| Existing migration `202610300001_my_gg_card.sql` | Immutable database history and permanent identifier | Leave untouched | Migration checksum/history corruption |
| User content, storage keys, table/column names | Production-owned or user-owned data | Do not rewrite | Data loss, broken RLS/storage references |

## Active references to change

Implementation update (branch `feat/lootriva-rebrand-recovery`): Tasks 1–6 replaced the active public identity, canonical URL output, hosted-template sources, customer copy, metadata/assets, PWA names, and active tooling. Exact retired hosts remain only for secret-safe compatibility behavior/tests; bounded `ggmarket-*` browser keys remain only as one-release read/delete aliases. Immutable database/API identifiers such as `gg_card` are intentionally unchanged.

Public state was rechecked read-only at 2026-11-06 18:02 Europe/Athens: apex still returns 308 to `www`; `www` returns 200 from Vercel; both retired GGMarket hosts return Vercel `404 DEPLOYMENT_NOT_FOUND`. Papaki remains authoritative for `lootriva.com`. Private dashboard state remains unknown. The exact owner cutover, manual gates, and rollback are documented in `docs/operations/lootriva-cutover-runbook.md`.

### Application and component source

`app/api/conversations/[id]/messages/route.ts`, `app/api/conversations/route.ts`, `app/api/favorites/route.ts`, `app/api/reviews/route.ts`, `app/auth/confirm-signup/continue/page.tsx`, `app/browse/page.tsx`, `app/cookies/page.tsx`, `app/layout.tsx`, `app/manifest.ts`, `app/page.tsx`, `app/privacy/page.tsx`, `app/profile/[username]/page.tsx`, `app/register/page.tsx`, `app/reset-password/page.tsx`, `app/settings/verification/page.tsx`, `app/test-harness/loading/preview/page.tsx`, `app/verify-email/page.tsx`.

`components/art-directed-hero-image.tsx`, `components/auth-form.tsx`, `components/auth-shell.tsx`, `components/chat-interface.tsx`, `components/gg-card-experience.tsx`, `components/gg-card-section.tsx`, `components/listing-navigation.tsx`, `components/logo.tsx`, `components/notification-awareness-harness.tsx`, `components/notification-center.tsx`, `components/reset-password-form.tsx`, `components/service-worker-registration.tsx`, `components/settings-form.tsx`, `components/signup-welcome.tsx`, `components/site-footer.tsx`.

### Runtime configuration, metadata, and assets

`.env.example`, `AGENTS.md`, `DESIGN.md`, `lib/data.ts`, `lib/email-confirmation-pending.ts`, `lib/listing-navigation-state.ts`, `lib/recovery-pending.ts`, `lib/site-metadata.ts`, `lib/site-url.ts`, `package.json`, `package-lock.json`, `playwright.config.ts`, `public/dev-diagnostics.js`, `public/sw.js`, `public/sw-bootstrap.js`, `README.md`, `SECURITY_AUDIT.md`, `ggmrketvol2-threat-model.md`.

Current brand assets to replace: `public/brand/ggmarket-logo-dark.svg`, `public/brand/ggmarket-logo-light.svg`, `public/brand/ggmarket-mark-dark.svg`, `public/brand/ggmarket-mark-light.svg`, `public/brand/ggmarket-open-graph.svg`, `public/brand/ggmarket-app-icon-512.png`, `app/icon.svg`, `app/apple-icon.png`, and the GG-derived runtime `BrandMark`. The editorial hero at `public/images/brand/ggmarket-hero-desktop.webp` is not a logo but should be renamed so active asset paths do not preserve the retired public identity.

### Auth, operational, and owner-facing configuration documents

`docs/auth/confirm-signup-email.html`, `docs/auth/production-email-verification.md`, `docs/auth/reset-password-email.html`, `docs/google-oauth-setup.md`, `docs/operations/listing-media-runbook.md`, `supabase/config.toml`, `supabase/templates/confirmation.html`, `supabase/templates/recovery.html`.

### Active security and operational tooling

`scripts/image-upload-audit.mjs`, `scripts/install-webkit-wsl-deps.sh`, `scripts/phase2-security-audit.mjs`, `scripts/run-webkit-wsl.sh`, `scripts/security-audit.mjs`, `security/sqlmap/README.md`, `security/sqlmap/runner.py`, `security/sqlmap/targets.json`, `security/sqlmap/tests/test_runner.py`. Production-targeting scripts remain opt-in and must not be executed during implementation.

### Tests and fixtures

`tests/auth-callback-verification.test.ts`, `tests/auth-confirm-signup-route.test.ts`, `tests/auth-login-route.test.ts`, `tests/auth-recovery-route.test.ts`, `tests/auth-redirect-url.test.ts`, `tests/auth-register-logout-routes.test.ts`, `tests/brand-identity.test.ts`, `tests/confirmation-email-template.test.ts`, `tests/conversation-api.test.ts`, `tests/design-system.test.ts`, `tests/email-verification-api.test.ts`, `tests/favorite-api.test.ts`, `tests/gg-card-api.test.ts`, `tests/listing-api-integrity.test.ts`, `tests/listing-media-delivery.test.ts`, `tests/message-api.test.ts`, `tests/notification-api.test.ts`, `tests/password-recovery-email-template.test.ts`, `tests/password-update-route.test.ts`, `tests/phase1-rules.test.ts`, `tests/privacy-disclosure.test.ts`, `tests/proxy-performance.test.ts`, `tests/request-security.test.ts`, `tests/reviews-api-security.test.ts`, `tests/seo-domain.test.ts`, `tests/service-worker.test.ts`, `tests/sitemap-public-data.test.ts`, `tests/sitemap-routes.test.ts`, `tests/site-url.test.ts`.

`tests/e2e/account-ratings-safe.spec.ts`, `tests/e2e/admin-moderation.spec.ts`, `tests/e2e/core-flow.spec.ts`, `tests/e2e/device-diagnostics.spec.ts`, `tests/e2e/homepage-hero.spec.ts`, `tests/e2e/mobile-controls.spec.ts`, `tests/e2e/navigation-latency.spec.ts`, `tests/e2e/password-recovery.spec.ts`, `tests/e2e/realtime-offers.spec.ts`, `tests/e2e/signup-confirmation.spec.ts`, `tests/e2e/smart-chat-notifications-safe.spec.ts`.

## References retained for compatibility or history

### Retain deliberately in active behavior

- Legacy hosts `ggmarket.eu`, `www.ggmarket.eu`, and `ggmarket-sage.vercel.app` must remain in an exact allowlist only for migration redirects and regression tests.
- Old browser keys may remain as read/delete aliases during one transition release. They must not remain customer-facing labels.
- The old-domain auth redirect allowlist must remain temporarily in Supabase so already-issued links reach a controlled compatibility response after the domain is reattached.
- Synthetic `.test`, `.invalid`, and `.local` hosts may remain in tests where they are clearly non-public and not asserted as the brand.

### Leave untouched

- `supabase/migrations/202610300001_my_gg_card.sql` is immutable migration history.
- Historical records under `docs/superpowers/plans/`, `docs/superpowers/specs/`, earlier `docs/audits/`, `.taste-skill/`, `artifacts/`, and `security/sqlmap/reports/` remain as dated evidence. Their old name is context, not active branding.
- User-authored database content and storage object paths are outside any text replacement.

The tracked historical inventory is: `.taste-skill/critique.md`, `.taste-skill/direction.json`, `.taste-skill/final/inspect/report.json`, `.taste-skill/inspect/report.json`, `artifacts/mobile-audit/before/marketplace-390.yml`, all pre-existing files under `docs/superpowers/plans/` and `docs/superpowers/specs/` listed by the audit command, and the pre-existing audit reports `docs/audits/2026-10-14-frontend-route-audit.md`, `docs/audits/2026-10-20-cookie-auth-privacy-audit.md`, `docs/audits/2026-11-03-premium-animated-favorites.md`, `docs/audits/2026-11-04-favorites-desktop-ios-scroll.md`, `docs/audits/2026-11-05-listing-media-production-readiness.md`, `docs/audits/2026-11-06-production-data-access-incident.md`, `docs/audits/GGMARKET_FINAL_LAUNCH_SECURITY_AUDIT.md`, `docs/audits/GGMARKET_MOBILE_PERFORMANCE_OPTIMIZATION.md`, and `docs/audits/GGMARKET_OFFICIAL_DOMAIN_MIGRATION.md`.

## Security and migration risks to test

1. Never copy `token_hash`, OAuth `code`, `access_token`, `refresh_token`, `provider_token`, or URL fragments from a legacy host to Lootriva. Legacy auth links should land on a safe restart screen without the secret.
2. Public legacy paths may preserve non-sensitive query parameters, but redirect targets must be constructed from the fixed canonical origin and a normalized relative path.
3. Keep GET staging non-consuming; verify exactly once on a same-origin POST; retain origin/Fetch Metadata checks and recovery-AMR enforcement.
4. Do not set a shared cookie `Domain`; apex and `www` canonicalization should happen before auth emails are issued.
5. Preserve the sitemap's RLS-safe query layer and private Storage/signed URL behavior.
6. Change the PWA cache name with an activation cleanup that removes only known application cache prefixes; do not clear unrelated origin storage.
7. Legal pages may change brand/domain only. Owner, controller identity, address, company registration, retention periods, and legal bases remain explicit review items.

## Final implementation verification — 2026-11-11

The eight-task implementation completed on `feat/lootriva-rebrand-recovery`. No production deployment, DNS, dashboard configuration, environment variable, database permission, RLS policy, Storage policy, or migration was changed.

- TypeScript: `npm run typecheck` passed.
- Lint: `npm run lint -- --max-warnings=0` passed with zero warnings.
- Vitest: 85 files and 624 tests passed.
- Production build: Next.js 16.4.3 compiled, completed TypeScript, and generated 59/59 static pages using process-local synthetic public build values.
- Dependency audit: `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities.
- SQLMap tooling: 17/17 runner unit tests passed; no production target was scanned.
- Auth browser simulation: 26 applicable recovery/signup/OAuth cases passed across Chromium and WebKit, with two expected project skips. Every Supabase request was intercepted at a synthetic endpoint; this is not a substitute for the manual fresh-email test against hosted Supabase.
- Lootriva Card browser matrix: 28/28 cases passed across desktop/mobile Chromium and WebKit.
- Responsive visual review: recovery, legal, and Lootriva Card surfaces were inspected at 390, 768, and 1440 CSS-pixel widths; the card overflow measurement was zero.
- Source/security checks: `git diff --check` passed; the migration diff is empty; the credential-pattern review found only an example placeholder and environment-variable names, not credential values.
- Active old-brand scan: retired hosts remain only in the exact compatibility allowlist, tests, and cutover runbook. Immutable `gg_card` API/data identifiers and the `gg-purple` stored identifier remain unchanged; their customer-visible labels are Lootriva.

An independent whole-branch review found two redirect-policy issues and the remaining visible `GG` shorthand. The branch now rejects non-GET/HEAD legacy-host requests without replay, routes `www` through the application before redirecting so secret-bearing URLs are stripped, and uses `LT`/Lootriva on all identified customer-visible surfaces. The affected regression suite passed 55/55 after correction. The reviewer process then exhausted its external execution quota after returning these findings; no additional findings were reported.

The final browser rerun attempted on 2026-11-11 was stopped because this clean worktree has no live Supabase values: missing values fail closed, while synthetic values cannot serve marketplace data. The earlier intercepted browser results above remain the automated evidence. Real hosted-email delivery and dashboard state are explicit deployment gates in `docs/operations/lootriva-cutover-runbook.md`.
