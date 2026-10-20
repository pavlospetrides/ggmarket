# GGMarket Cookie, Auth Session, and Privacy Audit

**Audit date:** 20 October 2026  
**Scope:** Current dirty worktree, Next.js 16 application, installed Supabase SSR/client packages, signed-out Chromium runtime, auth/session routes, Realtime clients, service worker, browser storage, and public privacy UI. No production data, Supabase control-plane settings, migrations, or deployment configuration were changed.

## Executive summary

GGMarket currently uses essential storage only. No analytics, advertising, marketing pixels, tag managers, third-party embeds, or optional-cookie SDKs were found in application source or the signed-out browser runtime. A consent banner would therefore be misleading and would create unnecessary preference storage. The appropriate experience is the implemented Cookie Policy, Privacy Policy, and site-wide footer access.

Two confirmed session-hardening gaps were fixed:

1. Supabase SSR defaults did not add `Secure`; GGMarket now adds it in production while retaining HTTP development/LAN compatibility.
2. Auth redirects and responses carrying Supabase auth storage were not explicitly private/no-store; they now receive `Cache-Control: private, no-store, max-age=0, must-revalidate`, `Pragma: no-cache`, and `Expires: 0`.

Supabase cookies remain intentionally JavaScript-readable. The installed `@supabase/ssr` browser client uses cookie-backed storage to persist and refresh the session, so forcing `HttpOnly` would break the supported architecture.

## Confirmed inventory

| Key / technology | Provider | Storage | Purpose | Duration | Personal information | Classification / consent |
| --- | --- | --- | --- | --- | --- | --- |
| `sb-axnfwsmszjgqazboqzly-auth-token` and possible numbered chunks (`.0`, `.1`, …) | GGMarket first-party cookie; Supabase auth implementation | Cookie | Persist sign-in, supply access/refresh credentials, refresh the session, authenticate API/Realtime access | `@supabase/ssr` ceiling: 400 days; may end sooner through access-token expiry, refresh rotation, logout, revocation, or server settings | Encoded access/refresh credentials and session/user metadata | Strictly necessary when the user requests account functionality; no opt-in consent gate |
| `sb-axnfwsmszjgqazboqzly-auth-token-code-verifier` and possible chunks | GGMarket first-party cookie; Supabase PKCE flow | Cookie | Bind the browser to email confirmation, recovery, or another PKCE callback | Removed after successful exchange; an abandoned flow can remain up to the 400-day library ceiling unless cleared | Random PKCE verifier; confidential authentication material, not an ad identifier | Strictly necessary for the requested auth flow |
| `ggmarket-sw-recovery` | GGMarket | `sessionStorage` | Prevent a stale-service-worker/chunk recovery reload loop | Per tab; removed immediately after successful React hydration | Literal recovery marker only (`1`) | Strictly necessary technical recovery |
| `ggmarket-shell-v3` | GGMarket | Cache Storage / service worker | Production offline shell | Until cache version replacement, service-worker removal, or site-data clearing | None; only `/offline` and `/icon.svg` | Strictly necessary offline/availability storage |
| `__next_debug_channel` | Next.js development tooling | IndexedDB | Next.js development diagnostics | Development-runtime controlled | Development diagnostics, not GGMarket application storage | Development only; absent from production design |

### Not found

- No app-owned `localStorage`.
- No app-owned IndexedDB database.
- No analytics or audience measurement scripts.
- No advertising, retargeting, social pixels, tag managers, heatmaps, or session-replay SDKs.
- No third-party widgets or iframes.
- No service-worker caching of navigations, authenticated pages, API responses, messages, listings, or profile data.
- No application-created optional preference/consent cookie.

## Cookie attributes and session model

The app now passes the same options to browser, server, and Proxy Supabase clients:

- `Path=/`
- `SameSite=Lax`
- `Secure=true` only when `NODE_ENV=production`
- no `Domain`, so the cookie remains host-only
- `HttpOnly=false`, required by this Supabase browser/SSR cookie-storage model

The browser client has `persistSession=true`, `autoRefreshToken=true`, and PKCE URL detection enabled. Server clients persist through cookies but do not run their own background auto-refresh. `proxy.ts` calls `auth.getUser()` on matched requests, allowing Supabase to validate/refresh the request session and return updated cookie chunks. The project-specific JWT lifetime, inactivity timeout, refresh-token reuse interval, and rotation configuration live in Supabase Auth settings and were not available from the repository; owner verification is required.

## Auth and isolation review

- Login, registration, password recovery, callback, and logout use Route Handlers and the server Supabase client.
- Login redirects are constrained to safe same-site paths.
- Production absolute callback URLs use the configured canonical site origin; existing mutation-origin checks cover `/api/*` and `/auth/*` writes.
- Protected server pages call `getUser()`/`requireUser()` rather than trusting client state.
- Auth-bearing Proxy responses and every auth redirect are now private/no-store.
- Notification Realtime state listens for auth changes, removes the previous user channel, clears scoped state, unsubscribes the auth listener, and removes the active channel on cleanup.
- Chat removes its private conversation channel on cleanup.
- The service worker uses network-only navigation with an offline fallback and caches only 2 public shell assets.

An actual Account A → logout → Account B browser exchange was not run because no disposable authenticated test target or approved test credentials were available. Unit coverage verifies prior-account notification events are ignored, while route tests verify login/logout calls and redirects. This remains a release-gate browser test on an isolated Supabase project.

## Findings and fixes

### COOKIE-001 — Production Supabase cookies lacked an explicit `Secure` option — Fixed (Medium)

**Evidence:** Installed `@supabase/ssr` 0.7.0 defaults to `Path=/`, `SameSite=Lax`, `HttpOnly=false`, and a 400-day `maxAge`, but does not default `Secure`. GGMarket previously passed no cookie options.

**Fix:** `lib/supabase/cookie-security.ts` supplies environment-aware options to `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `proxy.ts`. Production receives `Secure`; development remains compatible with HTTP and LAN devices.

### COOKIE-002 — Auth/session-changing responses lacked explicit private cache directives — Fixed (Medium)

**Evidence:** Auth routes returned redirects without `Cache-Control`; Proxy refreshed sessions but did not add a private/no-store directive to responses carrying auth cookies.

**Fix:** Auth handlers wrap every success/error redirect with private/no-store headers. Proxy applies the same headers when request or response cookies match Supabase auth-token or PKCE storage.

### COOKIE-003 — Supabase session cookie is JavaScript-readable — Accepted architecture (Informational)

This is not being “fixed” with `HttpOnly`. Both the installed browser client and Supabase SSR cookie adapter read/replace the cookie. A future move to opaque server-side sessions/BFF architecture could make `HttpOnly` possible, but it is a separate authentication redesign.

### COOKIE-004 — Abandoned PKCE verifier can inherit the 400-day ceiling — Owner/vendor review (Low)

Successful code exchange removes the verifier, but the library applies its normal cookie ceiling when first setting it. Confirm whether the product uses auth flows that can leave abandoned verifiers and whether a supported shorter per-key lifetime is available without breaking Supabase SSR.

### COOKIE-005 — Supabase Auth lifetime and abuse settings are outside source control — Owner review (Medium)

Verify JWT lifetime, refresh-token rotation/reuse interval, inactivity and time-box limits, password-reset expiry, bot protection, and login/signup/reset rate limits in the intended Supabase project.

## Disclosure and consent decision

Article 5(3) of the ePrivacy Directive permits storage/access that is strictly necessary to provide a service explicitly requested by the user. The present auth/session and minimal offline technologies fit that implementation purpose. GGMarket therefore discloses them but does not block them behind consent or present non-existent optional choices.

If optional technology is introduced later, release must add prior blocking, purpose-level choices with no preselection, equally accessible accept/reject actions, versioned preference storage, and easy withdrawal. The current no-banner decision must be re-audited at that point.

Official references:

- EU ePrivacy Directive Article 5(3): https://eur-lex.europa.eu/eli/dir/2002/58/art_5/par_3/oj/eng
- EDPB Guidelines 05/2020 on consent: https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en
- Cyprus Commissioner for Personal Data Protection: https://www.dataprotection.gov.cy/

This is an engineering compliance draft, not legal advice.

## Browser and test evidence

- Signed-out isolated Chromium at `http://localhost:3000`: no cookies, no localStorage keys, no sessionStorage keys after successful hydration, no Cache Storage entries, no active service worker in development; Next.js development tooling created `__next_debug_channel` IndexedDB.
- Signed-out isolated Chromium against the production build at `http://localhost:3010`: no cookies, localStorage, sessionStorage, or IndexedDB; one active `/sw.js` registration and exactly one `ggmarket-shell-v3` cache containing only `/offline` and `/icon.svg`.
- Live response headers included the existing CSP, frame, MIME-sniffing, referrer and permissions controls; the signed-out development document had `Cache-Control: no-cache, must-revalidate`.
- Mobile Chrome emulation: document `clientWidth=390`, `scrollWidth=390`; policy table is rendered as stacked disclosure blocks rather than causing page or internal horizontal overflow.
- Production mobile Lighthouse on `/cookies`: Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100; 52 audits passed and 0 failed. Keyboard inspection confirmed the first Tab target is the visible `Skip to content` link with a solid focus outline.
- Focused Chromium and WebKit policy navigation checks cover absence of a consent gate, footer discoverability, owner-review disclosure, and mobile overflow.
- Auth helper/route tests cover environment-aware cookie flags, auth cookie chunk matching, private cache headers, login, callback, registration, reset, logout, and mutation-origin validation.
- Final automated evidence: 256/256 Vitest tests passed; ESLint and TypeScript exited 0; Next.js 16.3.8 production build completed and prerendered `/cookies` and `/privacy`; the focused Playwright matrix passed 4/4 checks across Chromium desktop and WebKit mobile.

## Explicit owner/legal review requirements

Before production launch, the owner or counsel must confirm and insert:

1. Controller legal name, registered/business address, and privacy contact.
2. Purpose-by-purpose GDPR lawful bases and any legitimate-interest assessments.
3. Record-level retention/deletion schedule; the 400-day cookie ceiling is not a business retention policy.
4. Supabase, hosting, email, moderation, payment, and support processor identities, agreements, regions, subprocessors, and transfer safeguards.
5. Data-subject request, identity-verification, export, deletion, objection, and complaint procedures.
6. Minor/child eligibility rules, breach contact/process, and regulator wording.
7. Supabase Auth production settings and an isolated Account A → logout → Account B browser regression.
8. Re-audit before adding any analytics, advertising, social widget, session replay, A/B testing, or other optional terminal storage.

