# GGMarket Final Launch Security Audit

**Assessment date:** 2026-10-28

**Decision:** **CONDITIONAL**

**Audited baseline:** `934008ec2d0d20e8128b264fe38a462dc3058ade`

**Audit branch/worktree:** `audit/final-security-20261028` / `.worktrees/final-security-audit`

## 1. Executive summary

The previously blocked essential security boundaries were exercised against a disposable local Supabase stack. No active test contacted Vercel or production Supabase. The canonical migration history now bootstraps from an empty database, all 20 public tables have RLS, the cross-account suites pass, private Storage and Realtime boundaries pass, three bounded localhost sqlmap assessments found no injectable parameter, and the mutation-capable marketplace/browser scenarios pass in Chromium and WebKit.

Confirmed vulnerabilities in this audit were fixed: vulnerable dependencies, unbounded request parsing, a missing mutation-target guard, a pre-hydration form navigation issue, incomplete CSP, spoofable image uploads, direct authenticated Storage uploads, and the fresh-database `similarity()` bootstrap failure. Regression tests cover the fixes.

No Critical or High finding remains open in the audited code. Launch is still **CONDITIONAL**, not unconditional GO, because the production deployment and its Supabase configuration were intentionally not contacted. Before public traffic, the release owner must apply the documented bootstrap/migrations, provide the server-only service credential, verify HTTPS CSP hydration and security headers, and confirm production Auth/SMTP/rate-limit settings. A physical iPhone test also remains unperformed, although WebKit touch and fallback coverage passed.

No commit, push, merge, deployment, production mutation, reset, stash, or discard was performed. The original checkout and its configuration were not modified.

## 2. Test environment and isolation

- Docker Desktop and Docker Engine were operational.
- Supabase CLI: project dependency `2.122.0`.
- Supabase project id: `final-security-audit`.
- Local endpoints used by tests: API `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`, mail UI `127.0.0.1:54324`, Next.js `127.0.0.1:3000`.
- Only synthetic accounts and disposable records were created. Mutation scripts require `E2E_ALLOW_MUTATION=1`, `E2E_EXPECTED_PROJECT_REF=local`, complete local credentials, and a loopback URL.
- No `.env.local` or credential was copied into the worktree. No credential value is reproduced in this report.
- The local Supabase stack used canonical `supabase/config.toml`, `supabase/roles.sql`, all migrations, and seed data. Studio, Edge Runtime, Logflare, Vector, Imgproxy, and Supavisor were excluded because they were not needed for the assessed boundaries.

## 3. Fresh database and schema verification

An empty-volume canonical `supabase start` successfully applied `roles.sql`, all ten migrations, and seed data. The immutable historical migrations were not edited.

The historical `202610010001_core_schema.sql` creates `search_listings` with an empty `search_path` but called unqualified `similarity()`. On a normal fresh install, `pg_trgm` was outside that path and PostgreSQL function-body validation failed. The permanent compatibility fix is:

1. `supabase/roles.sql` installs the trusted, relocatable `pg_trgm` extension in `pg_catalog` before migrations on a fresh database, allowing the immutable historical definition to compile.
2. `202610280002_fix_search_listings_bootstrap.sql` discovers the installed extension schema and replaces `search_listings` with explicitly schema-qualified `similarity()` calls. Existing databases are therefore corrected without relocating their extension.

Canonical local evidence:

| Check | Result |
|---|---|
| Applied migrations | 10/10, local and database history aligned |
| `supabase db lint --local --level warning` | exit 0; no schema errors |
| Public tables with RLS | 20/20 |
| Public policies | 35 |
| Storage policies | 2 |
| Realtime policies | 2 |
| Realtime publication | `messages`, `notifications`, `offers` |
| Security-definer functions | 19; distinct setting `search_path=""` |
| `pg_trgm` schema on fresh stack | `pg_catalog` |
| Final `search_listings` qualification | `pg_catalog.similarity` present |

Production/fresh-install requirement: the supported workflow must include `supabase/roles.sql` before the migration chain and must apply both `202610280001` and `202610280002`. This was verified locally only; production was not queried.

## 4. Dynamic authorization and penetration results

### Foundational database/Storage suite

`node scripts/security-audit.mjs`: **25/25 passed**.

Coverage included profile ownership and privilege-field protection, suspension enforcement, listing ownership/identity transfer, favorites, report moderation fields, self-verification, cross-user Storage paths, direct upload denial, trusted normalized upload, image metadata ownership, object overwrite/delete denial, private draft media, signed URL behavior, publish requirements, and active-listing image access.

### Cross-account/Auth/RLS/Realtime suite

`node scripts/phase2-security-audit.mjs`: **30/30 passed** on the final warm canonical run.

Coverage included conversation and membership privacy, read receipts, private Realtime channel subscription, RPC-only conversation creation, message sender spoofing and bounds, offer creation/read/value bounds and Realtime delivery, saved-search ownership, notification privacy, verification challenges, trade creation/read/state transitions/value bounds, and unavailable review creation.

The first cold run was **29/30** because the offer Postgres Changes event did not arrive while local CDC initialized. An unchanged warm rerun passed **30/30**. This cold-start miss is retained as operational evidence; it did not produce an authorization bypass.

### Browser mutation workflows

Final verified scenarios:

- Chromium: **4/4 in one run** (2.9 minutes): admin moderation/audit log, full marketplace lifecycle, mobile controls/persistence, and two-user Realtime messages/offers/trades.
- WebKit: moderation and Realtime passed in the aggregate run; the full marketplace and mobile cases hit development-server RSC/route compilation timing failures. Both failed cases then passed in focused reruns after test synchronization was tied to destination content: marketplace **1/1** (1.7 minutes), mobile mutation/persistence **1/1** (41.3 seconds).
- The WebKit mobile flow covers real Auth, navigation, filters, favorite add/remove persistence, reports, non-admin denial, private conversation creation, saved-search create/pause/rename/enable/delete, and notification read mutations.
- Earlier production-mode non-Realtime WebKit coverage remained **18/18 passed**, and the two formerly interrupted cases passed **2/2**.

Development-mode failures are not counted as passes. Server logs showed Fast Refresh/RSC fallback and one cold route compilation of 2.2 minutes. The optimized production build did not exhibit a build failure.

### SQL injection

Three bounded, single-threaded, non-destructive sqlmap assessments were run only against verified localhost endpoints backed by the disposable database:

1. PostgREST listings filter: no injectable parameter detected.
2. `search_listings` RPC JSON marker: no injectable parameter detected.
3. Next.js `/search?q=console`: no injectable parameter detected.

No database dump, secret extraction, destructive payload, external target, or arbitrary URL scan was performed. Earlier malformed invocations were discarded and are not evidence.

## 5. Upload and Storage hardening

The pre-fix live reproduction proved an authenticated owner could upload spoofed bytes while declaring an image MIME type. The fix removes authenticated raw Storage insert/update policies and routes uploads through `/api/listings/[id]/images`:

- authenticated owner and listing-status checks;
- declared and streamed multipart body ceiling;
- maximum 10 MiB file and bounded sort order;
- Sharp decode, EXIF rotation, 40-million-pixel decoding cap, 4096x4096 output bound;
- WebP normalization at quality 85;
- server-only service-role Storage write;
- user-scoped metadata insertion and orphan cleanup on failure.

Live final evidence (`scripts/image-upload-audit.mjs`): **4/4 passed**.

- Spoofed bytes rejected with HTTP 400.
- Valid PNG accepted with HTTP 201 and normalized/stored as WebP.
- Anonymous reader could obtain an active-listing signed image.
- Public listing rendered the normalized image with HTTP 200.

Direct authenticated uploads remain denied; owner deletion remains scoped. The endpoint returned HTTP 503 when the service credential was absent during validation. `SUPABASE_SERVICE_ROLE_KEY` is therefore a required server-only runtime secret and must never use a `NEXT_PUBLIC_` name or reach client bundles.

## 6. Request limits, CSP, XSS, and CSRF

- JSON and URL-encoded form bodies are read through a 65,536-byte declared-and-streamed limit.
- Image multipart requests enforce a 10 MiB file limit plus 64 KiB envelope allowance before `FormData` parsing. Tests prove a legitimate multipart upload parses and both declared and streamed oversized bodies are rejected.
- Message multipart input was removed; message submission accepts bounded URL-encoded form input.
- CSRF middleware rejects untrusted cross-origin mutations for `/api` and `/auth`, pins the canonical production origin, and retains SameSite cookie protections.
- No `dangerouslySetInnerHTML`, executable user markup, `eval`, `new Function`, or command sink was found in the reviewed application paths. User content uses React escaping.

The enforced production CSP now contains `default-src`, `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `worker-src`, `manifest-src`, `media-src`, `object-src`, `base-uri`, `form-action`, `frame-ancestors`, and `upgrade-insecure-requests`. Production has no `unsafe-eval`; local development permits it for the retained Webpack workaround and omits `upgrade-insecure-requests` so HTTP WebKit can hydrate.

Residual CSP risk: production still uses `unsafe-inline` for script/style compatibility with the current Next.js rendering strategy. Moving to a nonce/hash CSP is a defense-in-depth improvement, not a launch-blocking confirmed exploit in this audit.

Production header evidence from a local optimized server: HTTP 200, complete CSP, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`. HSTS was absent on local plain HTTP and must be verified at the HTTPS edge.

An intentionally plain-HTTP production-mode WebKit smoke could not hydrate because the production CSP's `upgrade-insecure-requests` upgraded asset requests; 2/2 no-JavaScript auth fallbacks passed, while three hydration-dependent cases failed and are not counted as production HTTPS passes. HTTPS deployment hydration remains a release condition.

## 7. Dependencies and build

Resolved versions:

- Next.js / `eslint-config-next`: `16.4.3` (patched from `16.3.8`).
- Zod: `4.6.7` (patched from `4.6.5`).
- React / React DOM: `19.3.0`.
- Sharp: `0.35.5` through Next.js.
- Vitest: `5.0.5`; Vite: `8.3.5`.

The Webpack development workaround remains `next dev --webpack --hostname 0.0.0.0`. `npm audit --json` returned exit 0 with zero info/low/moderate/high/critical vulnerabilities across 568 dependencies.

Final release-gate results:

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | exit 0; 49 files, 302 tests passed |
| `npm audit --json` | exit 0; 0 vulnerabilities |
| `npm run build` | exit 0; Next 16.4.3; 47/47 static pages generated |
| Foundational security script | 25/25 passed |
| Phase 2 cross-account script | final 30/30 passed; first cold run 29/30 as documented |
| Live upload regression | 4/4 passed |
| Chromium mutation scenarios | 4/4 passed in one run |
| WebKit mutation scenarios | all four verified; 2 aggregate passes plus 2 focused rerun passes |
| Supabase DB lint | exit 0; no schema errors |
| Bounded sqlmap assessments | 3 completed; no injection detected |
| `git diff --check` | exit 0 before final report update; rerun in final handoff gate |

## 8. Secrets and production configuration

A value-suppressing tracked-tree scan found no committed service-role assignment, private key, or confirmed privileged credential. `.env.example` contains placeholders only. The application documents the server-only service-role requirement. Local disposable keys printed by the CLI are not reproduced here.

Production was deliberately not contacted. The following must be verified by the release owner before public traffic:

1. `NEXT_PUBLIC_SITE_URL` is exactly the canonical HTTPS origin.
2. Public Supabase URL/anonymous key identify the intended project; `SUPABASE_SERVICE_ROLE_KEY` exists only in server runtime configuration.
3. `roles.sql`/migration deployment order is supported and migrations `202610280001` and `202610280002` are applied.
4. The `listing-images` bucket remains private and has only the reviewed read/delete policies; direct authenticated insert/update stays absent.
5. Auth redirect allowlists, SMTP, email verification, password-reset behavior, CAPTCHA/provider abuse controls, and rate limits are configured.
6. HTTPS responses hydrate in Safari/WebKit and include the CSP plus edge HSTS.
7. Test-harness routes are excluded or access-controlled if the deployment policy requires it.

## 9. Docker LAN exposure

Docker published the local disposable API (`54321`), database (`54322`), and mail UI (`54324`) on `0.0.0.0` and `::`. The Supabase CLI configuration in use did not provide a supported per-service loopback bind control. Tests still used `127.0.0.1` exclusively, synthetic data only, and the stack is stopped after the audit.

This is a Medium local-workstation operational risk while the stack is running on an untrusted LAN. Mitigations are: keep runs short-lived, use synthetic data, stop immediately after testing, and use a host firewall/private Docker network policy if longer-running local environments are needed. No machine-wide firewall change was made during this audit.

## 10. Findings disposition

| ID | Finding | Original severity | Status |
|---|---|---:|---|
| F-001 | Vulnerable Next.js baseline | Critical | Fixed; 16.4.3 |
| F-002 | Unbounded JSON parsing | Medium | Fixed; bounded stream parser |
| F-003 | Mutation scripts lacked target guard | Medium | Fixed; positive loopback/disposable guard |
| F-004 | Pre-hydration resend navigation | Low | Fixed; regression covered |
| F-005 | Incomplete CSP | Medium | Fixed baseline; nonce/hash hardening remains |
| F-006 | Upload trusted declared MIME | Medium | Fixed; trusted decode/re-encode endpoint |
| F-007 | Dynamic authorization coverage gap | High release risk | Resolved locally; 25/25 and 30/30 suites |
| F-008 | Form/multipart limits unverified | Medium | Fixed and regression tested |
| F-009 | Fresh database fails on unqualified `similarity()` | High availability/release risk | Fixed without editing immutable migration |
| F-010 | Supabase local ports published to LAN | Medium local operational | Mitigated by short-lived synthetic stack and shutdown; firewall option remains |

Open severity count in audited application code: **Critical 0, High 0**. Remaining Medium risks are defense-in-depth/operations: CSP `unsafe-inline`, local Docker LAN exposure while running, service-role runtime blast radius, and production provider/edge configuration not independently verified.

## 11. Tests not performed or still bounded

- No active test, scan, or configuration query against production Supabase or Vercel.
- No production-data validation or production migration dry run.
- No external email delivery, CAPTCHA, credential-stuffing, or provider-scale rate-limit test.
- No destructive sqlmap option, dump, secret extraction, or high-risk payload.
- No physical iPhone keyboard/safe-area/session test.
- No HTTPS-local WebKit harness; plain-HTTP production mode is intentionally incompatible with `upgrade-insecure-requests`.
- No machine-wide firewall reconfiguration.

## 12. Final recommendation

**CONDITIONAL LAUNCH APPROVAL.** The essential application security boundaries are no longer untested: local Auth, RLS, cross-account access, private messages, Storage, signed media, Realtime, offers/trades, moderation, request limits, upload validation, CSRF, CSP, SQL injection checks, dependency security, build, Chromium, and WebKit were exercised with the evidence above.

Do not open public traffic until the seven production configuration checks in section 8 are completed, especially canonical migration deployment, the server-only service credential, private Storage policy state, and HTTPS WebKit/CSP/HSTS smoke testing. If any of those checks cannot be completed or differs from this audited local schema/configuration, the decision reverts to **NO-GO**.

This recommendation does not assert that all vulnerabilities are impossible; it states that the defined essential local release gates passed and clearly identifies the remaining deployment and operational conditions.
