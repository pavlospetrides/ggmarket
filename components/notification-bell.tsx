"use client";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useNotificationCenter } from "./notification-center";

export function NotificationBell({ panelId = "notification-panel" }: { panelId?: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { items, unread, connected, loading, error, markRead, markViewed } = useNotificationCenter();
  const unreadItems = items.filter((item) => !item.read_at);
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
  function togglePanel() {
    if (open) {
      setOpen(false);
      return;
    }
    const viewedIds = unreadItems.map((item) => item.id);
    setOpen(true);
    if (viewedIds.length) void markViewed(viewedIds);
  }
  async function openItem(event: MouseEvent<HTMLAnchorElement>, item: (typeof items)[number]) {
    setOpen(false);
    if (item.read_at) return;
    event.preventDefault();
    await markRead(item.id);
    router.push(item.href?.startsWith("/") && !item.href.startsWith("//") ? item.href : "/notifications");
  }
  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePanel}
        className="relative grid size-10 place-items-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--surface-alt)] hover:text-white active:scale-95"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-0 top-0 min-w-4 rounded-full border border-[#090c12] bg-[var(--danger)] px-1 text-[10px] font-bold shadow-md">
            {Math.min(unread, 9)}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} role="region" aria-labelledby={`${panelId}-title`} className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-1.25rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-hover)] bg-[#0e121af5] p-3 shadow-[var(--shadow-lg)] backdrop-blur-2xl [animation:pop-in_.16s_ease-out]">
          <div className="flex items-center justify-between px-2 py-1">
            <div>
              <strong id={`${panelId}-title`}>Notifications</strong>
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
            ) : unreadItems.length ? (
              unreadItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href || "/notifications"}
                  onClick={(event) => void openItem(event, item)}
                  className="block rounded-xl border border-transparent bg-[#1d1930] p-3 text-sm transition hover:border-[var(--border)] hover:bg-[var(--surface-alt)]"
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
              View history
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
