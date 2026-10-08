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
    <span className={compact ? "" : "block"}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={`btn-primary ${compact ? "" : "mt-6 w-full"}`}
      >
        <MessageCircle className="size-4" /> {busy ? "Opening…" : label}
      </button>
      {error && (
        <span role="alert" className="mt-2 block text-xs text-[var(--danger)]">
          {error}
        </span>
      )}
    </span>
  );
}
