import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAdminUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAdminUser: mocks.getAdminUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc: mocks.rpc })) }));

function request(body: unknown, method = "PATCH") {
  return new Request("https://lootriva.test/api/admin/seller-growth", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("founder and promotion admin actions", () => {
  beforeEach(() => { vi.resetModules(); mocks.getAdminUser.mockReset(); mocks.rpc.mockReset(); });

  it("rejects a non-admin before database access", async () => {
    mocks.getAdminUser.mockResolvedValue(null);
    const { PATCH } = await import("../app/api/admin/seller-growth/route");
    const response = await PATCH(request({ entityType: "entitlement", entityId: "11111111-1111-4111-8111-111111111111", action: "suspend", reason: "Account review" }));
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("passes a validated decision to the database without trusting actor identity", async () => {
    mocks.getAdminUser.mockResolvedValue({ id: "admin-a" });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const { PATCH } = await import("../app/api/admin/seller-growth/route");
    const response = await PATCH(request({ entityType: "entitlement", entityId: "11111111-1111-4111-8111-111111111111", action: "revoke", reason: "Promotion policy violation", adminId: "seller-a" }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_manage_seller_growth", { target_type: "entitlement", target_id: "11111111-1111-4111-8111-111111111111", admin_action: "revoke", reason_text: "Promotion policy violation" });
  });

  it("allows only an admin to run retry-safe referral qualification", async () => {
    mocks.getAdminUser.mockResolvedValue({ id: "admin-a" });
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    const { POST } = await import("../app/api/admin/seller-growth/route");
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ awarded: 2 });
    expect(mocks.rpc).toHaveBeenCalledWith("qualify_referrals");
  });
});

