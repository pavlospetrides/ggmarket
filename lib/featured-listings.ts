import { isFeatureEnabled } from "./feature-flags";
import type { Listing } from "./types";

type FeaturedCandidate = { id: string; seller: { id: string } };

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function rotateFeaturedListings<T extends FeaturedCandidate>(
  candidates: readonly T[],
  rotationDay: string,
  limit: number,
): T[] {
  const ordered = [...candidates].sort((left, right) => {
    const score = stableHash(`${rotationDay}:${left.seller.id}:${left.id}`) - stableHash(`${rotationDay}:${right.seller.id}:${right.id}`);
    return score || left.id.localeCompare(right.id);
  });
  const sellers = new Set<string>();
  const result: T[] = [];
  for (const candidate of ordered) {
    if (sellers.has(candidate.seller.id)) continue;
    sellers.add(candidate.seller.id);
    result.push(candidate);
    if (result.length >= Math.max(0, limit)) break;
  }
  return result;
}

function athensRotationDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export async function getFeaturedListings(options: { limit?: number; categoryId?: string; now?: Date } = {}): Promise<Listing[]> {
  if (!isFeatureEnabled("FEATURED_LISTINGS_ENABLED")) return [];
  const [{ getListing }, { createClient }] = await Promise.all([import("./data"), import("./supabase/server")]);
  const supabase = await createClient();
  if (!supabase) return [];
  const now = options.now ?? new Date();
  await supabase.rpc("expire_featured_campaigns");
  const { data, error } = await supabase
    .from("active_featured_listings")
    .select("listing_id")
    .gt("expires_at", now.toISOString())
    .order("starts_at", { ascending: true })
    .limit(60);
  if (error || !data?.length) return [];
  const loaded = await Promise.all(data.map((campaign) => getListing(campaign.listing_id)));
  const eligible = loaded.filter((listing): listing is Listing => Boolean(listing))
    .filter((listing) => !options.categoryId || listing.category.id === options.categoryId)
    .map((listing) => ({ ...listing, featured: true }));
  return rotateFeaturedListings(eligible, athensRotationDay(now), options.limit ?? 8);
}

