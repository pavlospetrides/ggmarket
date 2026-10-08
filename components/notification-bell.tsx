"use client";
import Link from "next/link";
import { Bell, CheckCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void fetch("/api/notifications")
      .then((response) => response.json())
      .then((value) => {
        if (active) setItems(value.items ?? []);
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
  const unread = items.filter((item) => !item.read_at).length;
  async function readAll() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (response.ok)
      setItems((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-10 place-items-center rounded-xl hover:bg-[var(--surface-2)]"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-0 top-0 min-w-4 rounded-full bg-[#ff6375] px-1 text-[10px] font-bold">
            {Math.min(unread, 9)}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-1.25rem))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1">
            <div>
              <strong>Notifications</strong>
              <span
                className={`ml-2 text-[10px] ${connected ? "text-[var(--success)]" : "text-[var(--muted)]"}`}
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
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2 max-h-96 space-y-1 overflow-auto">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href || "/notifications"}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl p-3 text-sm ${item.read_at ? "text-[var(--muted)]" : "bg-[#1d1930]"}`}
                >
                  <strong className="block text-white">{item.title}</strong>
                  {item.body && (
                    <span className="mt-1 line-clamp-2 block">{item.body}</span>
                  )}
                </Link>
              ))
            ) : (
              <p className="p-6 text-center text-sm text-[var(--muted)]">
                No notifications yet.
              </p>
            )}
          </div>
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
                onClick={readAll}
                className="btn-secondary"
                aria-label="Mark all as read"
              >
                <CheckCheck className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
