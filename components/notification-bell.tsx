"use client";
import Link from "next/link";
import { Bell, CheckCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};
export function NotificationBell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void fetch("/api/notifications")
      .then((response) => response.json())
      .then((value) => {
        if (active) setItems(value.items ?? []);
      })
      .catch(() => {
        if (active) setError("Notifications could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) =>
          setItems((current) =>
            current.some((item) => item.id === (payload.new as Notification).id)
              ? current
              : [payload.new as Notification, ...current].slice(0, 12),
          ),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnected(true);
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status))
          setConnected(false);
      });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const unread = items.filter((item) => !item.read_at).length;
  async function readAll() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Request failed");
      setItems((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );
    } catch {
      setError("Notifications could not be updated.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-10 place-items-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--surface-alt)] hover:text-white active:scale-95"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-controls="notification-panel"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-0 top-0 min-w-4 rounded-full border border-[#090c12] bg-[var(--danger)] px-1 text-[10px] font-bold shadow-md">
            {Math.min(unread, 9)}
          </span>
        )}
      </button>
      {open && (
        <div id="notification-panel" role="region" aria-labelledby="notification-panel-title" className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-1.25rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-hover)] bg-[#0e121af5] p-3 shadow-[var(--shadow-lg)] backdrop-blur-2xl [animation:pop-in_.16s_ease-out]">
          <div className="flex items-center justify-between px-2 py-1">
            <div>
              <strong id="notification-panel-title">Notifications</strong>
              <span
                className={`ml-2 text-[10px] ${connected ? "text-[var(--success)]" : "text-[var(--muted)]"}`}
                role="status"
                aria-live="polite"
              >
                {connected ? "Live" : "Reconnecting"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center"
              aria-label="Close notifications"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 max-h-96 space-y-1 overflow-auto">
            {loading ? (
              <p className="p-7 text-center text-sm text-[var(--muted)]" role="status" aria-live="polite">Loading notifications…</p>
            ) : items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href || "/notifications"}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl border border-transparent p-3 text-sm transition hover:border-[var(--border)] hover:bg-[var(--surface-alt)] ${item.read_at ? "text-[var(--muted)]" : "bg-[#1d1930]"}`}
                >
                  <strong className="block min-w-0 text-white [overflow-wrap:anywhere]">{item.title}</strong>
                  {item.body && (
                    <span className="mt-1 line-clamp-2 block [overflow-wrap:anywhere]">{item.body}</span>
                  )}
                </Link>
              ))
            ) : (
              <div className="p-7 text-center"><Bell className="mx-auto size-6 text-[#aa98ff]" aria-hidden="true" /><p className="mt-3 text-sm font-bold">You&apos;re all caught up</p><p className="mt-1 text-xs text-[var(--muted)]">New activity will appear here.</p></div>
            )}
          </div>
          {error ? <p className="px-2 py-2 text-xs text-[var(--danger)]" role="alert">{error}</p> : null}
          <div className="mt-2 flex gap-2 border-t border-[var(--border)] pt-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="btn-secondary flex-1"
            >
              View all
            </Link>
            {unread > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void readAll()}
                className="btn-secondary"
                aria-label="Mark all as read"
              >
                <CheckCheck className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
