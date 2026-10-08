import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/marketplace-browser";
import { getListings } from "@/lib/data";
import { getCategories, getFavoriteIds } from "@/lib/data";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [items, categories, user] = await Promise.all([getListings(params), getCategories(), getUser()]);
  const favoriteIds = user ? [...await getFavoriteIds(user.id)] : [];
  return <MarketplaceBrowser items={items} params={params} categories={categories} favoriteIds={favoriteIds} />;
}
