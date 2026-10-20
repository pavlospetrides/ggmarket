import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/marketplace-browser";
import { getPaginatedListings } from "@/lib/data";
import { getCategories, getFavoriteIds } from "@/lib/data";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDeprecatedTaxonomyAttribute, sanitizeTaxonomyQueryParams } from "@/lib/gaming-taxonomy";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (Object.keys(params).some(isDeprecatedTaxonomyAttribute)) {
    const query = new URLSearchParams(sanitizeTaxonomyQueryParams(params)).toString();
    redirect(query ? `/search?${query}` : "/search");
  }
  const [result, categories, user] = await Promise.all([getPaginatedListings(params), getCategories(), getUser()]);
  const favoriteIds = user ? [...await getFavoriteIds(user.id)] : [];
  return <MarketplaceBrowser result={result} params={params} categories={categories} favoriteIds={favoriteIds} viewerId={user?.id ?? null} actionPath="/search" />;
}
