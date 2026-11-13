import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc: mocks.rpc })) }));
vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));

describe("referral attribution", () => {
  beforeEach(() => { vi.resetModules(); mocks.rpc.mockReset(); mocks.getUser.mockReset(); vi.stubEnv("REFERRAL_REWARDS_ENABLED", "true"); });

  it("accepts only canonical public referral codes", async () => {
    const { normalizeReferralCode } = await import("../lib/referrals");
    expect(normalizeReferralCode(" abcd1234ef56 ")).toBe("ABCD1234EF56");
    expect(normalizeReferralCode("bad/code")).toBeNull();
  });

  it("records an opaque server-issued visit token and redirects without the code", async () => {
    mocks.rpc.mockResolvedValue({ data: "11111111-1111-4111-8111-111111111111", error: null });
    const { GET } = await import("../app/join/route");
    const response = await GET(new Request("https://lootriva.test/join?ref=abcd1234ef56"));
    expect(mocks.rpc).toHaveBeenCalledWith("record_referral_visit", { referral_code: "ABCD1234EF56" });
    expect(response.headers.get("location")).toBe("https://lootriva.test/register");
    expect(response.headers.get("set-cookie")).toContain("lootriva-referral-visit=11111111-1111-4111-8111-111111111111");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("redeems only through the authenticated ownership-checking RPC", async () => {
    mocks.getUser.mockResolvedValue({ id: "seller-a" });
    mocks.rpc.mockResolvedValue({ data: { id: "campaign-a" }, error: null });
    const { POST } = await import("../app/api/seller-growth/referrals/route");
    const response = await POST(new Request("https://lootriva.test/api/seller-growth/referrals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rewardId: "11111111-1111-4111-8111-111111111111", listingId: "22222222-2222-4222-8222-222222222222", sellerId: "seller-b" }) }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("redeem_referral_reward", { target_reward: "11111111-1111-4111-8111-111111111111", target_listing: "22222222-2222-4222-8222-222222222222" });
  });
});
