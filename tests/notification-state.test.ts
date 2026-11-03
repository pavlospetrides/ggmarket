import { describe, expect, it } from "vitest";
import {
  applyNotificationEvent,
  applyRealtimeNotification,
  countUnreadMessages,
  createNotificationState,
  formatUnreadBadge,
  markNotificationItemsRead,
  reconcileNotificationState,
  switchNotificationAccount,
  type NotificationItem,
} from "../lib/notification-state";

const older: NotificationItem = { id: "n1", type: "message", title: "Older", body: "One", href: "/messages/c1", read_at: null, created_at: "2026-10-20T08:00:00.000Z" };
const newer: NotificationItem = { id: "n2", type: "message", title: "Newer", body: "Two", href: "/messages/c2", read_at: null, created_at: "2026-10-20T09:00:00.000Z" };

describe("account-scoped notification state", () => {
  it("deduplicates and orders reconciliation while accepting updates to existing rows", () => {
    const initial = createNotificationState("account-a", [older]);
    const reconciled = reconcileNotificationState(initial, "account-a", [newer, { ...older, read_at: "2026-10-20T10:00:00.000Z" }]);
    expect(reconciled.items.map((item) => item.id)).toEqual(["n2", "n1"]);
    expect(reconciled.items[1].read_at).toBe("2026-10-20T10:00:00.000Z");
  });

  it("ignores delayed reconciliation and realtime events from a previous account", () => {
    const accountB = switchNotificationAccount(createNotificationState("account-a", [older]), "account-b");
    expect(reconcileNotificationState(accountB, "account-a", [newer])).toBe(accountB);
    expect(applyRealtimeNotification(accountB, "account-a", newer)).toEqual({ state: accountB, isNew: false });
    expect(accountB.items).toEqual([]);
  });

  it("identifies only the first realtime delivery as new", () => {
    const initial = createNotificationState("account-a", []);
    const first = applyRealtimeNotification(initial, "account-a", newer);
    const duplicate = applyRealtimeNotification(first.state, "account-a", newer);
    expect(first.isNew).toBe(true);
    expect(duplicate.isNew).toBe(false);
    expect(duplicate.state.items).toHaveLength(1);
  });

  it("keeps an active foreground message out of toast and unread presentation", () => {
    const result = applyNotificationEvent(
      createNotificationState("account-a", []),
      "account-a",
      newer,
      { suppressForegroundMessage: true, readAt: "2026-10-20T10:00:00.000Z" },
    );

    expect(result.toast).toBeNull();
    expect(result.unreadDelta).toBe(0);
    expect(result.unreadMessagesDelta).toBe(0);
    expect(result.state.items[0].read_at).toBe("2026-10-20T10:00:00.000Z");
  });

  it("presents another conversation once and ignores duplicate delivery", () => {
    const first = applyNotificationEvent(createNotificationState("account-a", []), "account-a", newer);
    const duplicate = applyNotificationEvent(first.state, "account-a", newer);

    expect(first.toast?.id).toBe("n2");
    expect(first.unreadDelta).toBe(1);
    expect(first.unreadMessagesDelta).toBe(1);
    expect(duplicate.toast).toBeNull();
    expect(duplicate.unreadDelta).toBe(0);
    expect(duplicate.unreadMessagesDelta).toBe(0);
  });

  it("decrements unread presentation when the server marks a notification read", () => {
    const initial = createNotificationState("account-a", [newer]);
    const updated = applyNotificationEvent(initial, "account-a", { ...newer, read_at: "2026-10-20T10:00:00.000Z" });

    expect(updated.toast).toBeNull();
    expect(updated.unreadDelta).toBe(-1);
    expect(updated.unreadMessagesDelta).toBe(-1);
  });

  it("does not resurrect a toast when the first observed event is already read", () => {
    const result = applyNotificationEvent(
      createNotificationState("account-a", []),
      "account-a",
      { ...newer, read_at: "2026-10-20T10:00:00.000Z" },
    );

    expect(result.toast).toBeNull();
    expect(result.unreadDelta).toBe(0);
    expect(result.unreadMessagesDelta).toBe(0);
  });

  it("keeps A → logout → B → logout → A isolated with delayed requests", () => {
    let state = createNotificationState("account-a", [older]);
    state = switchNotificationAccount(state, null);
    state = switchNotificationAccount(state, "account-b");
    state = reconcileNotificationState(state, "account-a", [older]);
    state = applyRealtimeNotification(state, "account-a", newer).state;
    expect(state.items).toEqual([]);
    state = reconcileNotificationState(state, "account-b", [newer]);
    expect(state.items.map((item) => item.id)).toEqual(["n2"]);
    state = switchNotificationAccount(state, null);
    state = switchNotificationAccount(state, "account-a");
    expect(state.items).toEqual([]);
    state = reconcileNotificationState(state, "account-b", [newer]);
    expect(state.items).toEqual([]);
  });
  it("counts unread incoming-message rows rather than conversations or all notifications", () => {
    const items = [
      older,
      { ...newer, id: "n3", href: "/messages/c1" },
      { ...newer, id: "n4", type: "offer" },
      { ...newer, id: "n5", read_at: "2026-10-20T10:00:00.000Z" },
    ];
    expect(countUnreadMessages(items)).toBe(2);
  });

  it("marks only the panel-opening snapshot as read", () => {
    const arrivedAfterOpen = { ...newer, id: "n3" };
    const items = markNotificationItemsRead([older, newer, arrivedAfterOpen], [older.id, newer.id], "2026-10-20T10:00:00.000Z");
    expect(items.filter((item) => !item.read_at).map((item) => item.id)).toEqual([arrivedAfterOpen.id]);
  });

  it("formats compact message badge totals", () => {
    expect(formatUnreadBadge(0)).toBe("");
    expect(formatUnreadBadge(2)).toBe("2");
    expect(formatUnreadBadge(100)).toBe("99+");
  });
});
