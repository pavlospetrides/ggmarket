import type { Metadata } from "next";
import { cache } from "react";
import { MarketplaceBrowser } from "@/components/marketplace-browser";
import { getPaginatedListings } from "@/lib/data";
import { getCategories, getFavoriteIds } from "@/lib/data";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDeprecatedTaxonomyAttribute, sanitizeTaxonomyQueryParams } from "@/lib/gaming-taxonomy";
import { buildMarketplaceMetadata } from "@/lib/site-metadata";

const getCachedCategories = cache(getCategories);

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = typeof params.category === "string" ? params.category : null;
  if (!categorySlug) return buildMarketplaceMetadata(null);
  const category = (await getCachedCategories()).find((item) => item.slug === categorySlug) ?? null;
  if (!category) return { ...buildMarketplaceMetadata(null), robots: { index: false, follow: true } };
  return buildMarketplaceMetadata(category);
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (Object.keys(params).some(isDeprecatedTaxonomyAttribute)) {
    const query = new URLSearchParams(sanitizeTaxonomyQueryParams(params)).toString();
    redirect(query ? `/marketplace?${query}` : "/marketplace");
  }
  const [result, categories, user] = await Promise.all([getPaginatedListings(params), getCachedCategories(), getUser()]);
  const favoriteIds = user ? [...await getFavoriteIds(user.id)] : [];
  return (
    <MarketplaceBrowser
      result={result}
      params={params}
      categories={categories}
      favoriteIds={favoriteIds}
      viewerId={user?.id ?? null}
      actionPath="/marketplace"
    />
  );
}
