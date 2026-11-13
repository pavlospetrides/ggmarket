import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc: mocks.rpc })) }));

const inventory = [
  { id: "listing-a", seller: { id: "seller-a" } },
  { id: "listing-a2", seller: { id: "seller-a" } },
  { id: "listing-b", seller: { id: "seller-b" } },
  { id: "listing-c", seller: { id: "seller-c" } },
  { id: "listing-d", seller: { id: "seller-d" } },
];

describe("featured listing rotation", () => {
  it("is deterministic within a day and never gives one seller two positions", async () => {
    const { rotateFeaturedListings } = await import("../lib/featured-listings");
    const first = rotateFeaturedListings(inventory, "2026-11-13", 4);
    const repeat = rotateFeaturedListings(inventory.toReversed(), "2026-11-13", 4);
    expect(repeat.map((item) => item.id)).toEqual(first.map((item) => item.id));
    expect(new Set(first.map((item) => item.seller.id)).size).toBe(first.length);
  });

  it("changes the leading seller over successive days", async () => {
    const { rotateFeaturedListings } = await import("../lib/featured-listings");
    const leaders = ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16"].map((day) => rotateFeaturedListings(inventory, day, 4)[0].seller.id);
    expect(new Set(leaders).size).toBeGreaterThan(1);
  });
});

describe("featured activation API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FEATURED_LISTINGS_ENABLED", "true");
    mocks.getUser.mockReset();
    mocks.rpc.mockReset();
  });

  it("rejects anonymous activation before database access", async () => {
    mocks.getUser.mockResolvedValue(null);
    const { POST } = await import("../app/api/seller-growth/featured/route");
    const response = await POST(new Request("https://lootriva.test/api/seller-growth/featured", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId: "11111111-1111-4111-8111-111111111111", entitlementId: "22222222-2222-4222-8222-222222222222" }) }));
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("passes only listing and entitlement identifiers to the ownership-checking RPC", async () => {
    mocks.getUser.mockResolvedValue({ id: "seller-a" });
    mocks.rpc.mockResolvedValue({ data: { id: "campaign-a" }, error: null });
    const { POST } = await import("../app/api/seller-growth/featured/route");
    const response = await POST(new Request("https://lootriva.test/api/seller-growth/featured", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId: "11111111-1111-4111-8111-111111111111", entitlementId: "22222222-2222-4222-8222-222222222222", sellerId: "seller-b" }) }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("activate_featured_listing", { target_listing: "11111111-1111-4111-8111-111111111111", target_entitlement: "22222222-2222-4222-8222-222222222222" });
  });
});

