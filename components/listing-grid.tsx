import type { Listing } from "@/lib/types";
import { ListingCard } from "./listing-card";

export function ListingGrid({ listings, favoriteIds = new Set<string>() }: { listings: Listing[]; favoriteIds?: Set<string> }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{listings.map((item) => <ListingCard listing={item} initialFavorite={item.isFavorite || favoriteIds.has(item.id)} key={item.id} />)}</div>;
}
