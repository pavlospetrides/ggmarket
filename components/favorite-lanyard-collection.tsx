"use client";

import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getFavoriteRailBatch,
  reconcileFavoriteRailState,
  toFavoriteRailItem,
  type FavoriteRailState,
} from "@/lib/favorite-rail";
import type { Listing } from "@/lib/types";
import { FavoriteListingDetail } from "./favorite-listing-detail";

const FavoriteLanyardRail = dynamic(
  () => import("./ui/favorite-lanyard-rail").then((module) => module.FavoriteLanyardRail),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[30rem] place-items-center rounded-[var(--radius-xl)] bg-[#090d15] px-6 text-center text-sm text-[var(--text-secondary)]" role="status">
        Preparing your saved collection…
      </div>
    ),
  },
);

export function FavoriteLanyardCollection({
  listings,
  viewerId,
  onFavoriteChange,
  onFavoriteError,
}: {
  listings: Listing[];
  viewerId: string;
  onFavoriteChange: (listingId: string, active: boolean) => void;
  onFavoriteError: (message: string) => void;
}) {
  const railItems = useMemo(() => listings.map(toFavoriteRailItem), [listings]);
  const listingById = useMemo(() => new Map(listings.map((listing) => [listing.id, listing])), [listings]);
  const [state, setState] = useState<FavoriteRailState>(() => ({
    batch: 0,
    activeId: railItems[0]?.id ?? null,
    flippedId: null,
  }));
  const resolved = reconcileFavoriteRailState(state, railItems);
  const batch = getFavoriteRailBatch(railItems, resolved.batch);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedListing = resolved.flippedId ? listingById.get(resolved.flippedId) ?? null : null;

  const focusBadge = useCallback((id: string | null) => {
    if (!id) return;
    window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-listing-id="${CSS.escape(id)}"] [data-favorite-badge]`)?.focus({ preventScroll: true });
    });
  }, []);

  const setFlipped = (id: string | null) => {
    setState((current) => ({ ...current, activeId: id ?? current.activeId, flippedId: id }));
    if (id) window.requestAnimationFrame(() => detailHeadingRef.current?.focus({ preventScroll: true }));
    else focusBadge(resolved.activeId);
  };

  const changeBatch = (nextBatch: number) => {
    const next = getFavoriteRailBatch(railItems, nextBatch);
    const firstId = next.items[0]?.id ?? null;
    setState({ batch: next.batch, activeId: firstId, flippedId: null });
    focusBadge(firstId);
  };

  useEffect(() => {
    if (!selectedListing) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setState((current) => ({ ...current, flippedId: null }));
      focusBadge(resolved.activeId);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [focusBadge, resolved.activeId, selectedListing]);

  return (
    <div ref={rootRef} className="space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold text-[var(--text-secondary)]" aria-live="polite">
          Showing {batch.start}–{batch.end} of {batch.total} saved {batch.total === 1 ? "listing" : "listings"}
        </p>
        {batch.batchCount > 1 ? (
          <div className="flex items-center gap-2" aria-label="Saved listing batches">
            <button type="button" className="btn-secondary min-h-11 min-w-11 px-3" disabled={batch.batch === 0} onClick={() => changeBatch(batch.batch - 1)} aria-label="Previous saved listings">
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <span className="min-w-20 text-center text-sm font-bold tabular-nums">{batch.batch + 1} / {batch.batchCount}</span>
            <button type="button" className="btn-secondary min-h-11 min-w-11 px-3" disabled={batch.batch === batch.batchCount - 1} onClick={() => changeBatch(batch.batch + 1)} aria-label="Next saved listings">
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      <FavoriteLanyardRail
        key={batch.items.map((item) => item.id).join(":")}
        items={batch.items}
        activeId={resolved.activeId}
        flippedId={resolved.flippedId}
        onActiveChange={(id) => setState((current) => ({ ...current, batch: batch.batch, activeId: id, flippedId: current.flippedId === id ? current.flippedId : null }))}
        onFlippedChange={setFlipped}
      />

      {selectedListing ? (
        <FavoriteListingDetail
          listing={selectedListing}
          viewerId={viewerId}
          onFavoriteChange={onFavoriteChange}
          onFavoriteError={onFavoriteError}
          headingRef={detailHeadingRef}
        />
      ) : null}
    </div>
  );
}
