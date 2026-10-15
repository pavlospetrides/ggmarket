import type { Listing } from "@/lib/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ListingCard } from "./listing-card";

export function ListingGrid({ listings, favoriteIds = new Set<string>(), eagerFirst = false, sparseEditorial = false }: { listings: Listing[]; favoriteIds?: Set<string>; eagerFirst?: boolean; sparseEditorial?: boolean }) {
  if (sparseEditorial && listings.length === 1) return <div className="sparse-listing-layout"><ListingCard listing={listings[0]} initialFavorite={listings[0].isFavorite || favoriteIds.has(listings[0].id)} eager={eagerFirst} /><aside className="sparse-listing-note"><h3>One fresh find</h3><p>The whole market is still open. Browse every category, save a search, or be the next gamer to add something worth finding.</p><div className="sparse-listing-actions"><Link href="/marketplace" className="btn-primary">Browse all <ArrowRight className="size-4" /></Link><Link href="/sell" className="btn-secondary">Sell your gear</Link></div></aside></div>;
  return <div className={`grid min-w-0 grid-cols-1 gap-3 sm:gap-4 ${listings.length === 1 ? "max-w-sm" : "min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>{listings.map((item, index) => <ListingCard listing={item} initialFavorite={item.isFavorite || favoriteIds.has(item.id)} eager={eagerFirst && index === 0} key={item.id} />)}</div>;
}
