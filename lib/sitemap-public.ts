import type { MetadataRoute } from "next";
import { buildCanonicalUrl } from "./site-url";

export const SITEMAP_PAGE_SIZE = 1000;

const STATIC_PUBLIC_ROUTES = ["/", "/browse", "/marketplace", "/privacy", "/cookies"] as const;

export type CategoryRow = { name: string; slug: string; active: boolean };
type SellerVisibility = { suspended_at: string | null };
export type ListingRow = {
  id: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  seller: SellerVisibility | SellerVisibility[] | null;
};
type ProfileListingRow = { status: string; updated_at: string };
export type ProfileRow = {
  username: string;
  suspended_at: string | null;
  updated_at: string;
  listings: ProfileListingRow[] | ProfileListingRow | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asArray<T>(value: T | T[] | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function buildPublicCategoryEntries(rows: CategoryRow[]): MetadataRoute.Sitemap {
  return rows
    .filter((row) => row.active)
    .map((row) => ({
      url: buildCanonicalUrl(`/marketplace?category=${encodeURIComponent(row.slug)}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
}

export function buildStaticPublicEntries(): MetadataRoute.Sitemap {
  return STATIC_PUBLIC_ROUTES.map((route) => ({
    url: buildCanonicalUrl(route),
    changeFrequency: route === "/" || route === "/marketplace" ? "daily" : "monthly",
    priority: route === "/" ? 1 : route === "/marketplace" ? 0.9 : 0.6,
  }));
}

export function buildPublicListingEntries(rows: ListingRow[]): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    const seller = first(row.seller);
    if (row.status !== "active" || !seller || seller.suspended_at) return [];
    return [{
      url: buildCanonicalUrl(`/listing/${encodeURIComponent(row.id)}`),
      lastModified: new Date(row.updated_at || row.published_at || 0),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }];
  });
}

export function buildPublicProfileEntries(rows: ProfileRow[]): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    const activeListings = asArray(row.listings).filter((listing) => listing.status === "active");
    if (row.suspended_at || !activeListings.length) return [];
    const lastModified = activeListings.reduce(
      (latest, listing) => listing.updated_at > latest ? listing.updated_at : latest,
      row.updated_at,
    );
    return [{
      url: buildCanonicalUrl(`/profile/${encodeURIComponent(row.username)}`),
      lastModified: new Date(lastModified),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }];
  });
}

export function sitemapPageCount(total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.ceil(total / SITEMAP_PAGE_SIZE);
}

export function parseSitemapPage(value: string) {
  const match = /^([1-9]\d*)\.xml$/.exec(value);
  if (!match) return null;
  const page = Number(match[1]);
  return Number.isSafeInteger(page) ? page : null;
}

export function buildSitemapIndexUrls(counts: { listingCount: number; profileCount: number }) {
  const listingUrls = Array.from(
    { length: sitemapPageCount(counts.listingCount) },
    (_, index) => buildCanonicalUrl(`/sitemaps/listings/${index + 1}.xml`),
  );
  const profileUrls = Array.from(
    { length: sitemapPageCount(counts.profileCount) },
    (_, index) => buildCanonicalUrl(`/sitemaps/profiles/${index + 1}.xml`),
  );
  return [buildCanonicalUrl("/pages/sitemap.xml"), ...listingUrls, ...profileUrls];
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderSitemapIndex(urls: string[]) {
  const entries = urls.map((url) => `  <sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
}

export function renderUrlSet(entries: MetadataRoute.Sitemap) {
  const urls = entries.map((entry) => {
    const lastModified = entry.lastModified
      ? `<lastmod>${escapeXml(new Date(entry.lastModified).toISOString())}</lastmod>`
      : "";
    const changeFrequency = entry.changeFrequency
      ? `<changefreq>${entry.changeFrequency}</changefreq>`
      : "";
    const priority = entry.priority == null ? "" : `<priority>${entry.priority}</priority>`;
    return `  <url><loc>${escapeXml(entry.url)}</loc>${lastModified}${changeFrequency}${priority}</url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
