# Smart Chat Notifications — Implementation Plan

1. Add failing unit tests for a pure active-conversation notification classifier: stable ID matching, visible/focused/live requirements, hidden/blur/disconnect behavior, other routes, duplicate events, and independent tab state.
2. Add a ref-backed active-conversation registry and notification presentation decision helpers with no timers or network work.
3. Integrate the registry into `NotificationCenter`; suppress only active foreground message presentation and reconcile local read state with the existing API.
4. Register `ChatInterface` by stable conversation ID and live channel status; make read reconciliation run after reconnect/visibility recovery and notify the center on both success and failure.
5. Extend notification API payloads with the existing `entity_id` only if required by the final classifier; do not add a migration or query. Prefer the exact conversation route already stored in `href`.
6. Add a safe notification-awareness harness and Chromium/WebKit Playwright coverage for active, inactive, hidden, blurred, switched, duplicate, and reconnect cases.
7. Run focused tests, then TypeScript, ESLint, all Vitest, focused Chromium/WebKit Playwright, production build, `next start` response smoke tests, and `git diff --check`.
8. Review the complete diff and staged files, confirm no secrets/generated files/unrelated changes, commit, and push only `feat/smart-chat-notifications`.
