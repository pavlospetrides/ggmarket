import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { createClient as createServerClient } from "./supabase/server";
import { normalizeListingPage } from "./pagination";
import { resolveTaxonomyQuery } from "./gaming-taxonomy";
import type { Category, Listing, ListingQuery, PaginatedListings, Review, Seller } from "./types";

export class DataAccessError extends Error {
  constructor(public operation: string) {
    super(`Unable to ${operation}.`);
    this.name = "DataAccessError";
  }
}

type Related<T> = T | T[] | null;
type ListingRow = {
  id: string;
  title: string;
  description: string;
  price: number | string;
  currency: string;
  location: string;
  condition: Listing["condition"];
  status: Listing["status"];
  attributes: Record<string, string | number | boolean>;
  view_count: number;
  shipping_available: boolean;
  meetup_available: boolean;
  created_at: string;
  published_at: string | null;
  category: Related<{ id: string; name: string; slug: string; icon: string }>;
  seller: Related<{
    id: string;
    username: string;
    display_name: string;
    avatar_path: string | null;
    location: string | null;
    bio: string | null;
    created_at: string;
  }>;
  images: { id: string; storage_path: string; sort_order: number }[];
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  location: string | null;
  bio: string | null;
  created_at: string;
};
const listingSelect =
  "id,title,description,price,currency,location,condition,status,attributes,view_count,shipping_available,meetup_available,created_at,published_at,category:categories!listings_category_id_fkey!inner(id,name,slug,icon),seller:profiles!listings_seller_id_fkey!inner(id,username,display_name,avatar_path,location,bio,created_at),images:listing_images!listing_images_listing_id_fkey(id,storage_path,sort_order)";
const one = <T>(value: Related<T>): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

function publicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new DataAccessError("connect to the marketplace");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function enrichRows(
  supabase: SupabaseClient,
  rows: ListingRow[],
): Promise<Listing[]> {
  const sellerIds = [
    ...new Set(
      rows.flatMap((row) => {
        const seller = one(row.seller);
        return seller ? [seller.id] : [];
      }),
    ),
  ];
  const [
    { data: reviews, error: reviewsError },
    { data: verifications, error: verificationError },
  ] = await Promise.all([
    sellerIds.length
      ? supabase
          .from("reviews")
          .select("seller_id,rating")
          .in("seller_id", sellerIds)
      : Promise.resolve({ data: [], error: null }),
    sellerIds.length
      ? supabase
          .from("seller_verifications")
          .select("seller_id")
          .eq("status", "verified")
          .in("seller_id", sellerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (reviewsError || verificationError)
    throw new DataAccessError("load seller details");
  const imagePaths = [...new Set(rows.flatMap((row) => row.images.map((image) => image.storage_path)))];
  const signedImages = new Map<string, string>();
  const signedResults = await Promise.all(
    imagePaths.map(async (path) => ({
      path,
      result: await supabase.storage.from("listing-images").createSignedUrl(path, 3600),
    })),
  );
  for (const { path, result } of signedResults) {
    if (result.error || !result.data?.signedUrl) throw new DataAccessError("load listing images");
    signedImages.set(path, result.data.signedUrl);
  }
  const ratings = new Map<string, number[]>();
  for (const review of reviews ?? [])
    ratings.set(review.seller_id, [
      ...(ratings.get(review.seller_id) ?? []),
      Number(review.rating),
    ]);
  const verified = new Set((verifications ?? []).map((item) => item.seller_id));
  return rows.flatMap((row) => {
    const category = one(row.category);
    const profile = one(row.seller);
    if (!category || !profile) return [];
    const sellerRatings = ratings.get(profile.id) ?? [];
    const seller: Seller = {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_path ?? undefined,
      location: profile.location ?? undefined,
      bio: profile.bio ?? undefined,
      rating: sellerRatings.length
        ? sellerRatings.reduce((sum, rating) => sum + rating, 0) /
          sellerRatings.length
        : 0,
      reviewCount: sellerRatings.length,
      verified: verified.has(profile.id),
      memberSince: profile.created_at,
    };
    const imageRecords = row.images
      .toSorted((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({
        id: image.id,
        path: image.storage_path,
        url: signedImages.get(image.storage_path)!,
      }));
    const images = imageRecords.map((image) => image.url);
    return [
      {
        id: row.id,
        slug: row.id,
        title: row.title,
        description: row.description,
        price: Number(row.price),
        currency: row.currency,
        location: row.location,
        condition: row.condition,
        status: row.status,
        category,
        images,
        seller,
        createdAt: row.published_at ?? row.created_at,
        views: row.view_count,
        shipping: row.shipping_available,
        meetup: row.meetup_available,
        attributes: row.attributes,
        imageRecords,
      } satisfies Listing,
    ];
  });
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await publicClient()
    .from("categories")
    .select("id,name,slug,icon")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new DataAccessError("load categories");
  return data;
}

export async function getListings(
  params: ListingQuery = {},
  limit = 48,
): Promise<Listing[]> {
  return (await getPaginatedListings(params, limit)).items;
}

export async function getPaginatedListings(
  params: ListingQuery = {},
  pageSize = 24,
): Promise<PaginatedListings> {
  const supabase = publicClient();
  const taxonomyQuery = resolveTaxonomyQuery(params);
  const term = taxonomyQuery.residualQuery.slice(0, 120);
  let matchingIds: string[] | null = null;
  if (term) {
    const { data, error } = await supabase.rpc("search_listings", {
      search_term: term,
      category_slug: taxonomyQuery.category ?? null,
      min_price:
        typeof params.min === "string" && params.min
          ? Number(params.min)
          : null,
      max_price:
        typeof params.max === "string" && params.max
          ? Number(params.max)
          : null,
    });
    if (error) throw new DataAccessError("search listings");
    const ids = (data ?? []).map((row: { id: string }) => row.id);
    if (!ids.length) return { items: [], total: 0, page: 1, pageSize };
    matchingIds = ids;
  }

  // The search RPC returns relevance-ordered IDs. Apply the remaining filters
  // first, then paginate that ordered ID set so relevance is not lost to `.in()`.
  if (matchingIds && !params.sort) {
    let eligibleQuery = supabase
      .from("listings")
      .select("id, profiles!listings_seller_id_fkey!inner(seller_type)")
      .eq("status", "active")
      .in("id", matchingIds);
    if (typeof params.condition === "string" && params.condition)
      eligibleQuery = eligibleQuery.eq("condition", params.condition);
    if (typeof params.location === "string" && params.location)
      eligibleQuery = eligibleQuery.ilike("location", `%${params.location.slice(0, 80)}%`);
    if (typeof params.seller === "string" && params.seller)
      eligibleQuery = eligibleQuery.eq("profiles.seller_type", params.seller);
    if (typeof params.intent === "string" && params.intent)
      eligibleQuery = eligibleQuery.contains("attributes", { intent: params.intent });
    for (const filter of taxonomyQuery.filters)
      eligibleQuery = eligibleQuery.contains("attributes", { [filter.key]: filter.mode === "array" ? [filter.value] : filter.value });
    const { data: eligibleRows, error: eligibleError } = await eligibleQuery.limit(1000);
    if (eligibleError) throw new DataAccessError("load listings");
    const eligible = new Set((eligibleRows ?? []).map((row: { id: string }) => row.id));
    const orderedIds = matchingIds.filter((id) => eligible.has(id));
    const total = orderedIds.length;
    const page = normalizeListingPage(params.page, total, pageSize);
    const pageIds = orderedIds.slice((page - 1) * pageSize, page * pageSize);
    if (!pageIds.length) return { items: [], total, page, pageSize };
    const { data, error } = await supabase
      .from("listings")
      .select(listingSelect)
      .in("id", pageIds);
    if (error) throw new DataAccessError("load listings");
    const enriched = await enrichRows(supabase, data as unknown as ListingRow[]);
    const itemById = new Map(enriched.map((item) => [item.id, item]));
    return {
      items: pageIds.flatMap((id) => itemById.get(id) ? [itemById.get(id)!] : []),
      total,
      page,
      pageSize,
    };
  }

  let query = supabase
    .from("listings")
    .select(listingSelect, { count: "exact" })
    .eq("status", "active");
  if (matchingIds) query = query.in("id", matchingIds);
  if (!term && taxonomyQuery.category)
    query = query.eq("categories.slug", taxonomyQuery.category);
  if (typeof params.condition === "string" && params.condition)
    query = query.eq("condition", params.condition);
  if (typeof params.location === "string" && params.location)
    query = query.ilike("location", `%${params.location.slice(0, 80)}%`);
  if (typeof params.seller === "string" && params.seller)
    query = query.eq("profiles.seller_type", params.seller);
  if (typeof params.intent === "string" && params.intent)
    query = query.contains("attributes", { intent: params.intent });
  for (const filter of taxonomyQuery.filters)
    query = query.contains("attributes", { [filter.key]: filter.mode === "array" ? [filter.value] : filter.value });
  if (!term && typeof params.min === "string" && params.min)
    query = query.gte("price", Number(params.min));
  if (!term && typeof params.max === "string" && params.max)
    query = query.lte("price", Number(params.max));
  if (params.sort === "price-asc")
    query = query.order("price", { ascending: true });
  else if (params.sort === "price-desc")
    query = query.order("price", { ascending: false });
  else if (params.sort === "oldest")
    query = query.order("published_at", { ascending: true });
  else query = query.order("published_at", { ascending: false });
  query = query.order("id", { ascending: true });

  // Count before choosing the range so out-of-bounds requests can resolve to
  // the final valid page rather than showing a misleading empty state.
  const { count, error: countError } = await query.limit(0);
  if (countError) throw new DataAccessError("load listings");
  const total = count ?? 0;
  const page = normalizeListingPage(params.page, total, pageSize);
  const from = (page - 1) * pageSize;
  const { data, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new DataAccessError("load listings");
  return {
    items: await enrichRows(supabase, data as unknown as ListingRow[]),
    total,
    page,
    pageSize,
  };
}

export type BrowseData = {
  fresh: Listing[];
  popular: Listing[];
  retro: Listing[];
  trades: Listing[];
  wanted: Listing[];
  recentlyViewed: Listing[];
  recommended: Listing[];
  personalizedRecommendations: boolean;
};

export async function getBrowseData(userId?: string): Promise<BrowseData> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("listings")
    .select(listingSelect)
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .order("sort_order", { referencedTable: "listing_images", ascending: true })
    .limit(1, { referencedTable: "listing_images" })
    .limit(48);
  if (error) throw new DataAccessError("load discovery listings");

  const pool = await enrichRows(supabase, data as unknown as ListingRow[]);
  let recentlyViewed: Listing[] = [];
  if (userId) {
    const server = await createServerClient();
    if (server) {
      const recentResult = await server
        .from("recently_viewed")
        .select("listing_id")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(10);
      if (recentResult.error)
        throw new DataAccessError("load recently viewed listings");
      const recentIds = recentResult.data.map((item) => item.listing_id);
      if (recentIds.length) {
        const recentListings = await server
          .from("listings")
          .select(listingSelect)
          .in("id", recentIds)
          .eq("status", "active")
          .order("sort_order", { referencedTable: "listing_images", ascending: true })
          .limit(1, { referencedTable: "listing_images" });
        if (recentListings.error)
          throw new DataAccessError("load recently viewed listings");
        const enriched = await enrichRows(
          server,
          recentListings.data as unknown as ListingRow[],
        );
        const byId = new Map(enriched.map((listing) => [listing.id, listing]));
        recentlyViewed = recentIds.flatMap((id) => {
          const listing = byId.get(id);
          return listing ? [listing] : [];
        });
      }
    }
  }

  const popular = [...pool]
    .toSorted((a, b) => b.views - a.views || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 10);
  const recentCategory = recentlyViewed[0]?.category.id;
  const recentIds = new Set(recentlyViewed.map((listing) => listing.id));
  const personalized = recentCategory
    ? pool.filter(
        (listing) => listing.category.id === recentCategory && !recentIds.has(listing.id),
      )
    : [];

  return {
    fresh: pool.slice(0, 12),
    popular,
    retro: pool
      .filter((listing) => /retro|classic/i.test(`${listing.category.slug} ${listing.category.name}`))
      .slice(0, 6),
    trades: pool
      .filter((listing) => ["trade", "sale_or_trade"].includes(String(listing.attributes.intent)))
      .slice(0, 6),
    wanted: pool
      .filter((listing) => listing.attributes.intent === "wanted")
      .slice(0, 6),
    recentlyViewed,
    recommended: (personalized.length ? personalized : popular).slice(0, 10),
    personalizedRecommendations: personalized.length > 0,
  };
}

export async function getListing(
  id: string,
  includeOwnedPrivate = false,
): Promise<Listing | null> {
  const supabase = includeOwnedPrivate
    ? await createServerClient()
    : publicClient();
  if (!supabase) throw new DataAccessError("connect to the marketplace");
  let query = supabase.from("listings").select(listingSelect).eq("id", id);
  if (!includeOwnedPrivate) query = query.eq("status", "active");
  const { data, error } = await query.maybeSingle();
  if (error) throw new DataAccessError("load listing");
  if (!data) return null;
  return (
    (await enrichRows(supabase, [data as unknown as ListingRow]))[0] ?? null
  );
}

export async function getProfileByUsername(
  username: string,
  listingPageInput: string | undefined = undefined,
  reviewPageInput: string | undefined = undefined,
): Promise<{
  seller: Seller;
  listings: Listing[];
  reviews: Review[];
  stats: { activeListings: number; soldListings: number | null; totalViews: number };
  pagination: {
    listings: { page: number; total: number; pageSize: number };
    reviews: { page: number; total: number; pageSize: number };
  };
} | null> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_path,location,bio,created_at")
    .ilike("username", username)
    .maybeSingle();
  if (error) throw new DataAccessError("load seller profile");
  if (!data) return null;
  const profile = data as ProfileRow;
  const listingPageSize = 12;
  const reviewPageSize = 10;
  const requestedListingPage = Math.max(1, Number.parseInt(listingPageInput ?? "1", 10) || 1);
  const requestedReviewPage = Math.max(1, Number.parseInt(reviewPageInput ?? "1", 10) || 1);
  let { data: rows, error: listingError, count: listingCount } = await supabase
    .from("listings")
    .select(listingSelect, { count: "exact" })
    .eq("seller_id", profile.id)
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .range((requestedListingPage - 1) * listingPageSize, requestedListingPage * listingPageSize - 1);
  let { data: reviewRows, error: reviewError, count: reviewCount } = await supabase
    .from("reviews")
    .select(
      "id,reviewer_id,rating,comment,created_at,reviewer:profiles!reviews_reviewer_id_fkey(display_name)",
      { count: "exact" },
    )
    .eq("seller_id", profile.id)
    .order("created_at", { ascending: false })
    .range((requestedReviewPage - 1) * reviewPageSize, requestedReviewPage * reviewPageSize - 1);
  const listingPage = normalizeListingPage(listingPageInput, listingCount ?? 0, listingPageSize);
  const reviewPage = normalizeListingPage(reviewPageInput, reviewCount ?? 0, reviewPageSize);
  if (listingPage !== requestedListingPage) {
    const retry = await supabase
      .from("listings")
      .select(listingSelect, { count: "exact" })
      .eq("seller_id", profile.id)
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .range((listingPage - 1) * listingPageSize, listingPage * listingPageSize - 1);
    rows = retry.data;
    listingError = retry.error;
    listingCount = retry.count;
  }
  if (reviewPage !== requestedReviewPage) {
    const retry = await supabase
      .from("reviews")
      .select(
        "id,reviewer_id,rating,comment,created_at,reviewer:profiles!reviews_reviewer_id_fkey(display_name)",
        { count: "exact" },
      )
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false })
      .range((reviewPage - 1) * reviewPageSize, reviewPage * reviewPageSize - 1);
    reviewRows = retry.data;
    reviewError = retry.error;
    reviewCount = retry.count;
  }
  const [{ data: verification, error: verificationError }, { data: ratingRows, error: ratingError }] = await Promise.all([
    supabase
      .from("seller_verifications")
      .select("id")
      .eq("seller_id", profile.id)
      .eq("status", "verified")
      .limit(1)
      .maybeSingle(),
    supabase.from("reviews").select("rating").eq("seller_id", profile.id).limit(1000),
  ]);
  if (listingError || reviewError || verificationError || ratingError)
    throw new DataAccessError("load seller activity");
  const ratings = (ratingRows ?? []).map((review) => Number(review.rating));
  const seller: Seller = {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_path ?? undefined,
    location: profile.location ?? undefined,
    bio: profile.bio ?? undefined,
    rating: ratings.length
      ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
      : 0,
    reviewCount: reviewCount ?? ratings.length,
    verified: Boolean(verification),
    memberSince: profile.created_at,
  };
  const sellerListings = await enrichRows(
    supabase,
    (rows ?? []) as unknown as ListingRow[],
  );
  const mappedReviews: Review[] = (reviewRows ?? []).map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment ?? undefined,
    createdAt: review.created_at,
    reviewerName:
      one(review.reviewer as Related<{ display_name: string }>)?.display_name ??
      "GGMarket member",
    reviewerId: review.reviewer_id,
  }));
  const { data: statsData } = await supabase.rpc("seller_marketplace_stats", {
    target_seller: profile.id,
  });
  const rawStats =
    statsData && typeof statsData === "object" && !Array.isArray(statsData)
      ? (statsData as Record<string, unknown>)
      : {};
  const stats = {
    activeListings: Number(rawStats.activeListings ?? sellerListings.length),
    soldListings: rawStats.soldListings == null ? null : Number(rawStats.soldListings),
    totalViews: Number(
      rawStats.totalViews ??
        sellerListings.reduce((sum, item) => sum + item.views, 0),
    ),
  };
  return {
    seller,
    listings: sellerListings,
    reviews: mappedReviews,
    stats,
    pagination: {
      listings: { page: listingPage, total: listingCount ?? sellerListings.length, pageSize: listingPageSize },
      reviews: { page: reviewPage, total: reviewCount ?? mappedReviews.length, pageSize: reviewPageSize },
    },
  };
}

export async function getCurrentProfile(userId: string): Promise<ProfileRow> {
  const supabase = await createServerClient();
  if (!supabase) throw new DataAccessError("connect to your account");
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_path,location,bio,created_at")
    .eq("id", userId)
    .single();
  if (error) throw new DataAccessError("load your profile");
  return data;
}

export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const supabase = await createServerClient();
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw new DataAccessError("load favorites");
  return new Set(data.map((item) => item.listing_id));
}

export async function getFavoriteListings(userId: string): Promise<Listing[]> {
  const ids = [...(await getFavoriteIds(userId))];
  if (!ids.length) return [];
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("listings")
    .select(listingSelect)
    .in("id", ids)
    .eq("status", "active")
    .limit(60);
  if (error) throw new DataAccessError("load favorite listings");
  return (await enrichRows(supabase, data as unknown as ListingRow[])).map(
    (listing) => ({ ...listing, isFavorite: true }),
  );
}

export async function getOwnListings(userId: string): Promise<Listing[]> {
  const supabase = await createServerClient();
  if (!supabase) throw new DataAccessError("connect to your listings");
  const { data, error } = await supabase
    .from("listings")
    .select(listingSelect)
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new DataAccessError("load your listings");
  return enrichRows(supabase, data as unknown as ListingRow[]);
}

export async function getListingExtras(listing: Listing) {
  const supabase = publicClient();
  const [
    { data: favoriteCount },
    { data: identity },
    { data: similarRows },
    { data: otherRows },
  ] = await Promise.all([
    supabase.rpc("listing_favorite_count", { target_listing: listing.id }),
    supabase
      .from("listings")
      .select("product_id")
      .eq("id", listing.id)
      .single(),
    supabase
      .from("listings")
      .select(listingSelect)
      .eq("status", "active")
      .eq("category_id", listing.category.id)
      .neq("id", listing.id)
      .order("published_at", { ascending: false })
      .limit(4),
    supabase
      .from("listings")
      .select(listingSelect)
      .eq("status", "active")
      .eq("seller_id", listing.seller.id)
      .neq("id", listing.id)
      .order("published_at", { ascending: false })
      .limit(4),
  ]);
  let priceInsight: {
    average: number;
    median: number;
    min: number;
    max: number;
    available: number;
    belowTypical: boolean;
  } | null = null;
  if (identity?.product_id) {
    const { data: prices } = await supabase
      .from("listings")
      .select("price")
      .eq("product_id", identity.product_id)
      .eq("status", "active")
      .order("price");
    if (prices && prices.length >= 3) {
      const values = prices.map((item) => Number(item.price));
      const middle = Math.floor(values.length / 2);
      const median =
        values.length % 2
          ? values[middle]
          : (values[middle - 1] + values[middle]) / 2;
      priceInsight = {
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        median,
        min: values[0],
        max: values.at(-1)!,
        available: values.length,
        belowTypical: listing.price < median * 0.9,
      };
    }
  }
  return {
    favoriteCount: Number(favoriteCount ?? 0),
    priceInsight,
    similar: await enrichRows(
      supabase,
      (similarRows ?? []) as unknown as ListingRow[],
    ),
    other: await enrichRows(
      supabase,
      (otherRows ?? []) as unknown as ListingRow[],
    ),
  };
}
