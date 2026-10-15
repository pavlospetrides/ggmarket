"use client";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/listing/${listingId}`)}`);
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    const result = await response.json();
    if (response.ok) router.push(`/messages/${result.id}`);
    else {
      setError(result.error || "Conversation could not be started.");
      setBusy(false);
    }
  }
  return (
    <span className={compact ? "min-w-0 flex-1 basis-28" : "block min-w-0"}>
      <button
        type="button"
        onClick={start}
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
    </span>
  );
}
