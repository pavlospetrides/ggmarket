import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_HASH = "s".repeat(64);
const PENDING_COOKIE = "ggmarket-signup-confirmation-pending";
const mocks = vi.hoisted(() => ({
  auth: { verifyOtp: vi.fn(), getUser: vi.fn(), signOut: vi.fn() },
  rpc: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

function postRequest(token = TOKEN_HASH, origin = "https://ggmarket.test") {
  return new Request(`${origin}/auth/confirm-signup/verify`, {
    method: "POST",
    headers: { cookie: `${PENDING_COOKIE}=${token}`, origin },
  });
}

describe("scanner-safe signup confirmation", () => {
  beforeEach(() => {
    Object.values(mocks.auth).forEach((mock) => mock.mockReset());
    mocks.rpc.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ auth: mocks.auth, rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    vi.unstubAllEnvs();
  });

  it("stages a typed token on GET without consuming it", async () => {
    const { GET } = await import("../app/auth/confirm-signup/route");
    const response = await GET(new Request(`https://ggmarket.test/auth/confirm-signup?token_hash=${TOKEN_HASH}&type=email`));

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://ggmarket.test/auth/confirm-signup/continue");
    expect(response.headers.get("set-cookie")).toContain(`${PENDING_COOKIE}=${TOKEN_HASH}`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("samesite=lax");
    expect(response.headers.get("set-cookie")?.toLowerCase()).not.toContain("samesite=none");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it.each([
    ["missing", `https://ggmarket.test/auth/confirm-signup?type=email`],
    ["malformed", `https://ggmarket.test/auth/confirm-signup?token_hash=short&type=email`],
    ["wrong type", `https://ggmarket.test/auth/confirm-signup?token_hash=${TOKEN_HASH}&type=recovery`],
  ])("rejects %s GET links without storing or consuming", async (_label, url) => {
    const { GET } = await import("../app/auth/confirm-signup/route");
    const response = await GET(new Request(url));
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=invalid");
  });

  it("verifies only email tokens after a same-origin POST and reaches welcome", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: {}, user: { id: "user-1", email_confirmed_at: "2026-11-05T10:00:00Z" } }, error: null });
    const { POST } = await import("../app/auth/confirm-signup/verify/route");
    const response = await POST(postRequest());
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: TOKEN_HASH, type: "email" });
    expect(response.headers.get("location")).toBe("https://ggmarket.test/settings/verification?status=verified&welcome=1");
    expect(response.headers.get("set-cookie")).toContain(`${PENDING_COOKIE}=;`);
  });

  it("refuses cross-site POSTs before token consumption", async () => {
    const request = postRequest();
    request.headers.set("origin", "https://attacker.example");
    const { POST } = await import("../app/auth/confirm-signup/verify/route");
    const response = await POST(request);
    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=invalid");
  });

  it("reports an expired or reused signed-out link without account enumeration", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: { code: "otp_expired" } });
    const { POST } = await import("../app/auth/confirm-signup/verify/route");
    const response = await POST(postRequest());
    expect(response.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=expired_or_used");
  });

  it("offers an already-verified continuation only for a confirmed current session", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: { code: "otp_expired" } });
    mocks.auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-11-05T10:00:00Z" } }, error: null });
    const { POST } = await import("../app/auth/confirm-signup/verify/route");
    const response = await POST(postRequest());
    expect(response.headers.get("location")).toBe("https://ggmarket.test/settings/verification?status=already_verified");
  });

  it("signs out a newly confirmed inactive account and fails closed", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: {}, user: { id: "user-1", email_confirmed_at: "2026-11-05T10:00:00Z" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const { POST } = await import("../app/auth/confirm-signup/verify/route");
    const response = await POST(postRequest());
    expect(mocks.auth.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=unavailable");
  });

  it("fails safely when the pending cookie or provider is unavailable", async () => {
    const { POST } = await import("../app/auth/confirm-signup/verify/route");
    const missing = await POST(new Request("https://ggmarket.test/auth/confirm-signup/verify", { method: "POST", headers: { origin: "https://ggmarket.test" } }));
    expect(missing.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=invalid");
    mocks.createClient.mockResolvedValue(null);
    const unavailable = await POST(postRequest());
    expect(unavailable.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=unavailable");
  });
});
