# Smart Chat Notifications — Design

## Problem and root cause

Each committed message invokes `on_message_created()`, which inserts one recipient-owned notification row. `ChatInterface` and `NotificationCenter` then receive separate Realtime events. The global notification subscriber currently cannot tell that the matching conversation is open, visible, focused, and live, so it can increment the badge and show a toast before the chat's authorized read PATCH updates that notification row.

The database notification is still the canonical cross-device unread record. It must not be skipped at insert time: doing so based on client presence could lose alerts on inactive devices or when presence is stale.

## Design

Add a small, tab-local active-conversation registry to `NotificationCenter`. `ChatInterface` registers its stable conversation ID and whether its private Realtime channel is live. The registry evaluates activity at event time using all of these conditions:

- the notification's exact `/messages/{conversationId}` target matches the registered conversation ID;
- the chat Realtime channel is subscribed;
- `document.visibilityState` is `visible`;
- `document.hasFocus()` is true.

The registered ID is cleared on conversation switch, navigation/unmount, and application close. Visibility, focus, and connection are evaluated dynamically, so hiding, blurring, or disconnecting immediately makes the view inactive without adding timers or subscriptions.

For an incoming notification in the genuinely active conversation, the center merges it once by notification ID but treats it as locally read while the existing conversation PATCH persists the read receipt. It does not increment the unread counters and does not create the in-app toast. A successful or failed read PATCH triggers reconciliation, so the server remains authoritative and a failed read cannot leave a notification silently suppressed.

Notifications for other conversations, other pages, hidden tabs, unfocused windows, and disconnected chats keep their existing unread and toast behavior. Existing account-generation checks and merge-by-ID logic continue to reject stale-account and duplicate Realtime deliveries.

## Multiple tabs and devices

Activity is deliberately tab-local. A focused tab can suppress its redundant foreground UI, while another device retains the canonical notification row and can alert according to its own state. Visibility plus focus prevents duplicate visible toasts in the normal multi-tab case without sharing a spoofable global active-conversation value.

The current service worker is an offline shell only: there are no Push API subscriptions, push handlers, browser `Notification` calls, notification sounds, or muted-conversation preferences in this repository. Therefore this change cannot claim server-side/browser-push suppression. If push is introduced later, it needs authenticated, short-lived, per-device presence and an explicit delivery policy; client-side filtering alone is insufficient.

## Security and performance

No schema, migration, RLS policy, channel authorization, membership check, or mutation permission changes. Conversation IDs are used only inside the current authenticated client. Existing API routes remain user-scoped.

The implementation adds no database query per message, polling loop, Realtime channel, or dependency. It uses one ref-backed registration and pure predicate helpers. Existing channel cleanup remains in place.

## Verification

Unit tests cover exact conversation matching, hidden visibility, focus, connection, route safety, deduplication, unread behavior, independent tabs/sessions, and account isolation. Contract tests verify integration and authorized read reconciliation. Focused Chromium/WebKit harness tests verify active, other-conversation, page, blur/return, cleanup, reconnect, and duplicate-delivery behavior without production data.
