"use client";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FavoriteButton({ listingId, initialFavorite = false, className = "" }: { listingId: string; initialFavorite?: boolean; className?: string }) {
  const router = useRouter(); const [active, setActive] = useState(initialFavorite); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation(); if (busy) return; setBusy(true); setError(""); const next = !active; setActive(next);
    try {
      const response = await fetch("/api/favorites", { method: next ? "POST" : "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId }) });
      if (response.status === 401) { setActive(active); router.push(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "Could not update favorite"); }
      router.refresh();
    } catch (reason) { setActive(active); setError(reason instanceof Error ? reason.message : "Could not update favorite"); } finally { setBusy(false); }
  }
  return <span className={className}><button type="button" onClick={toggle} disabled={busy} aria-label={active ? "Remove from favorites" : "Add to favorites"} aria-pressed={active} title={error || undefined} className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/55 backdrop-blur-md transition hover:scale-105 disabled:opacity-60"><Heart className={`size-5 ${active ? "fill-[#ff6375] text-[#ff6375]" : "text-white"}`} /></button>{error && <span className="sr-only" role="alert">{error}</span>}</span>;
}
