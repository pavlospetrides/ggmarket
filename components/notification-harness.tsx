"use client";

import { useCallback, useMemo, useState } from "react";
import { Header } from "./header";
import { NotificationBell } from "./notification-bell";
import { NotificationContext, type NotificationContextValue } from "./notification-center";
import { countUnreadMessages, markNotificationItemsRead, type NotificationItem } from "@/lib/notification-state";

const initial: NotificationItem[] = [
  { id: "n1", type: "message", title: "First message", body: "One", href: "/messages/c1", read_at: null, created_at: "2026-10-20T10:00:00.000Z" },
  { id: "n2", type: "message", title: "Second message", body: "Two", href: "/messages/c1", read_at: null, created_at: "2026-10-20T09:00:00.000Z" },
  { id: "n3", type: "offer", title: "Offer received", body: "Three", href: "/messages/c2", read_at: null, created_at: "2026-10-20T08:00:00.000Z" },
];

export function NotificationHarness() {
  const [items, setItems] = useState(initial);
  const [error] = useState("");

  const mark = useCallback(async (ids: string[]) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) return false;
    setItems((current) => markNotificationItemsRead(current, ids, new Date().toISOString()));
    return true;
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    items,
    unread: items.filter((item) => !item.read_at).length,
    unreadMessages: countUnreadMessages(items),
    loading: false,
    connected: true,
    error,
    markRead: (id) => mark([id]),
    markAllRead: () => mark(items.filter((item) => !item.read_at).map((item) => item.id)),
    markViewed: mark,
    seed: () => {},
  }), [error, items, mark]);

  return <NotificationContext.Provider value={value}>
    <section data-notification-harness className="space-y-6">
      <div className="flex items-center gap-3"><NotificationBell panelId="harness-notifications" /><span>Panel control</span></div>
      <Header />
      <button type="button" className="btn-secondary" onClick={() => setItems((current) => [{ id: "n4", type: "message", title: "Arrived while open", body: "Four", href: "/messages/c3", read_at: null, created_at: new Date().toISOString() }, ...current])}>Simulate incoming message</button>
    </section>
  </NotificationContext.Provider>;
}
