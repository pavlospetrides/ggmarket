import { beforeEach, describe, expect, it, vi } from "vitest";

const sitemapData = vi.hoisted(() => ({
  getPublicSitemapCounts: vi.fn(),
  getPublicSitemapCategories: vi.fn(),
  getPublicListingSitemapRows: vi.fn(),
  getPublicProfileSitemapRows: vi.fn(),
}));

vi.mock("@/lib/sitemap-data", () => sitemapData);
vi.mock("@/lib/sitemap-public", async () => await import("../lib/sitemap-public"));

describe("sitemap routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sitemapData.getPublicSitemapCounts.mockResolvedValue({ listingCount: 1, profileCount: 1 });
    sitemapData.getPublicSitemapCategories.mockResolvedValue([]);
    sitemapData.getPublicListingSitemapRows.mockResolvedValue([]);
    sitemapData.getPublicProfileSitemapRows.mockResolvedValue([]);
  });

  it("serves a canonical root sitemap index", async () => {
    const { GET } = await import("../app/sitemap.xml/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    const xml = await response.text();
    expect(xml).toContain("https://ggmarket.eu/pages/sitemap.xml");
    expect(xml).toContain("https://ggmarket.eu/sitemaps/listings/1.xml");
    expect(xml).toContain("https://ggmarket.eu/sitemaps/profiles/1.xml");
    expect(xml).not.toMatch(/localhost|vercel\.app/i);
  });

  it("serves only public listing URLs and returns 404 for invalid pages", async () => {
    sitemapData.getPublicListingSitemapRows.mockResolvedValueOnce([
      { id: "public-listing", status: "active", published_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-03T00:00:00Z", seller: { suspended_at: null } },
      { id: "draft-listing", status: "draft", published_at: null, updated_at: "2026-10-03T00:00:00Z", seller: { suspended_at: null } },
    ]);
    const { GET } = await import("../app/sitemaps/listings/[page]/route");
    const response = await GET(new Request("https://ggmarket.eu/sitemaps/listings/1.xml"), {
      params: Promise.resolve({ page: "1.xml" }),
    });
    expect(response.status).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("/listing/public-listing");
    expect(xml).not.toContain("draft-listing");

    const invalid = await GET(new Request("https://ggmarket.eu/sitemaps/listings/0.xml"), {
      params: Promise.resolve({ page: "0.xml" }),
    });
    expect(invalid.status).toBe(404);
  });

  it("serves only public seller profile URLs", async () => {
    sitemapData.getPublicProfileSitemapRows.mockResolvedValueOnce([
      { username: "public-seller", suspended_at: null, updated_at: "2026-10-02T00:00:00Z", listings: [{ status: "active", updated_at: "2026-10-04T00:00:00Z" }] },
      { username: "private-account", suspended_at: null, updated_at: "2026-10-02T00:00:00Z", listings: [] },
    ]);
    const { GET } = await import("../app/sitemaps/profiles/[page]/route");
    const response = await GET(new Request("https://ggmarket.eu/sitemaps/profiles/1.xml"), {
      params: Promise.resolve({ page: "1.xml" }),
    });
    const xml = await response.text();
    expect(xml).toContain("/profile/public-seller");
    expect(xml).not.toContain("private-account");
  });

  it("keeps pages and active category URLs in a metadata sitemap", async () => {
    sitemapData.getPublicSitemapCategories.mockResolvedValueOnce([
      { name: "Games", slug: "games", active: true },
      { name: "Hidden", slug: "hidden", active: false },
    ]);
    const { default: sitemap } = await import("../app/pages/sitemap");
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("https://ggmarket.eu/");
    expect(urls).toContain("https://ggmarket.eu/marketplace?category=games");
    expect(urls).not.toContain("https://ggmarket.eu/marketplace?category=hidden");
  });
});
