import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/marketplace-browser";
import { getPaginatedListings } from "@/lib/data";
import { getCategories, getFavoriteIds } from "@/lib/data";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDeprecatedTaxonomyAttribute, sanitizeTaxonomyQueryParams } from "@/lib/gaming-taxonomy";
import { PUBLIC_PAGE_SOCIAL_METADATA } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Gaming marketplace",
  description: "Browse gaming hardware, consoles, games, accessories, trades, and wanted listings on GGMarket.",
  ...PUBLIC_PAGE_SOCIAL_METADATA.marketplace,
};

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (Object.keys(params).some(isDeprecatedTaxonomyAttribute)) {
    const query = new URLSearchParams(sanitizeTaxonomyQueryParams(params)).toString();
    redirect(query ? `/marketplace?${query}` : "/marketplace");
  }
  const [result, categories, user] = await Promise.all([getPaginatedListings(params), getCategories(), getUser()]);
  const favoriteIds = user ? [...await getFavoriteIds(user.id)] : [];
  return <MarketplaceBrowser result={result} params={params} categories={categories} favoriteIds={favoriteIds} viewerId={user?.id ?? null} actionPath="/marketplace" />;
}
