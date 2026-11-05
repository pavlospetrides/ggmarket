import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: {
    getClaims: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
  rpc: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

function request(values: Record<string, string>, acceptsJson = true) {
  return new Request("https://ggmarket.test/auth/update-password", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(acceptsJson ? { accept: "application/json" } : {}),
    },
    body: new URLSearchParams(values),
  });
}

describe("password update route", () => {
  beforeEach(() => {
    mocks.auth.getClaims.mockReset();
    mocks.auth.updateUser.mockReset();
    mocks.auth.signOut.mockReset();
    mocks.rpc.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ auth: mocks.auth, rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.auth.getClaims.mockResolvedValue({
      data: { claims: { amr: [{ method: "recovery", timestamp: 1 }] } },
      error: null,
    });
    mocks.auth.updateUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
    mocks.auth.signOut.mockResolvedValue({ error: null });
  });

  it("updates a valid password only inside a verified recovery session", async () => {
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "new-password" }));

    expect(mocks.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "success" });
  });

  it("rejects an ordinary authenticated session", async () => {
    mocks.auth.getClaims.mockResolvedValue({
      data: { claims: { amr: [{ method: "password", timestamp: 1 }] } },
      error: null,
    });
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "new-password" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ status: "invalid" });
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });

  it("rechecks account activity before changing the password", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "new-password" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ status: "invalid" });
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });

  it("validates both password fields before calling Supabase", async () => {
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "different" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ status: "validation", message: "Passwords do not match.", field: "confirmation" });
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });

  it("returns safe actionable feedback for a rejected password", async () => {
    mocks.auth.updateUser.mockResolvedValue({ data: { user: null }, error: { code: "same_password", message: "sensitive detail" } });
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "new-password" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ status: "rejected", message: "Choose a password you have not used before." });
  });

  it("supports a no-JavaScript form redirect after success", async () => {
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "new-password" }, false));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password?status=success");
  });

  it("preserves a safe validation reason for a no-JavaScript form", async () => {
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "different" }, false));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password?status=validation&reason=mismatch");
  });

  it("returns a safe unavailable response when claims verification throws", async () => {
    mocks.auth.getClaims.mockRejectedValue(new Error("network detail"));
    const { POST } = await import("../app/auth/update-password/route");
    const response = await POST(request({ password: "new-password", confirmation: "new-password" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });
});
