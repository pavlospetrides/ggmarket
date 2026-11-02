# GGMarket Official Domain Migration Audit

Date: 29 October 2026
Canonical production origin: `https://ggmarket.eu`
Former production hostname: `https://ggmarket-sage.vercel.app`

## Result

The repository now treats `https://ggmarket.eu` as the only canonical production origin. Local development continues to use the request's localhost/LAN origin, and Vercel Preview uses a validated HTTPS `*.vercel.app` deployment origin without trusting forwarded hosts in ordinary production.

No production service, database, deployment, DNS record, Vercel setting, or Supabase setting was changed during this audit.

## Old-domain references found

The former hostname was present in:

- `lib/request-security.ts` as the production security pin.
- Root metadata through that security constant.
- Auth callback, registration, password-reset, email-resend, callback, and confirmation-template tests.
- `docs/auth/confirm-signup-email.html` and `docs/auth/production-email-verification.md`.
- `README.md` and the mobile performance audit.
- The SQL injection production-smoke inventory, runner tests, README, and design specification.

Those production references were migrated. The former hostname remains only where it is deliberately required:

- The exact legacy-host redirect allowlist in `lib/site-url.ts`.
- Regression tests proving the legacy host redirects without affecting preview hosts.
- The Supabase operations checklist, which recommends retaining the old allowed redirect temporarily for already-issued links.

Localhost references in `.env.example`, `supabase/config.toml`, Playwright, scripts, and tests were classified as development or disposable-audit infrastructure and were intentionally preserved. External legal links and Supabase/image CSP sources are not application-origin references.

## Code and configuration changes

- `lib/site-url.ts` centralizes the canonical origin, local fallback, validated Vercel Preview selection, canonical URL generation, and exact legacy-host redirect selection.
- `lib/request-security.ts` keeps ordinary production pinned to `ggmarket.eu`, ignores hostile forwarded production hosts, and accepts the server-provided Vercel deployment URL only when `VERCEL_ENV=preview`.
- `lib/auth-redirect.ts` uses the central resolver. Client auth flows can use their own validated HTTPS Vercel preview origin because server-only Vercel variables are unavailable in browser bundles.
- `proxy.ts` returns a permanent `308` from `www.ggmarket.eu` and `ggmarket-sage.vercel.app` to `ggmarket.eu`, preserving path and query. Canonical, preview, and local hosts do not match this redirect.
- `.env.example` retains `http://localhost:3000` and now states that Vercel Production must set `NEXT_PUBLIC_SITE_URL=https://ggmarket.eu`.
- The active SQLMap production-smoke allowlist now names `ggmarket.eu`. This changes inventory only; no production smoke request was executed.

## Authentication and email verification

Verified regression coverage includes:

- Production signup confirmation, resend, password recovery, and callback redirects resolve to `https://ggmarket.eu` even when a request presents localhost or hostile forwarded hosts.
- Vercel Preview server routes use the validated `VERCEL_URL`; client signup/recovery uses the current validated HTTPS preview origin.
- Localhost and LAN callbacks remain available outside production.
- Existing relative callback destinations and `safeRedirectPath` validation remain unchanged.
- The copy-ready Supabase Confirm Signup template now links directly to `https://ggmarket.eu/auth/callback` with its token hash and safe fixed destination.

The repository contains no OAuth-provider-specific route beyond the common Supabase code/token callback. No Supabase project URL, key, provider, or policy was changed.

## SEO, sharing, and PWA

- Root `metadataBase` is fixed to `https://ggmarket.eu` and includes Open Graph site data plus a large Twitter/X card.
- Home, Browse, Marketplace, Privacy, and Cookies have route-specific canonical and Open Graph URLs.
- Public listing and seller-profile metadata produces route-specific canonical, Open Graph, and Twitter/X data.
- Listing share/copy actions use the official canonical listing URL instead of the browser's legacy or preview hostname.
- `sitemap.xml` contains only the five stable public static routes and emits official-domain URLs.
- `robots.txt` advertises the canonical host and sitemap and disallows API, auth, account, moderation, mutation, and test-harness surfaces.
- The PWA manifest retains the correct same-origin `start_url: "/"`.

Dynamic listing/profile sitemap enumeration was not added because it would require a production-data query during sitemap generation. Their page-level canonical metadata is implemented.

## Files modified for this migration

- `.env.example`, `README.md`, `proxy.ts`
- `lib/site-url.ts`, `lib/request-security.ts`, `lib/auth-redirect.ts`
- `app/layout.tsx`, `app/page.tsx`, `app/browse/page.tsx`, `app/marketplace/page.tsx`
- `app/listing/[id]/page.tsx`, `app/profile/[username]/page.tsx`
- `app/robots.ts`, `app/sitemap.ts`, `app/privacy/page.tsx`, `app/cookies/page.tsx`
- `components/listing-client-tools.tsx`
- `docs/auth/confirm-signup-email.html`, `docs/auth/production-email-verification.md`
- `docs/audits/GGMARKET_MOBILE_PERFORMANCE_OPTIMIZATION.md`
- `security/sqlmap/targets.json`, `security/sqlmap/README.md`, `security/sqlmap/tests/test_runner.py`
- `docs/superpowers/specs/2026-10-28-sql-injection-audit-suite-design.md`
- Domain/auth/SEO regression tests under `tests/`

Existing unrelated worktree modifications, including the security audit, were preserved.

## Verification evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 51 files, 326 tests passed |
| `python -m unittest security.sqlmap.tests.test_runner` | 17 tests passed |
| Targeted URL/auth/SEO suite | 8 files, 62 tests passed in the final expanded set |
| `npm run build` | Passed; compiled, typechecked, and generated 49 routes |
| Build data source | Verified disposable loopback Supabase API only |
| Production requests | None |

An initial build without environment variables compiled but correctly failed while prerendering `/` because no Supabase URL/key was present. The final build used values obtained from the running disposable local Supabase stack after verifying its API host was loopback.

An additional local `next start` HTTP smoke was attempted, but the execution policy rejected the background-server command before it ran. Redirect, canonical, sitemap, and robots behavior is covered by regression tests and the successful production build; deployed HTTP behavior remains a post-deployment smoke check and is not claimed as performed.

## Manual Vercel checks

1. Confirm `ggmarket.eu` is the primary Production domain.
2. Configure `www.ggmarket.eu` as a redirect to `https://ggmarket.eu` in the Domains UI. The application also has an exact-host fallback redirect.
3. Keep `NEXT_PUBLIC_SITE_URL=https://ggmarket.eu` scoped to Production. Leave it unset in Preview so Preview uses Vercel's deployment URL.
4. Confirm the generated `ggmarket-sage.vercel.app` hostname still reaches this project so the application-level legacy redirect can execute.
5. After an authorized deployment, verify `308` redirects preserve path/query and do not affect a real Preview hostname; verify canonical tags, `/robots.txt`, and `/sitemap.xml` over HTTPS.

## Manual Supabase checks

1. Site URL: `https://ggmarket.eu`.
2. Allowed redirects: `https://ggmarket.eu/**`, `https://www.ggmarket.eu/**`, the temporary legacy `https://ggmarket-sage.vercel.app/**`, and localhost only where development requires it.
3. For Preview authentication, use a disposable non-production Supabase project and an exact preview callback or a tightly scoped project-specific preview pattern. Never allow every Vercel hostname and never attach Preview to production customer data.
4. Paste the updated `docs/auth/confirm-signup-email.html` into the Confirm Signup template and disable provider link rewriting.
5. Do not change production credentials, RLS, Storage, Realtime, providers, or customer data as part of the domain migration.

## Remaining verification

- Dashboard state was reported by the owner but was not read or changed from this environment.
- DNS, TLS, Vercel's primary-domain behavior, Supabase's live redirect allowlist, the live email template, and deployed response headers require a read-only post-deployment check.
- The legal and controller-information blockers already documented in the privacy audit are unrelated to this domain migration and remain unchanged.
