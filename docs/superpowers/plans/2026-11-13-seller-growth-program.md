# Seller Growth Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver verification, first-100 founders, featured campaigns, and qualified referral rewards behind disabled-by-default flags.

**Architecture:** Add one transactional Supabase migration with RLS, constrained ledgers, and narrow RPCs. Add authenticated Next.js route handlers and server-rendered account/admin/home surfaces, reusing current auth, notifications, listing data, and design tokens.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/RLS, Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-seller-growth-program-design.md`

## Global Constraints

- No identity-document collection, billing, deployment, production database changes, or automatic feature enablement.
- Preserve the existing `seller_verifications`, `seller_type`, auth confirmation/recovery, moderation, and R2 flows.
- Every privileged transition is authenticated server-side and enforced again in PostgreSQL.
- All new flags default disabled and preserve records when disabled.

## Review Focus

- Concurrent 100th-slot allocation must never create slot 101 or allocate two sellers to one slot.
- Replayed admin/referral/redeem requests must be idempotent and leave one audit/ledger result.
- Suspended sellers and inactive listings must never receive or retain active promotional placement.
- Cross-account reads and mutations must fail under RLS and RPC ownership checks.
- OAuth/email-confirmation referral claiming must not change safe redirect or recovery behavior.

---

### Task 1: Domain flags and database foundation

**Files:** `.env.example`, `lib/feature-flags.ts`, `supabase/migrations/202611130002_seller_growth_program.sql`, `supabase/tests/seller_growth_program_rls.test.sql`, `tests/seller-growth-flags.test.ts`, `tests/seller-growth-migration.test.ts`

**Interfaces:** Produce `isFeatureEnabled(name)` and RPCs for application, review, founder allocation, promotion activation, referral claiming/qualification, and reward redemption.

- [ ] Write flag and migration contract tests; run them and verify expected failures.
- [ ] Implement disabled-by-default flags and the additive schema/RLS/RPC migration.
- [ ] Run focused tests and Supabase lint/static migration checks.
- [ ] Commit `feat: add seller growth database foundation`.

### Task 2: Verification and admin workflow

**Files:** `lib/seller-growth.ts`, `app/api/seller-growth/verification/route.ts`, `app/api/admin/seller-verifications/route.ts`, `components/seller-verification-panel.tsx`, `components/admin-seller-verifications.tsx`, `components/seller-trust-badges.tsx`, `app/settings/seller-growth/page.tsx`, `app/admin/seller-growth/page.tsx`, existing profile/listing/chat surfaces, corresponding Vitest tests.

**Interfaces:** Owner status reads; submit application; admin approve/reject/request-info/revoke; public `SellerTrustBadges`.

- [ ] Add failing owner/admin authorization and badge-copy tests.
- [ ] Implement authenticated routes, pages, notifications, audit presentation, and accessible badges.
- [ ] Run focused tests, typecheck, and lint.
- [ ] Commit `feat: add seller verification workflow`.

### Task 3: Founders and featured campaigns

**Files:** `lib/seller-growth.ts`, `app/api/seller-growth/featured/route.ts`, `components/featured-listing-control.tsx`, homepage/discovery/profile/listing files, migration/tests from Task 1.

**Interfaces:** Founder count/remaining slots, allocation RPC, campaign activation/deactivation, `getFeaturedListings()` deterministic rotation.

- [ ] Add failing allocation, entitlement-expiry, ownership, and rotation tests.
- [ ] Implement first-100 allocation, 30-day activation, one-active-listing enforcement, homepage campaign/featured sections, and distinct founder badge.
- [ ] Run focused tests, typecheck, lint, and responsive browser checks.
- [ ] Commit `feat: add founding seller featured program`.

### Task 4: Referral attribution and rewards

**Files:** `app/join/route.ts`, auth confirmation/callback routes, `lib/referrals.ts`, `app/api/seller-growth/referrals/route.ts`, `components/referral-dashboard.tsx`, account page, migration/tests from Task 1.

**Interfaces:** Signed/HttpOnly attribution cookie lifecycle; unique code read; claim; qualification; reward ledger and redemption.

- [ ] Add failing attribution, self/circular/duplicate, seven-day, monthly-cap, and idempotency tests.
- [ ] Implement safe attribution through signup/OAuth confirmation, dashboard, qualification and boost redemption.
- [ ] Run focused auth/referral tests, typecheck, and lint.
- [ ] Commit `feat: add qualified referral rewards`.

### Task 5: Integration, security review, and launch runbook

**Files:** `tests/e2e/seller-growth-safe.spec.ts`, `docs/seller-growth-program-runbook.md`, affected test contracts.

**Interfaces:** Release evidence and operational instructions.

- [ ] Add read-only/mocked browser contracts and database-backed test instructions clearly labelled by environment.
- [ ] Review RLS, RPC grants/search paths, IDOR/XSS/rate limits, migration rollback, and auth redirect compatibility; fix findings test-first.
- [ ] Run Vitest, TypeScript, ESLint, production build, safe Chromium/WebKit tests, and pgTAP only against a verified disposable target.
- [ ] Commit `docs: add seller growth rollout runbook`, push branch, and open a PR against `main`.

