# Sell Image Upload Key Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the trusted Sell Wizard image-upload pipeline when Vercel supplies Supabase's modern server-only secret key, without weakening Storage or database authorization.

**Architecture:** Keep the existing authenticated Next.js upload endpoint, server-side image decoding/normalization, private Storage bucket, and RLS policies unchanged. Centralize server-admin environment resolution so the official `SUPABASE_URL`/`SUPABASE_SECRET_KEY` variables are preferred while the existing `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` pair remains a backward-compatible fallback.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Playwright, Supabase JS/Storage.

**Spec:** User-provided “GGMARKET — CRITICAL: Fix Image Uploads in Sell Wizard” brief attached on 2026-10-30.

## Global Constraints

- Do not disable or weaken RLS, authentication, private-draft Storage access, file validation, body limits, or cross-account isolation.
- Do not expose either server key to client code, logs, browser traces, or committed fixtures.
- Do not mutate production Vercel/Supabase configuration or production data.
- Do not commit, push, merge, or deploy.
- Run state-changing browser/security tests only against a verified disposable Supabase environment.

## Review Focus

- A Vercel Marketplace deployment with only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` must create the trusted admin client.
- Existing deployments using the legacy service-role variable must continue working.
- When both key generations exist, the modern secret must take precedence to support rotation.
- Partial/missing configuration must fail closed rather than constructing a malformed privileged client.
- No server-only key may become reachable from the Sell Wizard's client bundle.

---

### Task 1: Server-only Supabase admin configuration

**Files:**
- Create: `lib/supabase/admin-config.ts`
- Modify: `lib/supabase/admin.ts`
- Create: `tests/supabase-admin-config.test.ts`

**Interfaces:**
- Consumes: server environment variables supplied by Vercel, Supabase, or local test setup.
- Produces: `resolveSupabaseAdminConfig(env): { url: string; key: string } | null` for `createAdminClient()`.

- [x] **Step 1: Write failing tests** for modern variables, legacy fallback, modern precedence, and incomplete configuration.
- [x] **Step 2: Run `npx vitest run tests/supabase-admin-config.test.ts`** and verify failure because the resolver does not exist.
- [x] **Step 3: Implement the pure resolver and update `createAdminClient()`** to consume it without changing auth options or exposing values.
- [x] **Step 4: Run the focused test and `npx vitest run tests/image-upload-security.test.ts tests/supabase-admin-config.test.ts`** and verify all pass.

### Task 2: Configuration contract and regression verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/auth/production-email-verification.md`

**Interfaces:**
- Consumes: the variable precedence implemented in Task 1.
- Produces: operator guidance matching official Supabase/Vercel variable names without including secret values.

- [x] **Step 1: Document modern variables as preferred and legacy variables as supported fallback.**
- [ ] **Step 2: Run TypeScript, ESLint, Vitest, production build, and `git diff --check`.**
- [x] **Step 3: Run safe Chromium/WebKit Sell Wizard UI tests.**
- [x] **Step 4: Run real upload, RLS, Storage, and production-server tests only if a disposable local Supabase runtime is available; otherwise record the Docker/Podman blocker and make no production mutation.**

Step 2 is partially verified: TypeScript, ESLint, Vitest, and `git diff --check` pass; production build compilation and TypeScript pass, but prerendering `/` is blocked by the intentionally absent isolated Supabase URL/anon configuration. Step 4 is blocked because Docker and Podman are not installed, so no disposable local Supabase Storage service can be started.
