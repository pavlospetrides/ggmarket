"use client";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useHydrated } from "./use-hydrated";
import { Loader2 } from "./ui/loader-2";

export function MessageSellerButton({
  listingId,
  loggedIn,
  iconOnly = false,
  label = "Message seller",
}: {
  listingId: string;
  loggedIn: boolean;
  iconOnly?: boolean;
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
    <form action="/api/conversations" method="post" onSubmit={start} className={iconOnly ? "relative shrink-0" : "block min-w-0"}>
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        aria-label={iconOnly ? (busy ? "Opening conversation…" : label) : undefined}
        title={iconOnly ? label : undefined}
        className={iconOnly
          ? "grid size-11 shrink-0 touch-manipulation place-items-center rounded-full bg-[var(--primary)] p-0 text-white transition-colors hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-wait disabled:opacity-70"
          : "btn-primary mt-6 min-w-0 w-full"}
      >
        {busy ? (
          <Loader2 size="compact" delayed decorative className="shrink-0" />
        ) : (
          <MessageCircle
            className={iconOnly ? "size-[21px] shrink-0" : "size-4 shrink-0"}
            aria-hidden="true"
          />
        )}
        <span className={iconOnly ? "sr-only" : "min-w-0 [overflow-wrap:anywhere]"}>
          {busy ? "Opening…" : label}
        </span>
      </button>
      {error && (
        <span role="alert" className={iconOnly ? "absolute right-0 top-full z-10 mt-2 block w-[min(16rem,calc(100vw-2rem))] rounded-lg bg-[var(--surface-elevated)] p-2 text-xs text-[var(--danger)] shadow-lg [overflow-wrap:anywhere]" : "mt-2 block text-xs text-[var(--danger)] [overflow-wrap:anywhere]"}>
          {error}
        </span>
      )}
    </form>
  );
}
