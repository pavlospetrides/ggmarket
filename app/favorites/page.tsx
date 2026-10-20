import type { Metadata } from "next";
import { FavoriteListings } from "@/components/favorite-listings";
import { requireUser } from "@/lib/auth";
import { getFavoriteListings } from "@/lib/data";
export const metadata: Metadata = { title: "Favorites", robots: { index: false } };
export default async function FavoritesPage() {
  const user = await requireUser("/favorites");
  const items = await getFavoriteListings(user.id);
  return (
    <div className="container-page min-w-0 py-8 md:py-12">
      <FavoriteListings key={user.id} listings={items} viewerId={user.id} />
    </div>
  );
}
