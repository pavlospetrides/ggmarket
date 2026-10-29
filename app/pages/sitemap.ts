import type { MetadataRoute } from "next";
import { getPublicSitemapCategories } from "@/lib/sitemap-data";
import { buildPublicCategoryEntries, buildStaticPublicEntries } from "@/lib/sitemap-public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = await getPublicSitemapCategories();
  return [...buildStaticPublicEntries(), ...buildPublicCategoryEntries(categories)];
}
