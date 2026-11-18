import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  getFounderProgramStats: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUser: vi.fn(async () => null) }));
vi.mock("@/lib/data", () => ({
  getFavoriteIds: vi.fn(async () => new Set<string>()),
  getListings: vi.fn(async () => []),
}));
vi.mock("@/lib/featured-listings", () => ({
  getFeaturedListings: vi.fn(async () => []),
}));
vi.mock("@/lib/phase2-data", () => ({
  getRecentlyViewed: vi.fn(async () => []),
}));
vi.mock("@/lib/seller-growth", () => ({
  getFounderProgramStats: dependencies.getFounderProgramStats,
}));

describe("homepage seller-growth gating", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FOUNDING_SELLERS_ENABLED", "false");
    vi.stubEnv("FEATURED_LISTINGS_ENABLED", "false");
    dependencies.getFounderProgramStats.mockReset();
    dependencies.getFounderProgramStats.mockRejectedValue(
      new Error("permission denied for table founding_sellers"),
    );
  });

  it("renders without reading protected founder data while the feature is disabled", async () => {
    const { default: HomePage } = await import("../app/page");

    await expect(HomePage()).resolves.toBeTruthy();
  });
});
