# GGMarket Security Audit

**Audit date:** 2026-10-19  
**Scope:** Current worktree, including uncommitted files; Next.js application, API routes, authentication routes, proxy, Supabase clients, seven SQL migrations, Storage and Realtime policies, marketplace data access, and security test tooling.  
**Environment context:** Pre-production Next.js application. The configured Supabase project is network reachable and may contain development data. No production hosting, WAF, CDN rules, or trusted proxy configuration was assumed.

## Executive summary

The audit confirmed one High severity request-origin vulnerability and fixed it with regression tests. Production redirects and CSRF checks trusted `Host` and `X-Forwarded-*` values, while `/auth/*` POST routes were outside the proxy's CSRF gate. An attacker able to supply forwarded headers through the eventual hosting path could influence password-reset and signup callback origins and could align a forged `Origin` with a forged forwarded host. The fix now uses the configured canonical site origin in production, rejects originless mutations unless the browser proves they are same-origin, and applies the proxy gate to authentication mutations.

No Critical issue or confirmed Supabase cross-user authorization bypass was found. Read-only checks against the configured Supabase project confirmed anonymous callers cannot read private marketplace rows or privileged profile columns, draft listings are not returned, and the listing-image bucket is private. Full authenticated cross-user execution was not run because the current Supabase target was not confirmed as disposable; the repository's destructive audit scripts would create and delete users and records.

## Architecture and trust boundaries

- Browser requests enter Next.js 16 App Router pages, `app/api/**` Route Handlers, and native form Route Handlers under `app/auth/**`.
- `proxy.ts` refreshes Supabase sessions, applies mutation-origin checks, and attaches response security headers.
- Server code uses `@supabase/ssr` with the public Supabase URL and anon key. Runtime application code does not use the service-role key.
- Browser code uploads listing images directly to Supabase Storage and writes metadata through the authenticated Data API.
- PostgreSQL RLS is the authoritative tenant boundary. The application also scopes writes to the current user or resource owner.
- Privileged marketplace transitions use `SECURITY DEFINER` functions with an empty `search_path` and explicit participant/admin checks.
- The service-role key is confined to local security and E2E tooling, where it bypasses RLS and therefore requires a disposable target.

## Critical findings

No confirmed Critical findings.

## High findings

### SEC-001 — Client-controlled forwarding headers influenced security-sensitive origins — Fixed

**Rules:** NEXT-CSRF-001, NEXT-HOST-001, NEXT-REDIRECT-001  
**Locations:** `lib/request-security.ts:5`, `lib/request-security.ts:20`, `proxy.ts:26`, `app/auth/register/route.ts:14`, `app/auth/forgot-password/route.ts:12`

**Evidence:** The original origin helper preferred `X-Forwarded-Host` and `X-Forwarded-Proto` without proving they came from a trusted proxy. The same helper constructed signup, password-reset, login, logout, and favorite redirect URLs. The proxy checked only `/api/*` mutations, leaving `/auth/login`, `/auth/register`, `/auth/logout`, and `/auth/forgot-password` outside that gate.

**Impact:** In a deployment that forwards client-supplied forwarding headers, an attacker could poison confirmation or password-reset callback origins and could make a forged request origin appear same-origin. Cross-site logout and login-session swapping were also possible against the unguarded auth POST routes in browsers that submitted the request.

**Fix:** Production origin selection now requires the configured `NEXT_PUBLIC_SITE_URL`; unproven originless mutations are rejected; `/auth/*` mutations pass through the same proxy origin check as `/api/*` mutations. Development retains LAN-host behavior for device testing.

**Regression evidence:** `tests/request-security.test.ts` covers spoofed forwarded headers, missing origin metadata, and cross-site auth POSTs. `tests/favorite-api.test.ts` supplies explicit same-origin browser headers for valid mutations.

**Residual condition:** Production deployments must set `NEXT_PUBLIC_SITE_URL` to the exact public origin. Without it, state-changing requests fail closed at the proxy.

## Medium findings

### SEC-002 — Upload validation trusts client-declared media type

**Rules:** NEXT-FILES-001  
**Locations:** `lib/security.ts:2`, `components/sell-wizard.tsx:121`, `supabase/migrations/202610010001_core_schema.sql:148`

The UI and bucket restrict size and declared MIME type to JPEG, PNG, and WebP, and SVG is rejected. No server-side magic-byte validation, decoding/re-encoding, malware scan, or image moderation is present. A malicious or malformed payload can therefore be stored if it is labeled as an allowed image. The private bucket and signed URLs reduce exposure, but do not validate content.

**Recommendation:** Route uploads through a trusted image pipeline or add a post-upload worker that decodes, re-encodes, and replaces accepted images before publication. Keep the bucket private and reject files that do not decode as the declared format.

### SEC-003 — CSP does not constrain script execution

**Rules:** NEXT-CSP-001, JS-CSP-001  
**Location:** `proxy.ts:13`

The current CSP sets `base-uri`, `object-src`, `frame-ancestors`, and `form-action`, but has no `script-src`. React escaping and the absence of `dangerouslySetInnerHTML`, `eval`, and related sinks materially reduce present XSS risk, yet the policy provides little containment if a future XSS sink is introduced.

**Recommendation:** Add a tested Next.js nonce-based CSP before production. Validate all application routes in production mode because a strict policy can break framework scripts if introduced without nonce support.

### SEC-004 — Destructive security scripts are not guarded to a verified disposable project

**Locations:** `scripts/security-audit.mjs:3`, `scripts/security-audit.mjs:6`, `scripts/phase2-security-audit.mjs:3`, `scripts/phase2-security-audit.mjs:6`, `tests/e2e/mutation-guard.ts:1`

The two security scripts create users and marketplace records with the service-role key and delete them during cleanup. Unlike the Playwright mutation guard, they require credentials but do not require `E2E_ALLOW_MUTATION=1` or verify `E2E_EXPECTED_PROJECT_REF`. Pointing `.env.local` at the wrong project can therefore run intrusive tests there.

**Recommendation:** Share a JavaScript-compatible environment guard with both scripts and refuse execution unless the explicit mutation flag and expected project reference match. The scripts were not run during this audit.

### SEC-005 — Authentication abuse controls are not verifiable from the repository

**Rules:** NEXT-DOS-001  
**Locations:** `app/auth/login/route.ts`, `app/auth/register/route.ts`, `app/auth/forgot-password/route.ts`

The routes rely on Supabase Auth and any future hosting edge for login, signup, and reset throttling. Supabase project rate-limit and bot-protection settings are outside the repository and were not verified. No application or edge limiter is visible.

**Recommendation:** Before launch, verify Supabase Auth rate limits, CAPTCHA/bot protection where appropriate, SMTP controls, and hosting-edge throttles. Alert on password-reset and signup spikes.

### SEC-006 — Request body limits are not explicit at the application edge

**Rules:** NEXT-LIMITS-001, NEXT-DOS-001  
**Locations:** `lib/security.ts:3`, `proxy.ts:26`

JSON parsing validates schemas after the request body is read, but no explicit deployment or proxy body-size limit is present in the repository. A hosting platform may supply one, but that control is unconfirmed.

**Recommendation:** Define and test request-size limits at the hosting edge and keep route-specific limits aligned with the largest accepted JSON/form payload.

## Low findings

### SEC-007 — Anonymous callers retain execute access to some helper RPCs

**Locations:** `supabase/migrations/202610010001_core_schema.sql:114`, `supabase/migrations/202610030001_phase2_marketplace.sql:347`

A read-only deployed probe called `is_admin()` anonymously and received `false`. It also reached `start_conversation()` and was rejected by the function's internal authentication check. This occurs because revoking from `PUBLIC` does not necessarily remove Supabase's explicit default grants to `anon`. Current internal checks fail closed, and `moderate_report()` is explicitly denied to anonymous callers.

**Recommendation:** Add a forward migration that explicitly revokes privileged RPC execution from `anon` and grants only the intended roles. Keep the internal `auth.uid()` and admin checks as a second layer.

### SEC-008 — Public aggregate RPCs bypass row visibility

**Location:** `supabase/migrations/202610030001_phase2_marketplace.sql:325`

`listing_favorite_count()` and `seller_marketplace_stats()` are `SECURITY DEFINER` and executable by anonymous callers. The latter aggregates views and non-removed listing states, including states not otherwise publicly readable. UUIDs limit enumeration, and the output is aggregate, so impact is low.

**Recommendation:** Limit the functions to active/public listings or document these aggregates as intentionally public.

### SEC-009 — Development dependency advisory

`npm audit --omit=dev --json` reported zero production vulnerabilities. Full `npm audit --json` reported five High advisory nodes in the lint-only chain `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces` for stack exhaustion in deeply nested patterns. The suggested automated fix downgrades `eslint-config-next` to an incompatible Next.js 14 line and was not applied.

**Recommendation:** Track an upstream compatible release or lockfile resolution that updates `braces`; do not downgrade the Next.js lint stack.

### SEC-010 — Development logs can contain signed image URLs

**Location:** `lib/data.ts:106`

The read-only Playwright run caused a Next.js development image warning to print a complete one-hour signed Storage URL. Active-listing images are intended for public display, but the same logging pattern could expose a draft-image capability URL if triggered on an owner-only page. This was observed only in development-server output.

**Recommendation:** Treat development/CI logs as sensitive and keep their retention and access narrow. Avoid logging image URLs, and consider shorter signed-URL lifetimes for owner-only content.

## Authorization review

| Resource | Anonymous | Authenticated owner/participant | Other authenticated user | Admin/service |
| --- | --- | --- | --- | --- |
| Profiles | Public projection only; privilege columns denied | Update allowlisted profile columns | Cannot update | Admin state checked in DB; service role bypasses RLS |
| Listings | Active only | Own draft/active reads and owner-scoped writes | Cannot update/delete another seller's row | Admin policy and moderation RPC |
| Favorites | No rows | Own rows only | Cannot create/read/delete another user's rows | Service role bypasses RLS |
| Saved searches / recent views | No rows | Own rows only | No cross-user access | Service role bypasses RLS |
| Conversations / messages / offers / trades | No rows | Participants only | Outsiders receive no rows and cannot mutate | Service role bypasses RLS |
| Notifications | No rows | Owner read; only `read_at` update granted | No cross-user access | Trigger/service role writes |
| Reports / moderation | No rows | Reporter creates and reads own reports | No access to another reporter's row | Dual application/DB admin check; atomic audit log |
| Verification challenges | No anonymous rows | Owner projection excludes stored hash | No access | Admin access; service role bypasses RLS |
| Listing images | Private bucket | Active images or owner/admin; owner namespace writes | Cannot overwrite/delete another owner | Service role bypasses Storage RLS |

### Evidence anchors

- Core owner policies: `supabase/migrations/202610010001_core_schema.sql:127-146`
- Phase-two private data policies: `supabase/migrations/202610030001_phase2_marketplace.sql:146-163`
- Storage ownership and path checks: `supabase/migrations/202610020001_phase1_stabilization.sql:73-86`
- Public column minimization and private bucket: `supabase/migrations/202610030005_production_security_hardening.sql:92-115`
- Atomic admin moderation: `supabase/migrations/202610030005_production_security_hardening.sql:132-176`

## Scanning and test evidence

### Completed

- Manual inventory and review of all API/auth routes, Supabase clients, data-access modules, migrations, RLS policies, Storage policies, Realtime policies, triggers, grants, and `SECURITY DEFINER` functions.
- High-signal source scan for XSS sinks, dynamic execution, subprocess use, unsafe file access, CORS, secrets, server-only environment access, and unsafe caching. No exploitable SQL injection, command injection, SSRF, dynamic-code execution, or React raw-HTML sink was found.
- Tracked-file secret-pattern scan found only documented environment-variable names and placeholders. `.env.local` is ignored and was not printed. Git history was not scanned by a dedicated secret scanner.
- `npm audit --omit=dev --json`: 0 production vulnerabilities.
- `npm audit --json`: 5 High advisory nodes, all in the development lint dependency chain described in SEC-009.
- Read-only Supabase probes: public profile projection allowed; privileged profile columns denied (`42501`); anonymous saved searches, notifications, reports, conversations, messages, favorites, and drafts returned no rows; private Storage bucket confirmed; privileged moderation RPC denied.
- Focused regression command: `npx vitest run tests/request-security.test.ts tests/favorite-api.test.ts --reporter=verbose` — 16 passed.
- Safe Playwright subset across Chromium and WebKit — 78 passed, 12 suite-declared skips. The development server emitted non-fatal closed-stream and image performance warnings; the command exited 0.

### Not available

- Semgrep, Gitleaks, git-secrets, Trivy, Snyk CLI, OSV-Scanner, and Supabase CLI were not installed.
- No authenticated dynamic scanner or DAST target was configured.

### Not run for safety

- `scripts/security-audit.mjs`, `scripts/phase2-security-audit.mjs`, and the full state-changing Playwright suite were not run because the configured Supabase project was not confirmed as disposable and the audit scripts lack a project-ref mutation guard.

## Remaining release risks

1. Run the cross-user audit scripts and full Playwright suite against a newly created disposable Supabase project after adding the project guard.
2. Run `supabase test db` or equivalent pgTAP policy tests in CI for allow/deny cases across every operation and actor.
3. Verify Supabase Auth rate limits, bot protection, Realtime public-channel settings, Security Advisor findings, and migration history through authorized control-plane access.
4. Add content-based image validation and a nonce-based CSP before public launch.
5. Confirm the production host, canonical `NEXT_PUBLIC_SITE_URL`, TLS termination, and forwarding-header behavior before deployment.

## Final verification

| Check | Result |
| --- | --- |
| `npm test` | PASS — 25 files, 186 tests |
| `npm run typecheck` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — Next.js 16.3.8 production build, 41 routes generated |
| Focused origin/favorite regression tests | PASS — 16 tests |
| Safe Chromium/WebKit E2E subset | PASS — 78 passed, 12 skipped |
| `npm run test:e2e` | BLOCKED SAFELY — exited 1 during collection because `E2E_ALLOW_MUTATION=1` and a verified disposable project were not supplied; no state-changing test ran |

The state-changing E2E and real authenticated cross-user audit remain required before production launch. Their current non-execution is a deliberate environment-safety limitation, not evidence that those scenarios pass.
