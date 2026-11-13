import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getAdminUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUser: mocks.getUser,
  getAdminUser: mocks.getAdminUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("seller verification mutation authorization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SELLER_VERIFICATION_ENABLED", "true");
    mocks.getUser.mockReset();
    mocks.getAdminUser.mockReset();
    mocks.rpc.mockReset();
  });

  it("rejects an unauthenticated application without database access", async () => {
    mocks.getUser.mockResolvedValue(null);
    const { POST } = await import("../app/api/seller-growth/verification/route");
    const response = await POST(jsonRequest("https://lootriva.test/api/seller-growth/verification", "POST", { statement: "I sell my own gaming items and keep listings accurate." }));
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("derives the applicant from auth and sends only the seller statement", async () => {
    mocks.getUser.mockResolvedValue({ id: "seller-a" });
    mocks.rpc.mockResolvedValue({ data: { id: "application-a", status: "pending" }, error: null });
    const { POST } = await import("../app/api/seller-growth/verification/route");
    const response = await POST(jsonRequest("https://lootriva.test/api/seller-growth/verification", "POST", {
      statement: "  I sell my own gaming items and keep listings accurate.  ",
      sellerId: "seller-b",
      status: "verified",
    }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("submit_seller_verification", {
      application_text: "I sell my own gaming items and keep listings accurate.",
    });
  });

  it("returns only seller-safe fields and never returns a private reviewer note", async () => {
    mocks.getUser.mockResolvedValue({ id: "seller-a" });
    mocks.rpc.mockResolvedValue({ data: { id: "application-a", seller_id: "seller-a", status: "pending", reviewer_note: "Private staff note", reviewed_by: "admin-a" }, error: null });
    const { POST } = await import("../app/api/seller-growth/verification/route");
    const response = await POST(jsonRequest("https://ggmarket.test/api/seller-growth/verification", "POST", { statement: "I sell my own gaming items and describe them accurately." }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ application: { id: "application-a", seller_id: "seller-a", status: "pending" } });
  });

  it("reports a pending or approved duplicate without creating another application", async () => {
    mocks.getUser.mockResolvedValue({ id: "seller-a" });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23505" } });
    const { POST } = await import("../app/api/seller-growth/verification/route");
    const response = await POST(jsonRequest("https://ggmarket.test/api/seller-growth/verification", "POST", { statement: "I sell my own gaming items and describe them accurately." }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "An application is already under review or approved." });
  });

  it("returns a safe error if the database returns no application", async () => {
    mocks.getUser.mockResolvedValue({ id: "seller-a" });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const { POST } = await import("../app/api/seller-growth/verification/route");
    const response = await POST(jsonRequest("https://ggmarket.test/api/seller-growth/verification", "POST", { statement: "I sell my own gaming items and describe them accurately." }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "The application could not be confirmed. Please refresh your status before trying again." });
  });

  it("loads the seller-safe application projection without exposing reviewer notes", async () => {
    mocks.getUser.mockResolvedValue({ id: "seller-a" });
    mocks.rpc.mockResolvedValue({ data: [{ id: "application-a", seller_id: "seller-a", status: "pending" }], error: null });
    const { GET } = await import("../app/api/seller-growth/verification/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("get_my_seller_verification");
    expect(await response.json()).toEqual({ application: { id: "application-a", seller_id: "seller-a", status: "pending" } });
  });

  it("rejects ordinary users attempting an admin decision", async () => {
    mocks.getAdminUser.mockResolvedValue(null);
    const { PATCH } = await import("../app/api/admin/seller-verifications/route");
    const response = await PATCH(jsonRequest("https://lootriva.test/api/admin/seller-verifications", "PATCH", {
      applicationId: "11111111-1111-4111-8111-111111111111",
      action: "approve",
    }));
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("allows a server-authorized admin to request more information with a reason", async () => {
    mocks.getAdminUser.mockResolvedValue({ id: "admin-a" });
    mocks.rpc.mockResolvedValue({ data: { status: "more_info" }, error: null });
    const { PATCH } = await import("../app/api/admin/seller-verifications/route");
    const response = await PATCH(jsonRequest("https://lootriva.test/api/admin/seller-verifications", "PATCH", {
      applicationId: "11111111-1111-4111-8111-111111111111",
      action: "more_info",
      reason: "Please clarify how you source the listed items.",
      reviewerNote: "No documents requested.",
    }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("review_seller_verification", {
      target_application: "11111111-1111-4111-8111-111111111111",
      review_action: "more_info",
      reason_text: "Please clarify how you source the listed items.",
      private_note: "No documents requested.",
    });
  });

  it.each([
    ["approve", "", "verified"],
    ["reject", "The seller statement needs more evidence.", "rejected"],
    ["revoke", "Review was withdrawn after later activity.", "revoked"],
  ])("sends an authorized %s decision to the existing review RPC", async (action, reason, status) => {
    mocks.getAdminUser.mockResolvedValue({ id: "admin-a" });
    mocks.rpc.mockResolvedValue({ data: { status }, error: null });
    const { PATCH } = await import("../app/api/admin/seller-verifications/route");
    const response = await PATCH(jsonRequest("https://ggmarket.test/api/admin/seller-verifications", "PATCH", {
      applicationId: "11111111-1111-4111-8111-111111111111", action, reason,
    }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("review_seller_verification", {
      target_application: "11111111-1111-4111-8111-111111111111",
      review_action: action, reason_text: reason || null, private_note: null,
    });
  });
});

