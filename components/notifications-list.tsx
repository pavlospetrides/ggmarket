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
  async function readAll() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!response.ok) { setError("Notifications could not be updated."); return; }
    setItems((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
  }
  async function openItem(event: MouseEvent<HTMLAnchorElement>, item: Item) {
    if (item.read_at) return;
    event.preventDefault();
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    if (!response.ok) { setError("This notification could not be marked as read."); return; }
    setItems((current) => current.map((value) => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value));
    router.push(item.href || "/notifications");
  }
  return (
    <section>
      <div className="mb-4 flex items-center justify-between"><p className="text-sm text-[var(--muted)]">{items.filter((item) => !item.read_at).length} unread</p>
        <button type="button" disabled={!items.some((item) => !item.read_at)} onClick={readAll} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">
          <CheckCheck className="size-4" /> Mark all read
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
              className={`card card-interactive relative block overflow-hidden p-5 ${item.read_at ? "opacity-65" : "border-[#51437f] bg-[#171329]"}`}
            >
              {!item.read_at && <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--primary)]" />}
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#211a3a] text-[#aa98ff]"><Bell className="size-[18px]" /></span>
                <div>
                  <h2 className="font-bold">{item.title}</h2>
                  {item.body && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
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
          <div className="card empty-state"><div><span className="empty-state-icon"><Bell /></span><h2 className="mt-4 font-bold text-white">You&apos;re all caught up</h2><p className="mt-2 text-sm text-[var(--muted)]">Offers, messages, and saved-search matches will appear here.</p></div></div>
        )}
      </div>
    </section>
  );
}
