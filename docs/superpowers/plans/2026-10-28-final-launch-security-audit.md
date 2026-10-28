# GGMarket Final Launch Security Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patch confirmed dependency vulnerabilities, adversarially review GGMarket's launch-critical security boundaries, safely fix confirmed defects, and produce an evidence-backed GO/NO-GO report.

**Architecture:** Work only in the isolated `audit/final-security-20261028` worktree. Separate safe static/local checks from data-mutating tests; dynamic database, sqlmap, Storage, Realtime, and cross-account tests run only after a disposable local Supabase target is positively identified. Remediation follows root-cause analysis and regression-test-first changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Playwright, Supabase PostgreSQL/Auth/Storage/Realtime, npm audit.

**Spec:** `C:/Users/Pavlos/.codex/attachments/abd3d4b3-004f-48b2-a185-bda37ba94475/Pasted text.txt`

## Global Constraints

- Never scan or mutate the production Vercel deployment or production Supabase project.
- Preserve the original branch, uncommitted files, `.env.local`, and all existing behavior.
- Do not copy credentials into the worktree, tests, logs, screenshots, or report.
- Do not commit, push, merge, deploy, or alter production configuration.
- Keep `next dev --webpack --hostname 0.0.0.0` unless fresh evidence shows the workaround is obsolete and safe to remove.
- Preserve the immutable migration history; database fixes use a new ordered migration only.
- Treat unavailable isolated infrastructure as blocked coverage, never as a passing test.

## Review Focus

- User-controlled bodies and collections must be bounded before parsing/validation to resist memory exhaustion.
- Every private data mutation must enforce both authentication and resource ownership/membership server-side and in RLS.
- Browser account switching must not retain prior-account cache, listeners, messages, or notification state.
- Dynamic redirects, URLs, filenames, and media paths must reject unsafe origins, schemes, traversal, and ownership changes.
- Privileged SQL functions must pin `search_path`, validate callers, and restrict `EXECUTE` grants.

---

### Task 1: Patch vulnerable dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: existing `tests/**/*.test.ts`

**Interfaces:**
- Consumes: current npm lockfile resolving Next.js 16.3.8, Zod 4.1.11, React 19.3.0, and Vite 8.3.2.
- Produces: a lockfile resolving security-fixed stable Next.js, matching ESLint config, Zod 4.6.6+, and patched vulnerable transitives while preserving the Webpack development script.

- [ ] Record exact pre-upgrade versions, advisory applicability, and dependency paths.
- [ ] Upgrade `next` and `eslint-config-next` to 16.4.3 and `zod` to 4.6.7; update Vitest only as needed to resolve vulnerable Vite transitives without force upgrades.
- [ ] Verify exact installed Next.js, React, React DOM, Sharp, Zod, Vitest, and Vite versions.
- [ ] Run `npm audit --omit=dev`, full `npm audit`, TypeScript, ESLint, Vitest, production build, and Playwright safe/read-only projects.

### Task 2: Build the attack-surface and trust-boundary inventory

**Files:**
- Create: `docs/audits/GGMARKET_FINAL_LAUNCH_SECURITY_AUDIT.md`
- Inspect: `app/**`, `components/**`, `lib/**`, `proxy.ts`, `next.config.ts`
- Inspect: `supabase/migrations/*.sql`

**Interfaces:**
- Consumes: route handlers, pages, validation schemas, Supabase calls, migration DDL/policies/functions, storage and realtime clients.
- Produces: route/API/RPC/table/view/bucket/channel inventory with auth, authorization, input, data, side-effect, rate-limit, and error behavior.

- [ ] Inventory every page, dynamic parameter, route handler, RPC, table/view, bucket, signed-media path, Realtime channel, callback, upload, admin, and moderation surface.
- [ ] Map Browser → Next.js/Vercel → Supabase → PostgreSQL/Storage/Realtime trust boundaries.
- [ ] Record security controls and gaps per sensitive endpoint in the report.

### Task 3: Perform static application and database security review

**Files:**
- Inspect: `app/api/**`, `app/auth/**`, `lib/**`, `components/**`, `proxy.ts`, `next.config.ts`
- Inspect: `supabase/migrations/*.sql`
- Test: focused `tests/*.test.ts` additions for confirmed defects only.

**Interfaces:**
- Consumes: Task 2 inventory.
- Produces: evidence-backed findings for SQL injection, auth/session, authorization/RLS, XSS/CSRF, upload/Storage, Realtime, business logic, rate limiting, caching, headers, secrets, and supply chain.

- [ ] Review dynamic SQL, query construction, sort allowlists, RPC arguments, `SECURITY DEFINER`, `search_path`, grants, policies, and `WITH CHECK` coverage.
- [ ] Review all auth/session redirects, origin checks, cookies, protected routes, resource ownership, suspended-user checks, and account-isolation paths.
- [ ] Review rendering and URL sinks, state-changing requests, content types, body limits, upload signature/size/path validation, bucket access, signed URLs, and cache headers.
- [ ] Review private Realtime topics/listeners, sender identity, membership, reconnect/account-switch behavior, and notification/read-receipt mutations.
- [ ] Review prices, quantities, offer/trade transitions, replay/idempotency, concurrency, self-dealing, spam/rate limits, and administrative transitions.
- [ ] Scan the tracked tree and Git history for secret patterns without printing candidate values; verify client bundles cannot receive privileged keys.

### Task 4: Verify isolated dynamic-test availability and run allowed attacks

**Files:**
- Inspect: local environment metadata by variable name/host classification only.
- Create/Test: temporary untracked evidence under the plan's `.superpowers` workspace only.

**Interfaces:**
- Consumes: explicit local disposable Supabase proof and synthetic identities.
- Produces: sanitized sqlmap, cross-account RLS, Storage, Realtime, auth, CSRF/XSS, business-logic, and bounded abuse-test evidence—or an explicit blocked-coverage record.

- [ ] Confirm the target is local/disposable and cannot be production before any state-changing request.
- [ ] If confirmed, install/use trusted sqlmap locally at `--risk=1 --level=1 --threads=1 --delay=1` against specific local endpoints only; never dump data or execute destructive actions.
- [ ] If confirmed, exercise anonymous, User A, User B, seller, buyer, suspended, moderator, and administrator negative cases with synthetic records.
- [ ] If isolation is not confirmed, skip all active database/security mutations and document every blocked test precisely.

### Task 5: Remediate confirmed defects with regression tests

**Files:**
- Modify: only files identified by a reproduced finding.
- Test: nearest focused Vitest or Playwright test; new migration only if database policy remediation is required.

**Interfaces:**
- Consumes: reproduced Task 3/4 findings.
- Produces: minimal root-cause fixes, RED→GREEN regression evidence, and adjacent regression results.

- [ ] For each confirmed defect, document severity, boundary, reproduction, root cause, and expected behavior before editing.
- [ ] Write and run the smallest regression test; verify it fails for the expected reason.
- [ ] Implement one minimal fix without weakening authorization or production safeguards.
- [ ] Rerun the failing test and adjacent/full suites; record exact evidence and status.

### Task 6: Complete launch verification and final report

**Files:**
- Modify: `docs/audits/GGMARKET_FINAL_LAUNCH_SECURITY_AUDIT.md`

**Interfaces:**
- Consumes: all command logs, static findings, dynamic evidence, fixes, and blocked coverage.
- Produces: the required 23-section audit report and strict GO/NO-GO recommendation.

- [ ] Run fresh TypeScript, ESLint, Vitest, production build, dependency audit, secret scan, static security checks, and all safe Playwright Chromium/WebKit coverage.
- [ ] Run dynamic RLS/Storage/Realtime/sqlmap/cross-account tests only if Task 4 proved isolation.
- [ ] Record exact commands, exit codes, test counts, failures, skips, environment class, and device limitations.
- [ ] Classify every finding with ID, severity, affected location, preconditions, reproduction, expected/observed behavior, impact, root cause, fix, verification, and status.
- [ ] Issue GO only if every mandatory launch gate has fresh evidence; otherwise issue NO-GO or CONDITIONAL with exact required actions.
