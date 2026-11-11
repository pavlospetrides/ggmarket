import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN_HASH = "a".repeat(64);
const PENDING_COOKIE = "lootriva-recovery-pending";

const mocks = vi.hoisted(() => ({
  auth: { verifyOtp: vi.fn(), signOut: vi.fn() },
  rpc: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

function confirmationRequest(token = TOKEN_HASH, origin = "https://lootriva.test") {
  return new Request(`${origin}/auth/recovery/confirm`, {
    method: "POST",
    headers: {
      cookie: `${PENDING_COOKIE}=${token}`,
      origin,
    },
  });
}

describe("password recovery prefetch protection", () => {
  beforeEach(() => {
    mocks.auth.verifyOtp.mockReset();
    mocks.auth.signOut.mockReset();
    mocks.rpc.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ auth: mocks.auth, rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    vi.unstubAllEnvs();
  });

  it("does not consume a recovery token on the email-link GET", async () => {
    const { GET } = await import("../app/auth/recovery/route");
    const response = await GET(new Request(`https://lootriva.test/auth/recovery?token_hash=${TOKEN_HASH}&type=recovery`));

    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://lootriva.test/auth/recovery/continue");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("set-cookie")).toContain(`${PENDING_COOKIE}=${TOKEN_HASH}`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("samesite=lax");
    expect(response.headers.get("set-cookie")?.toLowerCase()).not.toContain("samesite=none");
  });

  it("rejects malformed GET links without storing or verifying them", async () => {
    const { GET } = await import("../app/auth/recovery/route");
    const response = await GET(new Request("https://lootriva.test/auth/recovery?token_hash=short&type=recovery"));

    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("location")).toBe("https://lootriva.test/reset-password?status=invalid");
  });

  it("consumes the pending token only after a same-origin confirmation POST", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: {}, user: { id: "test-user" } }, error: null });
    const { POST } = await import("../app/auth/recovery/confirm/route");
    const response = await POST(confirmationRequest());

    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: TOKEN_HASH, type: "recovery" });
    expect(response.headers.get("location")).toBe("https://lootriva.test/reset-password");
    expect(response.headers.get("set-cookie")).toContain(`${PENDING_COOKIE}=;`);
  });

  it("refuses cross-site confirmation posts without consuming the token", async () => {
    const { POST } = await import("../app/auth/recovery/confirm/route");
    const request = confirmationRequest();
    request.headers.set("origin", "https://attacker.example");
    const response = await POST(request);

    expect(mocks.auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://lootriva.test/reset-password?status=invalid");
  });

  it("keeps expired or reused tokens in the dedicated recovery UI", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: { code: "otp_expired" } });
    const { POST } = await import("../app/auth/recovery/confirm/route");
    const response = await POST(confirmationRequest());

    expect(response.headers.get("location")).toBe("https://lootriva.test/reset-password?status=expired_or_used");
    expect(response.headers.get("location")).not.toContain(TOKEN_HASH);
  });

  it("blocks recovery for an inactive account and clears both sessions", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: {}, user: { id: "test-user" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const { POST } = await import("../app/auth/recovery/confirm/route");
    const response = await POST(confirmationRequest());

    expect(mocks.auth.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("https://lootriva.test/reset-password?status=unavailable");
  });

  it("fails closed when Supabase is unavailable", async () => {
    mocks.createClient.mockResolvedValue(null);
    const { POST } = await import("../app/auth/recovery/confirm/route");
    const response = await POST(confirmationRequest());

    expect(response.headers.get("location")).toBe("https://lootriva.test/reset-password?status=unavailable");
  });
});
