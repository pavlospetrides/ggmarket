"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useHydrated } from "./use-hydrated";

export function ListingViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    void fetch("/api/recently-viewed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
  }, [listingId]);
  return null;
}

export function ListingClientTools({ title }: { title: string }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<"" | "copied" | "error">("");

  async function share() {
    setStatus("");
    try {
      if (navigator.share) {
        await navigator.share({ title, url: location.href });
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(location.href);
      setStatus("copied");
      window.setTimeout(() => setStatus(""), 1_800);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setStatus("error");
    }
  }

  return (
    <span className="inline-flex min-h-11 flex-col items-start justify-center">
      <button type="button" onClick={share} disabled={!hydrated} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-white disabled:opacity-60">
        {status === "copied" ? <Check className="size-4 shrink-0 text-[var(--success)]" aria-hidden="true" /> : <Share2 className="size-4 shrink-0" aria-hidden="true" />}
        <span>{status === "copied" ? "Link copied" : "Share"}</span>
      </button>
      <span aria-live="polite" className={status === "error" ? "text-xs text-[var(--danger)]" : "sr-only"}>
        {status === "error" ? "Sharing is unavailable. Copy the address from your browser." : status === "copied" ? "Listing link copied." : ""}
      </span>
    </span>
  );
}
