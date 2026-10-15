"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useState, type MouseEvent } from "react";

type Item = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};
export function NotificationsList({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  async function readAll() {
    if (busy || busyItemId) return;
    setBusy(true);
    setError("");
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
      setError("Notifications could not be updated. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function openItem(event: MouseEvent<HTMLAnchorElement>, item: Item) {
    if (item.read_at) return;
    event.preventDefault();
    if (busy || busyItemId) return;
    setBusyItemId(item.id);
    setError("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      if (!response.ok) throw new Error("Request failed");
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value));
      router.push(item.href || "/notifications");
    } catch {
      setError("This notification could not be marked as read.");
    } finally {
      setBusyItemId(null);
    }
  }
  return (
    <section className="min-w-0">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]" role="status" aria-live="polite">{items.filter((item) => !item.read_at).length} unread</p>
        <button type="button" disabled={busy || busyItemId !== null || !items.some((item) => !item.read_at)} onClick={() => void readAll()} className="btn-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
          <CheckCheck className="size-4" aria-hidden="true" /> {busy ? "Updating…" : "Mark all read"}
        </button>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href || "/notifications"}
              onClick={(event) => void openItem(event, item)}
              aria-disabled={busyItemId === item.id}
              aria-busy={busyItemId === item.id}
              className={`card card-interactive relative block min-w-0 overflow-hidden p-5 ${item.read_at ? "opacity-65" : "border-[#51437f] bg-[#171329]"}`}
            >
              {!item.read_at && <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--primary)]" />}
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#211a3a] text-[#aa98ff]"><Bell className="size-[18px]" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <h2 className="font-bold [overflow-wrap:anywhere]">{item.title}</h2>
                  {item.body && (
                    <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">
                      {item.body}
                    </p>
                  )}
                  <time className="mt-2 block text-xs text-[var(--muted)]">
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="card empty-state overflow-hidden"><div className="min-w-0"><span className="empty-state-icon"><Bell aria-hidden="true" /></span><h2 className="mt-4 font-bold text-white">You&apos;re all caught up</h2><p className="mt-2 text-sm text-[var(--muted)]">Offers, messages, and saved-search matches will appear here.</p></div></div>
        )}
      </div>
    </section>
  );
}
