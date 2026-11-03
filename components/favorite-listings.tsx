"use client";

import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { useCallback, useState } from "react";
import type { Listing } from "@/lib/types";
import { FavoriteLanyardCollection } from "./favorite-lanyard-collection";
import { PageMasthead } from "./page-masthead";
import { BrowsingStateRestorer } from "./listing-navigation";

export function FavoriteListings({ listings, viewerId }: { listings: Listing[]; viewerId: string }) {
  const [visible, setVisible] = useState(listings);
  const [favoriteError, setFavoriteError] = useState("");
  const updateFavorite = useCallback((listingId: string, active: boolean) => {
    setVisible((current) => {
      if (!active) return current.filter((listing) => listing.id !== listingId);
      if (current.some((listing) => listing.id === listingId)) return current;
      const visibleIds = new Set([...current.map((listing) => listing.id), listingId]);
      return listings.filter((listing) => visibleIds.has(listing.id));
    });
  }, [listings]);

  return <>
    <BrowsingStateRestorer />
    <PageMasthead eyebrow="Saved for later" title="Favorites" description={visible.length ? `${visible.length} saved ${visible.length === 1 ? "listing" : "listings"}. Keep your next find close.` : "Your shortlist starts with a heart."} variant="identity" actions={visible.length > 0 ? <Link href="/marketplace" className="btn-secondary">Keep browsing <ArrowUpRight className="size-4" aria-hidden="true" /></Link> : undefined} />
    {favoriteError ? <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-[80] w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 rounded-xl border border-[#ff6978]/30 bg-[#29151af2] px-4 py-3 text-center text-sm text-[#ffc1c7] shadow-xl md:bottom-6" role="alert">{favoriteError}</div> : null}
    {visible.length ? <FavoriteLanyardCollection listings={visible} viewerId={viewerId} onFavoriteChange={updateFavorite} onFavoriteError={setFavoriteError} /> : (
      <div className="grid min-h-80 place-items-center rounded-[var(--radius-xl)] bg-[var(--surface)] p-6 text-center sm:p-10">
        <div className="min-w-0 max-w-md">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--primary-hover)]"><Heart className="size-6" aria-hidden="true" /></span>
          <h2 className="mt-5 text-2xl font-bold">Nothing saved yet</h2>
          <p className="mt-3 leading-7 text-[var(--text-secondary)]">Tap the heart on a listing to save it here. Compare your favorites whenever you are ready.</p>
          <Link className="btn-primary mt-6" href="/marketplace">Explore listings</Link>
        </div>
      </div>
    )}
  </>;
}
