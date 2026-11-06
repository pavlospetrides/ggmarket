# Lootriva rebrand, domain migration, and recovery design

## Intent

Turn the existing production marketplace into Lootriva at `https://lootriva.com` without changing its data model, security boundaries, marketplace behavior, or established dark gaming design. Repair password recovery at the source and stage the cutover so code, DNS, Vercel, Supabase Auth, Resend, Google OAuth, and search indexing can be changed and rolled back independently.

The owner's master task is the approved product description. This document records implementation decisions discovered from the repository audit; it does not expand product scope.

## Goals

- Replace active customer-facing GGMarket identity with Lootriva and an original LT monogram.
- Make `https://lootriva.com` the only canonical production origin.
- Preserve public legacy paths while treating token/code-bearing legacy URLs as unsafe to forward.
- Preserve and extend the existing scanner-safe, explicit-POST recovery and signup-confirmation architecture.
- Keep users, data, RLS, private Storage, signed media, Realtime, marketplace functionality, and current performance characteristics intact.
- Produce an owner runbook and a reviewable PR without deploying or changing external production settings.

## Non-goals and anti-goals

- No database or production-data rewrite.
- No migration/table/bucket/column/storage-key renames for branding.
- No redesign of unrelated marketplace workflows.
- No invented legal entity, address, claims, testimonials, or compliance promises.
- No wildcard redirect origins, host-header trust, weakened CSRF, double token verification, or privileged admin recovery bypass.
- No production E2E mutation without an explicitly isolated test account and environment.

## Architecture decisions

### Canonical origin

`lib/site-url.ts` remains the single authority. Production is pinned to `https://lootriva.com`; Preview accepts only the Vercel-provided HTTPS preview hostname; development accepts a valid local/request origin. Security-sensitive absolute URLs never derive from arbitrary forwarded headers in production.

Exact host classes:

- Canonical: `lootriva.com`.
- Canonical alias: `www.lootriva.com` → apex.
- Legacy public: `ggmarket.eu`, `www.ggmarket.eu`, `ggmarket-sage.vercel.app` → equivalent apex path.
- Vercel Preview: unchanged and isolated.

For public legacy URLs, preserve path and non-sensitive query values. For any auth route or secret-bearing parameter/fragment, do not forward the secret. Redirect to a fixed canonical restart page (`/forgot-password`, `/login`, or `/verify-email`) with a non-secret reason code. This is the chosen secure compatibility strategy for old auth emails.

### Authentication and recovery

Retain the current contract:

1. Forgot Password submits without account enumeration.
2. `resetPasswordForEmail` receives the canonical Lootriva recovery entry point.
3. Hosted template links directly to Lootriva with `TokenHash` and exact `type=recovery`; it does not use `ConfirmationURL` as the visible anchor.
4. GET validates format, stores a short-lived HttpOnly pending token, strips it from the visible URL, and does not call `verifyOtp`.
5. Explicit same-origin POST calls `verifyOtp` once, checks active-account policy, and stores the resulting session with existing secure/Lax cookie behavior.
6. Password form and update route require recovery AMR, validate input, recheck active status, update through the normal user client, and sign out the local recovery session.
7. Reuse, expiry, mutation, scanner GET/HEAD, and cross-origin POST fail safely without logging secrets.

The historical PKCE/scanner cause is documented, but implementation work starts with failing tests for the current domain mismatch and legacy-token redirect behavior. Hosted dashboard state remains a manual verification gate.

Signup confirmation keeps the same GET-stage/POST-verify architecture. Google OAuth continues through the Supabase-hosted provider callback; only the application return URL, Google authorized domain/branding, homepage, and policy URLs change where applicable.

### Brand system and assets

Preserve the Midnight Exchange design, graphite ground, purple primary action, cyan discovery accent, typography, spacing, interaction physics, and responsive component geometry.

The new identity is a custom interlocking LT portal mark: a strong vertical L establishes a stable inventory shelf; a cut-through T crosses it to suggest exchange and forward movement. The negative space remains open enough to read at 16px. It uses the existing white/graphite plus violet palette, with dark, light, and monochrome variants.

Deliverables:

- Shared code-native `BrandMark` updated to LT.
- Dark/light full wordmark SVGs.
- Dark/light compact LT SVGs.
- `app/icon.svg` favicon.
- 180px Apple touch icon.
- 192px and 512px PWA icons, including maskable safe area.
- 1200×630 Open Graph PNG plus maintainable source SVG.
- Navigation, footer, auth, GG Card (renamed in visible copy only), manifest, and metadata integration.

The visible feature name becomes **Lootriva Card**. Existing internal/database identifiers may retain `gg_card` where renaming would alter contracts or migration history. The existing lanyard physics and component behavior remain unchanged.

### Browser compatibility identifiers

Customer-visible storage names in the Cookie Policy move to Lootriva. Runtime compatibility uses a bounded transition:

- New service-worker cache/recovery keys use `lootriva-*`.
- Cleanup recognizes only known `ggmarket-*` application cache keys and the new prefix; it never clears arbitrary caches or storage.
- Pending auth cookies use Lootriva names. Already-started flows on `www.lootriva.com` cannot carry host-only cookies to the apex and will restart safely; no cross-host token or cookie bridge will be built.
- Internal event names may be migrated atomically because producers and consumers are repository-local; tests cover both wiring and absence of visible old-brand output.

### SEO and PWA

Metadata, JSON-LD if present, robots, sitemap index/children, social images, manifest, icons, share URLs, and absolute URLs use the apex canonical origin. Existing sitemap query functions and visibility filters remain untouched except for URL output. Auth, API, admin, drafts, private messages, and private profiles remain excluded.

The domain change creates a separate PWA origin. Existing installations from `ggmarket.eu` cannot be upgraded in place by the Lootriva service worker and must be reinstalled. The current temporary install at `www.lootriva.com` also cannot become an apex install in place; the runbook will explain removal/reinstall after apex canonicalization.

### Documentation and legal handling

Current runbooks and templates change to Lootriva. Dated plans, audits, screenshots, generated design-inspection reports, immutable migration history, and user-authored content remain historical. Legal pages receive brand/domain substitutions only and retain explicit owner/legal review gaps.

## Verification strategy

- TDD for canonical origin, public redirects, sensitive legacy URLs, template links, metadata, manifest, and brand assets.
- Focused recovery/signup/OAuth unit tests after each auth change.
- Full TypeScript, ESLint, Vitest, production build, `git diff --check`, secret scan, and dependency audit.
- Playwright Chromium and WebKit only against a verified local/disposable environment. Use request interception for scanner/cross-browser mechanics; label simulated coverage. A real isolated mailbox/account is mandatory for hosted-template, old/new password, and one-time-link verification.
- Browser screenshots and accessibility review at representative mobile/tablet/desktop sizes; preserve existing marketplace UI rather than restyling every page.

## External cutover order

1. Merge-ready code and preview verification.
2. Verify Resend domain/DKIM/SPF/DMARC and sender without replacing unrelated DNS records.
3. Add Lootriva Auth redirects while retaining legacy entries.
4. Install Lootriva email templates and sender configuration.
5. Verify signup, recovery, and Google OAuth with isolated accounts on Preview/canonical staging.
6. Correct Vercel so apex is primary and `www` redirects to apex; reattach legacy domains for controlled redirects.
7. Set Production `NEXT_PUBLIC_SITE_URL=https://lootriva.com`, Supabase Site URL, and authorized application URLs in the coordinated cutover.
8. Deploy, run critical smokes, then enable SEO migration and monitoring.

Rollback treats code, Vercel domain routing, Supabase Site URL/allowlist/templates, SMTP sender, DNS, and search configuration as separate reversible layers. Git revert alone is not a complete rollback.

Preview deployment is authorized by the master task; Production deployment is not. The PR may rely on the repository's existing Vercel Preview integration, but no Production domain or environment setting changes occur without explicit owner approval.

Outbound sender target: **Lootriva <no-reply@lootriva.com>**.

Legacy public redirects are long-lived for bookmarks and SEO. Legacy Supabase redirect allowlist entries and any transitional browser-key cleanup receive an owner review 30 days after cutover; removal requires confirming that old email token lifetimes have elapsed and recovery/signup telemetry shows no dependency on them.

## Builder discretion

- Exact SVG path geometry and rasterization tooling, provided the LT mark meets the stated readability/contrast rules and introduces no new runtime dependency.
- Test-file grouping and small helper extraction consistent with existing patterns.
- Whether transitional browser-key aliases live beside each feature or in one narrowly scoped compatibility helper.

