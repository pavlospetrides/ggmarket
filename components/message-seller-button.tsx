"use client";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useHydrated } from "./use-hydrated";

export function MessageSellerButton({
  listingId,
  loggedIn,
  compact = false,
  label = "Message seller",
}: {
  listingId: string;
  loggedIn: boolean;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start(event: FormEvent<HTMLFormElement>) {
    if (!hydrated) return;
    event.preventDefault();
    event.stopPropagation();
    if (inFlight.current) return;
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "Conversation could not be started.");
      router.push(`/messages/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Conversation could not be started.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <form action="/api/conversations" method="post" onSubmit={start} className={compact ? "min-w-0 flex-1 basis-28" : "block min-w-0"}>
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className={`btn-primary min-w-0 w-full ${compact ? "px-3" : "mt-6"}`}
      >
        <MessageCircle className="size-4 shrink-0" aria-hidden="true" /> <span className="min-w-0 [overflow-wrap:anywhere]">{busy ? "Opening…" : label}</span>
      </button>
      {error && (
        <span role="alert" className="mt-2 block text-xs text-[var(--danger)] [overflow-wrap:anywhere]">
          {error}
        </span>
      )}
    </form>
  );
}
