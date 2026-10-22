"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { applyRealtimeNotification, countUnreadMessages, createNotificationState, markNotificationItemsRead, reconcileNotificationState, switchNotificationAccount, type NotificationItem, type NotificationState } from "@/lib/notification-state";
import { createClient } from "@/lib/supabase/client";

export type NotificationContextValue = {
  items: NotificationItem[];
  unread: number;
  unreadMessages: number;
  loading: boolean;
  connected: boolean;
  error: string;
  markRead: (id: string) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  markViewed: (ids: string[]) => Promise<boolean>;
  seed: (items: NotificationItem[]) => void;
};

export const NotificationContext = createContext<NotificationContextValue | null>(null);

function safeHref(href: string | null) {
  return href?.startsWith("/") && !href.startsWith("//") ? href : "/notifications";
}

export function NotificationCenter({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<NotificationState>(() => createNotificationState(null, []));
  const stateRef = useRef(state);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [unreadScope, setUnreadScope] = useState({ userId: null as string | null, count: 0, messages: 0 });
  const [error, setError] = useState("");
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const accountGeneration = useRef(0);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const reconcile = useCallback(async (userId: string, generation: number) => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const body = await response.json() as { items?: NotificationItem[]; unread?: number; unreadMessages?: number };
      if (accountGeneration.current !== generation) return;
      setState((current) => reconcileNotificationState(current, userId, body.items ?? []));
      setUnreadScope({ userId, count: Math.max(0, Number(body.unread) || 0), messages: Math.max(0, Number(body.unreadMessages) || 0) });
      setError("");
    } catch {
      if (accountGeneration.current === generation) setError("Notifications could not be loaded.");
    } finally {
      if (accountGeneration.current === generation) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;
    let authEventSeen = false;

    const activate = async (userId: string | null) => {
      const generation = ++accountGeneration.current;
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }
      if (disposed) return;
      setToast(null);
      setError("");
      setConnected(false);
      setLoading(Boolean(userId));
      setUnreadScope({ userId, count: 0, messages: 0 });
      setState((current) => {
        const next = switchNotificationAccount(current, userId);
        stateRef.current = next;
        return next;
      });
      if (!userId) return;

      void reconcile(userId, generation);
      const receive = (payload: { new: Record<string, unknown> }) => {
          if (accountGeneration.current !== generation || !("new" in payload) || !payload.new) return;
          const item = payload.new as NotificationItem;
          setState((current) => {
            const previous = current.items.find((value) => value.id === item.id);
            const result = applyRealtimeNotification(current, userId, item);
            if (result.isNew && item.type === "message") setToast(item);
            if (result.isNew && !item.read_at) {
              setUnreadScope((scope) => scope.userId === userId ? { ...scope, count: scope.count + 1, messages: scope.messages + (item.type === "message" ? 1 : 0) } : scope);
            } else if (previous && !previous.read_at && item.read_at) {
              setUnreadScope((scope) => scope.userId === userId ? { ...scope, count: Math.max(0, scope.count - 1), messages: Math.max(0, scope.messages - (item.type === "message" ? 1 : 0)) } : scope);
            }
            return result.state;
          });
        };
      channel = supabase.channel(`user-notifications:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, receive)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, receive)
        .subscribe((status) => {
          if (accountGeneration.current !== generation) return;
          if (status === "SUBSCRIBED") {
            setConnected(true);
            void reconcile(userId, generation);
          } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
            setConnected(false);
          }
        });
    };

    void supabase.auth.getUser().then(({ data }) => {
      if (!authEventSeen) void activate(data.user?.id ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      window.setTimeout(() => void activate(session?.user.id ?? null), 0);
    });
    const refresh = () => {
      const current = stateRef.current.userId;
      if (current) void reconcile(current, accountGeneration.current);
    };
    const visibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("ggmarket:notifications-changed", refresh);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      accountGeneration.current += 1;
      authListener.subscription.unsubscribe();
      window.removeEventListener("online", refresh);
      window.removeEventListener("ggmarket:notifications-changed", refresh);
      document.removeEventListener("visibilitychange", visibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [reconcile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const markRead = useCallback(async (id: string) => {
    const userId = stateRef.current.userId;
    const generation = accountGeneration.current;
    const target = stateRef.current.items.find((item) => item.id === id);
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("update failed");
      if (!userId || accountGeneration.current !== generation || stateRef.current.userId !== userId) return false;
      const wasUnread = Boolean(target && !target.read_at);
      setState((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item) }));
      if (wasUnread) setUnreadScope((scope) => scope.userId === userId ? { ...scope, count: Math.max(0, scope.count - 1), messages: Math.max(0, scope.messages - (target?.type === "message" ? 1 : 0)) } : scope);
      return true;
    } catch {
      setError("Notifications could not be updated.");
      return false;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const userId = stateRef.current.userId;
    const generation = accountGeneration.current;
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
      if (!response.ok) throw new Error("update failed");
      if (!userId || accountGeneration.current !== generation || stateRef.current.userId !== userId) return false;
      setState((current) => ({ ...current, items: markNotificationItemsRead(current.items, current.items.filter((item) => !item.read_at).map((item) => item.id), new Date().toISOString()) }));
      setUnreadScope((scope) => scope.userId === userId ? { ...scope, count: 0, messages: 0 } : scope);
      return true;
    } catch {
      setError("Notifications could not be updated.");
      return false;
    }
  }, []);

  const markViewed = useCallback(async (ids: string[]) => {
    const snapshot = [...new Set(ids)].slice(0, 80);
    if (!snapshot.length) return true;
    const userId = stateRef.current.userId;
    const generation = accountGeneration.current;
    if (!userId) return false;
    const viewedItems = stateRef.current.items.filter((item) => snapshot.includes(item.id) && !item.read_at);
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: snapshot }) });
      if (!response.ok) throw new Error("update failed");
      if (accountGeneration.current !== generation || stateRef.current.userId !== userId) return false;
      const readAt = new Date().toISOString();
      setState((current) => ({ ...current, items: markNotificationItemsRead(current.items, snapshot, readAt) }));
      setUnreadScope((scope) => scope.userId === userId ? {
        ...scope,
        count: Math.max(0, scope.count - viewedItems.length),
        messages: Math.max(0, scope.messages - countUnreadMessages(viewedItems)),
      } : scope);
      return true;
    } catch {
      setError("Notifications could not be updated.");
      void reconcile(userId, generation);
      return false;
    }
  }, [reconcile]);

  const seed = useCallback((items: NotificationItem[]) => {
    setState((current) => current.userId ? reconcileNotificationState(current, current.userId, items) : current);
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    items: state.items,
    unread: unreadScope.userId === state.userId ? unreadScope.count : 0,
    unreadMessages: unreadScope.userId === state.userId ? unreadScope.messages : 0,
    loading,
    connected,
    error,
    markRead,
    markAllRead,
    markViewed,
    seed,
  }), [connected, error, loading, markAllRead, markRead, markViewed, seed, state, unreadScope]);

  return <NotificationContext.Provider value={value}>
    {children}
    {toast ? <button type="button" className="fixed bottom-24 right-3 z-[65] flex w-[min(24rem,calc(100vw-1.5rem))] items-start gap-3 rounded-2xl border border-[#51437f] bg-[#171329] p-4 text-left shadow-[var(--shadow-lg)] md:bottom-6 md:right-6" onClick={async () => {
      await markRead(toast.id);
      setToast(null);
      router.push(safeHref(toast.href));
    }} aria-label={`Open notification: ${toast.title}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#211a3a] text-[#aa98ff]"><Bell className="size-5" aria-hidden="true" /></span>
      <span className="min-w-0"><strong className="block [overflow-wrap:anywhere]">{toast.title}</strong>{toast.body ? <span className="mt-1 line-clamp-2 block text-sm text-[var(--text-secondary)] [overflow-wrap:anywhere]">{toast.body}</span> : null}</span>
    </button> : null}
  </NotificationContext.Provider>;
}

export function useNotificationCenter() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotificationCenter must be used inside NotificationCenter");
  return value;
}
