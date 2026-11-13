# Free Seller Verification Entry Implementation Plan

> **For agentic workers:** Implement inline with test-driven development in the existing Seller Growth worktree.

**Goal:** Make the existing free seller verification review discoverable, secure, and consistent from application through admin decision and public badge.

**Architecture:** Reuse `seller_verifications` and its RPCs. Add one domain rule for application eligibility, surface status-aware entry links on Profile and Settings, refine the existing form and admin queue, and correct the RPC/view in a forward migration.

**Tech Stack:** Next.js 16, React, TypeScript, Supabase Postgres, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-free-seller-verification-entry-design.md`

## Global constraints

- Keep the existing verification records, audit history, RLS policies, and review RPC.
- Only an administrator can set `verified`; a submitted application remains `pending`.
- Show the badge only for current approved status, without implying identity checks.
- Preserve the application and database feature switches; do not change production configuration.

## Tasks

### 1. Status and application UI

- [x] Test eligibility and labels for not applied, pending, verified, more-info, rejected cooldown, revoked, and paused states.
- [x] Implement the shared status helper, Profile and Settings entry points, and the existing panel's conditional form.
- [x] Verify mobile and desktop interactions and feedback.

### 2. Database and API boundary

- [x] Test that an approved seller cannot resubmit, only the current approved status shows a badge, and existing RLS/grants remain unchanged.
- [x] Add a forward migration correcting the existing RPC and trust-signals view without new tables.
- [x] Test duplicate, unauthorized, and admin-only API behavior.

### 3. Admin and rollout

- [x] Test and limit admin action choices by application status.
- [x] Verify TypeScript, ESLint, unit tests, browser tests, and production build.
- [x] Document the migration and feature-switch activation sequence; do not deploy or merge.

Live Supabase pgTAP/RLS execution remains a staging deployment gate because Docker and the Supabase CLI are unavailable locally.
