import { describe, expect, it } from "vitest";
import {
  SITEMAP_PAGE_SIZE,
  buildPublicCategoryEntries,
  buildPublicListingEntries,
  buildPublicProfileEntries,
  buildSitemapIndexUrls,
  buildStaticPublicEntries,
  parseSitemapPage,
  renderSitemapIndex,
  renderUrlSet,
  sitemapPageCount,
} from "../lib/sitemap-public";
import { buildMarketplaceMetadata } from "../lib/site-metadata";

describe("public sitemap data", () => {
  it("includes active categories at self-canonical marketplace URLs only", () => {
    expect(buildPublicCategoryEntries([
      { name: "PC Components", slug: "pc-components", active: true },
      { name: "Hidden", slug: "hidden", active: false },
    ])).toEqual([{
      url: "https://lootriva.com/marketplace?category=pc-components",
      changeFrequency: "daily",
      priority: 0.8,
    }]);
  });

  it("includes only active listings with an RLS-visible seller relationship", () => {
    expect(buildPublicListingEntries([
      { id: "active", status: "active", published_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", seller: { id: "seller-id" } },
      { id: "draft", status: "draft", published_at: null, updated_at: "2026-10-03T00:00:00Z", seller: { id: "seller-id" } },
      { id: "removed", status: "removed", published_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", seller: { id: "seller-id" } },
      { id: "hidden-seller", status: "active", published_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", seller: null },
    ])).toEqual([{
      url: "https://lootriva.com/listing/active",
      lastModified: new Date("2026-10-03T00:00:00Z"),
      changeFrequency: "daily",
      priority: 0.7,
    }]);
  });

  it("includes only RLS-visible sellers who have an active listing", () => {
    expect(buildPublicProfileEntries([
      { username: "public-seller", updated_at: "2026-10-02T00:00:00Z", listings: [{ status: "active", updated_at: "2026-10-04T00:00:00Z" }] },
      { username: "no-public-listings", updated_at: "2026-10-02T00:00:00Z", listings: [{ status: "draft", updated_at: "2026-10-04T00:00:00Z" }] },
    ])).toEqual([{
      url: "https://lootriva.com/profile/public-seller",
      lastModified: new Date("2026-10-04T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.6,
    }]);
  });

  it("paginates inventories below the protocol limit and rejects invalid pages", () => {
    expect(SITEMAP_PAGE_SIZE).toBe(1000);
    expect(sitemapPageCount(0)).toBe(0);
    expect(sitemapPageCount(1000)).toBe(1);
    expect(sitemapPageCount(1001)).toBe(2);
    expect(parseSitemapPage("2.xml")).toBe(2);
    expect(parseSitemapPage("0.xml")).toBeNull();
    expect(parseSitemapPage("2")).toBeNull();
    expect(parseSitemapPage("invalid.xml")).toBeNull();
  });

  it("builds a canonical sitemap index without preview or localhost URLs", () => {
    const urls = buildSitemapIndexUrls({ listingCount: 1001, profileCount: 1 });
    expect(urls).toEqual([
      "https://lootriva.com/pages/sitemap.xml",
      "https://lootriva.com/sitemaps/listings/1.xml",
      "https://lootriva.com/sitemaps/listings/2.xml",
      "https://lootriva.com/sitemaps/profiles/1.xml",
    ]);
    const xml = renderSitemapIndex(urls);
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("https://lootriva.com/pages/sitemap.xml");
    expect(xml).not.toMatch(/localhost|vercel\.app/i);
  });

  it("keeps the stable public pages in the pages sitemap", () => {
    expect(buildStaticPublicEntries().map((entry) => entry.url)).toEqual([
      "https://lootriva.com/",
      "https://lootriva.com/browse",
      "https://lootriva.com/marketplace",
      "https://lootriva.com/privacy",
      "https://lootriva.com/cookies",
    ]);
  });

  it("renders a valid URL set without leaking fields beyond sitemap metadata", () => {
    const xml = renderUrlSet(buildPublicListingEntries([
      { id: "listing-id", status: "active", published_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", seller: { id: "seller-id" } },
    ]));
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://lootriva.com/listing/listing-id</loc>");
    expect(xml).toContain("<lastmod>2026-10-03T00:00:00.000Z</lastmod>");
    expect(xml).not.toMatch(/seller|suspended|published_at|updated_at/);
  });
});

describe("category canonical metadata", () => {
  it("resolves complete canonical, Open Graph, and Twitter metadata", () => {
    expect(buildMarketplaceMetadata({ name: "PC Components", slug: "pc-components" })).toMatchObject({
      title: "PC Components marketplace",
      description: "Browse PC Components listings, trades, and wanted posts on GGMarket.",
      alternates: { canonical: "https://lootriva.com/marketplace?category=pc-components" },
      openGraph: {
        title: "PC Components marketplace",
        url: "https://lootriva.com/marketplace?category=pc-components",
        siteName: "GGMarket",
        images: [{ url: "https://lootriva.com/brand/ggmarket-open-graph.png" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "PC Components marketplace",
        images: ["https://lootriva.com/brand/ggmarket-open-graph.png"],
      },
    });
  });
});
