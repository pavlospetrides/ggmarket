# Critical Chat Delivery and Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make authenticated buyer/seller messages persist and appear bidirectionally without refresh, including iPhone pre-hydration taps, reconnect recovery, idempotent retry, and account isolation.

**Architecture:** Keep Supabase RLS as the authorization boundary and the Next.js route handler as the authenticated write/read adapter. Give the composer a safe native POST fallback, model optimistic messages by server ID plus client ID, and reconcile from an authenticated GET after subscription, reconnect, visibility recovery, and a modest visible-page interval. Keep Realtime scoped to the active conversation and dispose it on conversation/account changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase SSR/JS v2, PostgreSQL RLS, Vitest, Playwright Chromium/WebKit.

**Spec:** `C:/Users/Pavlos/.codex/attachments/ac015c64-32f9-487d-9020-1881df7c30b0/Pasted text.txt`

## Global Constraints

- Preserve current functionality, security hardening, Supabase RLS, and unrelated dirty-worktree changes.
- Do not mutate the protected Supabase project; state-changing integration tests require the existing disposable-project guard.
- Do not alter remote Realtime/publication/RLS configuration without approval.
- Do not commit, push, deploy, upgrade dependencies, or change the lockfile.
- Both participants derive sender identity server-side; third parties remain unable to read or write messages.
- Mutations remain POST/PATCH only and retain the existing canonical-origin/CSRF proxy checks.

## Review Focus

- A Send tap before hydration must issue one POST with conversation, body, and idempotency identity; it must never mutate through GET.
- A Realtime event arriving before the POST response must replace the optimistic row exactly once by `client_id`.
- A reconnect or initial-fetch/subscription race must merge missed rows exactly once in chronological order.
- A delayed response from Account A or another conversation must not modify Account B/current-conversation state.
- A failed send must retain recoverable text, expose a retry action, and reuse the same idempotency key.

---

### Task 1: Authenticated message route and native fallback

**Files:**
- Modify: `app/api/conversations/[id]/messages/route.ts`
- Modify: `lib/validation.ts`
- Create: `tests/message-api.test.ts`

**Interfaces:**
- Produces: authenticated `GET` reconciliation and JSON/form `POST`; canonical rows include `id`, `conversation_id`, `sender_id`, `body`, `client_id`, `created_at`.
- Security: route validates the conversation UUID and body/client UUID; Supabase RLS authorizes membership and sender identity is always `getUser().id`.

- [ ] Write failing route tests for unauthenticated access, invalid conversation IDs, server-derived sender, third-party/RLS failure, duplicate idempotency scoped to the requested conversation, participant-only GET, and native form POST redirect.
- [ ] Run `npm test -- tests/message-api.test.ts` and verify the new behavior fails for the expected missing contracts.
- [ ] Implement the minimal route parsing, selection, safe form redirect/error response, and scoped duplicate lookup.
- [ ] Run `npm test -- tests/message-api.test.ts tests/conversation-api.test.ts tests/phase2-rules.test.ts` and verify green.

### Task 2: Account-scoped optimistic/reconciliation state

**Files:**
- Create: `lib/chat-state.ts`
- Create: `tests/chat-state.test.ts`
- Modify: `lib/phase2-data.ts`

**Interfaces:**
- Produces: `ChatMessage` with `clientId` and `status`; pure merge/upsert helpers keyed by viewer + conversation and deduplicated by server/client identity.
- Consumes: canonical message rows from Task 1.

- [ ] Write failing unit tests for pending→sent replacement, event-before-response deduplication, chronological ordering, failed retry retention, and rejection of stale account/conversation results.
- [ ] Run `npm test -- tests/chat-state.test.ts` and verify expected failures.
- [ ] Implement the minimal pure state helpers and include `client_id` in server data queries.
- [ ] Run the focused Vitest files and verify green.

### Task 3: Resilient chat client and dynamic active-conversation preview

**Files:**
- Modify: `components/chat-interface.tsx`
- Modify: `app/messages/[id]/page.tsx`
- Modify: `tests/task8-ui-contract.test.ts`

**Interfaces:**
- Consumes: Task 1 GET/POST contracts and Task 2 state helpers.
- Produces: native POST fallback, hydrated optimistic/pending/sent/failed UI, retry, serialized taps, Realtime cleanup, reconnect/visibility/interval reconciliation, account-scope guards, and active sidebar preview reordering.

- [ ] Add failing UI contract tests for native POST attributes, explicit button types, pending/failed/retry semantics, account/conversation scope, reconciliation triggers, and Realtime cleanup.
- [ ] Run the focused contract test and verify expected failures.
- [ ] Implement the client behavior with a server-generated initial client UUID, controlled composer text, AbortController cleanup, and reconciliation after `SUBSCRIBED` plus online/visibility/visible interval events.
- [ ] Run focused Vitest tests and verify green.

### Task 4: Isolated two-account and iPhone browser regressions

**Files:**
- Create: `app/test-harness/chat/page.tsx`
- Create: `tests/e2e/chat-messaging-safe.spec.ts`

**Interfaces:**
- Consumes: production `ChatInterface`; network routes are mocked in Playwright and never touch Supabase.
- Produces: repeatable Chromium/WebKit evidence for touch send, optimistic confirmation/failure/retry, duplicate-tap suppression, cross-page automatic reconciliation, reconnect recovery, and account-scope replacement.

- [ ] Write the browser tests against an isolated in-memory message service and verify at least one fails before the client implementation satisfies it.
- [ ] Run focused Chromium and WebKit projects, fix only confirmed behavior gaps, and verify green.
- [ ] Run the guarded real two-user suite only if `E2E_ALLOW_MUTATION=1` and the disposable project ref is configured; otherwise report it as unverified and do not mutate the configured Supabase project.

### Task 5: Final verification and evidence

**Files:**
- Modify only if verification exposes a scoped defect.

- [ ] Run focused Vitest and messaging Playwright suites.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- [ ] Inspect the final diff for unrelated changes and security regressions.
- [ ] Report root causes, fixed behaviors, exact commands/results, and remaining real-device/disposable-Supabase limitations.

