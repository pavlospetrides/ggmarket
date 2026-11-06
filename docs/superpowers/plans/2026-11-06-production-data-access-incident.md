# Production Data Access Incident Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore public sitemap availability without weakening profile privacy, while documenting that production marketplace listing access has recovered and remains healthy.

**Architecture:** Keep the existing anonymous Supabase client and RLS boundary. Sitemap queries will use inner profile/listing relationships as visibility gates instead of selecting the protected `profiles.suspended_at` column; PostgreSQL RLS remains the authority for excluding suspended profiles. Marketplace listing code remains unchanged because its complete production query, enrichment, and signing pipeline is currently reproducibly healthy.

**Tech Stack:** Next.js 16, TypeScript, Supabase/PostgREST, PostgreSQL RLS, Vitest, Playwright.

**Spec:** User production-incident brief and health update dated 2026-11-06.

## Global Constraints

- Do not modify the production database, RLS, grants, Storage privacy, or production configuration.
- Do not deploy, merge, backfill, or mutate production data.
- Do not expose `suspended_at`, credentials, signed URLs, cookies, user content, or service-role keys.
- Preserve active-listing and unsuspended-seller sitemap semantics through existing RLS and inner relationships.
- Make no marketplace listing-code change unless a listing failure becomes reproducible.

## Review Focus

- Anonymous sitemap queries must not select or filter the protected `profiles.suspended_at` column.
- Suspended profiles must remain excluded by profile RLS and the inner relationship.
- Profiles without active listings must remain excluded.
- Listing and profile sitemap pagination must keep the existing stable ordering and page size.
- Diagnostic logging and reports must contain sanitized codes/operations only, never query data or secrets.

---

### Task 1: RLS-compatible public sitemap queries

**Files:**
- Modify: `lib/sitemap-data.ts`
- Modify: `lib/sitemap-public.ts`
- Modify: `tests/sitemap-public-data.test.ts`
- Create: `tests/sitemap-data-security.test.ts`

**Interfaces:**
- Consumes: existing `profiles public read` RLS policy and safe anonymous profile-column grants.
- Produces: sitemap count/page queries that use inner visible profile rows without reading `suspended_at`.

- [ ] Write a failing regression proving sitemap data queries never reference `suspended_at` and retain inner seller/listing relationships.
- [ ] Run the focused sitemap tests and verify the new regression fails on current `main`.
- [ ] Remove protected-column selection/filtering and change public sitemap row types/builders to infer visibility from relation presence.
- [ ] Run sitemap, security, typecheck, and ESLint gates.
- [ ] Commit the focused fix.

### Task 2: Incident verification and delivery

**Files:**
- Create: `docs/audits/2026-11-06-production-data-access-incident.md`
- Remove: temporary local diagnostic script before delivery unless retained as a reviewed, credential-free operational tool.

**Interfaces:**
- Consumes: Task 1 sitemap query behavior and read-only production diagnostics.
- Produces: evidence-backed incident report, clean branch, and PR against latest `main`.

- [ ] Run repeated read-only production probes for homepage, marketplace, listing detail, listing queries, signing, and all sitemap endpoints.
- [ ] Run Vitest, TypeScript, zero-warning ESLint, production build, Chromium, WebKit/mobile, dependency audit, secret scan, and `git diff --check`.
- [ ] Document the original listing incident as recovered/unconfirmed-transient unless an exact historical PostgREST error becomes available.
- [ ] Document the confirmed sitemap `42501` cause, security impact, rollback, gaps, and production GO/NO-GO.
- [ ] Review the final diff, commit, push `fix/production-listings-data-access`, and open a new PR against `main` without merging or deploying.
