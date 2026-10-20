import { describe, expect, it } from "vitest";
import {
  applyRealtimeNotification,
  createNotificationState,
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
});
