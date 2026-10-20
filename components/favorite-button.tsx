"use client";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { favoriteStore } from "@/lib/favorite-state";

export function FavoriteButton({ viewerId, listingId, initialFavorite = false, className = "", onFavoriteChange }: { viewerId: string | null; listingId: string; initialFavorite?: boolean; className?: string; onFavoriteChange?: (listingId: string, active: boolean) => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const serverSnapshot = useMemo(() => ({ active: initialFavorite, busy: false, error: "" }), [initialFavorite]);
  const subscribe = useCallback((listener: () => void) => favoriteStore.subscribe(viewerId, listingId, listener), [listingId, viewerId]);
  const getSnapshot = useCallback(() => favoriteStore.getSnapshot(viewerId, listingId, initialFavorite), [initialFavorite, listingId, viewerId]);
  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    favoriteStore.syncFromServer(viewerId, listingId, initialFavorite);
  }, [initialFavorite, listingId, viewerId]);

  async function toggle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    const operationViewer = viewerId;
    let operation = favoriteStore.beginToggle(operationViewer, listingId, initialFavorite);
    onFavoriteChange?.(listingId, favoriteStore.getSnapshot(operationViewer, listingId, initialFavorite).active);
    if (!operation) return;
    while (operation) {
      const currentOperation = operation;
      try {
        const response = await fetch("/api/favorites", { method: currentOperation.next ? "POST" : "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId }) });
        if (response.status === 401) {
          favoriteStore.rollback(operationViewer, listingId, currentOperation.previous, "");
          if (formRef.current?.dataset.viewerId === (operationViewer ?? "")) {
            onFavoriteChange?.(listingId, currentOperation.previous);
            const nextPath = `${window.location.pathname}${window.location.search}`;
            router.push(`/login?next=${encodeURIComponent(nextPath)}`);
          }
          return;
        }
        const result = await response.json().catch(() => ({})) as { favorite?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not update favorite");
        operation = favoriteStore.confirm(operationViewer, listingId, result.favorite ?? currentOperation.next);
        if (formRef.current?.dataset.viewerId === (operationViewer ?? "")) {
          onFavoriteChange?.(listingId, favoriteStore.getSnapshot(operationViewer, listingId, initialFavorite).active);
        }
      } catch (reason) {
        favoriteStore.rollback(operationViewer, listingId, currentOperation.previous, reason instanceof Error ? reason.message : "Could not update favorite");
        if (formRef.current?.dataset.viewerId === (operationViewer ?? "")) onFavoriteChange?.(listingId, currentOperation.previous);
        return;
      }
    }
  }
  return <form ref={formRef} data-viewer-id={viewerId ?? ""} action="/api/favorites" method="post" onSubmit={toggle} className={className}><input type="hidden" name="listingId" value={listingId} /><input type="hidden" name="intent" value={snapshot.active ? "remove" : "add"} /><button type="submit" aria-label={snapshot.active ? "Remove from favorites" : "Add to favorites"} aria-pressed={snapshot.active} aria-busy={snapshot.busy} data-favorite-state={snapshot.active ? "selected" : "unselected"} className="grid size-11 shrink-0 touch-manipulation place-items-center rounded-full border border-white/10 bg-[#090c13] text-[var(--text-secondary)] transition-[transform,background-color,border-color] hover:scale-105 hover:border-white/20 hover:bg-[var(--surface-elevated)] motion-reduce:transform-none"><Heart aria-hidden="true" className={`size-5 transition-transform ${snapshot.active ? "scale-110 fill-[#ff6978] text-[#ff6978]" : "fill-transparent text-white"}`} /></button>{snapshot.error && <span className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-[80] w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 rounded-xl border border-[#ff6978]/30 bg-[#29151af2] px-4 py-3 text-center text-sm text-[#ffc1c7] shadow-xl md:bottom-6" role="alert">{snapshot.error}</span>}</form>;
}
