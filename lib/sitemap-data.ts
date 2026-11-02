import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { CategoryRow, ListingRow, ProfileRow } from "./sitemap-public";
import { SITEMAP_PAGE_SIZE } from "./sitemap-public";

class SitemapDataError extends Error {
  constructor(operation: string) {
    super(`Unable to ${operation}.`);
    this.name = "SitemapDataError";
  }
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new SitemapDataError("connect to the public sitemap data source");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getPublicSitemapCounts() {
  const supabase = publicClient();
  const [listings, profiles] = await Promise.all([
    supabase
      .from("listings")
      .select("id,seller:profiles!listings_seller_id_fkey!inner(id)", { count: "exact", head: true })
      .eq("status", "active")
      .is("seller.suspended_at", null),
    supabase
      .from("profiles")
      .select("id,listings:listings!listings_seller_id_fkey!inner(id)", { count: "exact", head: true })
      .is("suspended_at", null)
      .eq("listings.status", "active"),
  ]);
  if (listings.error || profiles.error) throw new SitemapDataError("count public sitemap records");
  return {
    listingCount: listings.count ?? 0,
    profileCount: profiles.count ?? 0,
  };
}

export async function getPublicSitemapCategories(): Promise<CategoryRow[]> {
  const { data, error } = await publicClient()
    .from("categories")
    .select("name,slug,active")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new SitemapDataError("load public sitemap categories");
  return (data ?? []) as CategoryRow[];
}

function pageRange(page: number) {
  const start = (page - 1) * SITEMAP_PAGE_SIZE;
  return { start, end: start + SITEMAP_PAGE_SIZE - 1 };
}

export async function getPublicListingSitemapRows(page: number): Promise<ListingRow[]> {
  const { start, end } = pageRange(page);
  const { data, error } = await publicClient()
    .from("listings")
    .select("id,status,published_at,updated_at,seller:profiles!listings_seller_id_fkey!inner(suspended_at)")
    .eq("status", "active")
    .is("seller.suspended_at", null)
    .order("id")
    .range(start, end);
  if (error) throw new SitemapDataError("load public listing sitemap records");
  return (data ?? []) as unknown as ListingRow[];
}

export async function getPublicProfileSitemapRows(page: number): Promise<ProfileRow[]> {
  const { start, end } = pageRange(page);
  const { data, error } = await publicClient()
    .from("profiles")
    .select("username,suspended_at,updated_at,listings:listings!listings_seller_id_fkey!inner(status,updated_at)")
    .is("suspended_at", null)
    .eq("listings.status", "active")
    .order("username")
    .range(start, end);
  if (error) throw new SitemapDataError("load public profile sitemap records");
  return (data ?? []) as unknown as ProfileRow[];
}
