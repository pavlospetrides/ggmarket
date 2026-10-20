# Account Verification, Ratings, and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver truthful Supabase email verification, one-character listing descriptions, secure profile ratings, and account-scoped live message notifications across desktop and iPhone layouts.

**Architecture:** Reuse Supabase Auth for email confirmation, the existing `reviews` and `notifications` tables, and the existing message notification trigger. Add one forward-only migration for description/rating constraints, authenticated Route Handlers for email resend and rating upsert, a focused rating client component, and one root notification provider shared by desktop/mobile UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Supabase Auth/Postgres/RLS/Realtime, Radix Dialog, Vitest, Playwright Chromium/WebKit.

**Spec:** `docs/superpowers/specs/2026-10-20-account-ratings-notifications-design.md`

## Global Constraints

- Preserve the dirty worktree and all working Marketplace, Sell Wizard, authentication, Favorites, Chat, responsive design, insecure-LAN UUID, CSRF/origin, and RLS behavior.
- Do not apply migrations remotely, mutate protected data, install dependencies, commit, push, or deploy.
- Do not claim remote Supabase, email delivery, browser push, or physical-iPhone behavior without direct evidence.
- Use the existing design tokens and shared Radix dialog; do not redesign unrelated pages.
- Derive all protected identities from the authenticated server session and keep RLS as a required boundary.

## Review Focus

- A confirmation callback that succeeds for password recovery must not falsely claim email verification; verification success requires a confirmed user record.
- Concurrent repeated rating submissions must update one row and keep the aggregate count stable.
- A delayed Realtime/fetch result from Account A must not enter Account B after an auth change.
- Duplicate INSERT events and reconnect reconciliation must produce one row and one toast.
- Whitespace-only descriptions must fail consistently even though the HTML `required` attribute alone accepts whitespace.

---

### Task 1: Shared validation and state contracts

**Files:**
- Modify: `lib/validation.ts`
- Create: `lib/notification-state.ts`
- Modify: `tests/phase1-rules.test.ts`
- Create: `tests/notification-state.test.ts`
- Create: `tests/rating-validation.test.ts`

**Interfaces:**
- Produces: trimmed 1–5000 character listing descriptions, `ratingSchema`, and pure account-scoped notification merge/reset helpers.

- [ ] Write failing tests for one-character create/edit descriptions, empty/whitespace rejection, 5,001-character rejection, rating bounds/comment trimming, deduplication, ordering, and stale-account rejection.
- [ ] Run the focused Vitest files and confirm failures reflect the old minimum/missing contracts.
- [ ] Implement the minimal schemas and pure notification-state helpers.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Additive PostgreSQL security migration

**Files:**
- Create: `supabase/migrations/202610200001_account_ratings_and_description.sql`
- Create: `tests/account-ratings-migration.test.ts`

**Interfaces:**
- Produces: `listings_description_required` check, `reviews_reviewer_seller_uidx`, reviewer-owned INSERT/UPDATE policies, and column-level grants for rating/comment updates.

- [ ] Write a failing migration contract test that checks the forward-only migration enforces `btrim(description)` length 1–5000, one reviewer/target row, no self-rating, active-account enforcement, and immutable reviewer/target identities through column grants.
- [ ] Run the migration test and confirm it fails because the migration is absent.
- [ ] Add the migration without editing the seven existing migration files; fail clearly if historical duplicate reviewer/target rows prevent the unique index.
- [ ] Run the migration contract test and document that executable PostgreSQL validation is unavailable because this workspace has no Supabase CLI, Docker, or local Supabase config.

### Task 3: Truthful Supabase email verification

**Files:**
- Create: `components/email-verification-card.tsx`
- Create: `app/api/verification/email/route.ts`
- Modify: `app/settings/verification/page.tsx`
- Modify: `app/auth/callback/route.ts`
- Modify: `components/auth-form.tsx`
- Modify: `app/auth/register/route.ts`
- Create: `tests/email-verification-api.test.ts`
- Create: `tests/auth-callback-verification.test.ts`
- Create: `app/test-harness/verification/page.tsx`
- Create: `tests/e2e/verification-safe.spec.ts`

**Interfaces:**
- Consumes: Supabase `user.email_confirmed_at`, `auth.resend({ type: "signup" })`, safe public origin, and safe relative redirects.
- Produces: `{ status: "sent" | "already_verified" }` and touch-safe verification status UI.

- [ ] Write failing route tests for unauthenticated, already-confirmed, accepted resend, rate-limit/error, safe redirect, successful callback, and invalid/expired callback behavior.
- [ ] Run them and confirm the missing route/callback branches fail.
- [ ] Implement the authenticated resend endpoint and callback verification without treating an accepted email request as confirmation.
- [ ] Implement the email card with loading, cooldown, success/error announcements, and initial state derived from the server user.
- [ ] Add a safe mobile harness test for tap/loading/already-verified/invalid UI and run it in Chromium and WebKit.

### Task 4: Secure user rating upsert and responsive profile interaction

**Files:**
- Create: `app/api/reviews/route.ts`
- Create: `components/rate-user-dialog.tsx`
- Modify: `components/profile-view.tsx`
- Modify: `lib/types.ts`
- Create: `tests/review-api.test.ts`
- Create: `app/test-harness/rating/page.tsx`
- Create: `tests/e2e/rating-safe.spec.ts`

**Interfaces:**
- Consumes: `ratingSchema`, authenticated user, unique reviewer/target constraint, and existing public profile review data.
- Produces: `{ review, summary: { average, count }, updated }` from an idempotent upsert.

- [ ] Write failing API tests for authentication, self-rating denial, forged reviewer input rejection, insert, update, duplicate-count stability, cross-account ownership, and aggregate calculation.
- [ ] Run the API tests and confirm the route is missing.
- [ ] Implement the authenticated upsert route, returning the persisted review and freshly queried aggregate.
- [ ] Write the mobile dialog test for star selection, optional review, loading, cancel, successful visible update, account switch, and server error.
- [ ] Implement the shared Radix rating dialog and client-owned profile rating state; label ratings as community feedback and replace the false completed-transaction empty-state copy.
- [ ] Run focused Vitest and Chromium/WebKit harness tests.

### Task 5: One account-scoped live notification system

**Files:**
- Create: `components/notification-center.tsx`
- Modify: `components/notification-bell.tsx`
- Modify: `components/header.tsx`
- Modify: `components/mobile-nav.tsx` only if shared state is needed for an accessible badge label
- Modify: `app/layout.tsx`
- Modify: `app/api/notifications/route.ts`
- Modify: `app/api/conversations/[id]/messages/route.ts`
- Modify: `components/notifications-list.tsx`
- Create: `app/test-harness/notifications/page.tsx`
- Create: `tests/notification-api.test.ts`
- Create: `tests/e2e/notifications-safe.spec.ts`

**Interfaces:**
- Consumes: owner-only notification API/RLS, the existing message notification trigger, filtered Supabase Postgres Changes, and conversation read receipts.
- Produces: one root provider exposing items, unread count, connection state, read actions, and toast lifecycle to desktop/mobile consumers.

- [ ] Write failing unit/API tests for owner-scoped fetch/read, conversation-specific message notification clearing, duplicate merges, reconnect reconciliation, and account reset.
- [ ] Run the focused tests and confirm the missing behavior fails.
- [ ] Implement the provider with one user-filtered subscription, auth-change teardown/reset, visibility/online reconciliation, and deduplicated INSERT/UPDATE handling.
- [ ] Refactor the bell/list to consume shared state, mark clicked items read, and render a safe clickable toast above the mobile safe area.
- [ ] Add a compact mobile header containing the existing bell while leaving the five-item bottom navigation intact.
- [ ] Update conversation read handling to clear only that user's unread message notifications for that conversation.
- [ ] Add mocked browser scenarios for buyer→seller, seller→buyer, no self-notification, badge/read clearing, duplicate events, reconnect, navigation, and Account A→B isolation; run Chromium and WebKit.

### Task 6: Cross-feature regression and production verification

**Files:**
- Modify only tests/docs if failures expose an in-scope regression.

- [ ] Search production client code and confirm no new direct `crypto.randomUUID()` calls, unsafe HTML sinks, broad Realtime subscription, or unvalidated reviewer identity were introduced.
- [ ] Run all focused Vitest suites, then `npm test`.
- [ ] Run the affected Playwright specs in Chromium and WebKit using only test harnesses/mocks unless an explicitly isolated Supabase target is verified.
- [ ] Run `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Review the implementation line-by-line against the design and report any unmet runtime checks, unapplied migration, missing tools, and physical-iPhone/hosted-Supabase limitations.

