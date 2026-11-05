import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn(), getUser: vi.fn(), signOut: vi.fn() },
  rpc: vi.fn(),
}));
const auth = mocks.auth;

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth, rpc: mocks.rpc })) }));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

describe("Supabase confirmation callback", () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset();
    auth.verifyOtp.mockReset();
    auth.getUser.mockReset();
    auth.signOut.mockReset();
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    vi.unstubAllEnvs();
  });

  it("shows verification success only after the confirmed user is returned", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=valid&next=%2Fsettings%2Fverification"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/settings/verification?status=verified");
  });

  it("supports token-hash confirmation links", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?token_hash=token&type=signup&next=%2Fsettings%2Fverification"));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "token", type: "signup" });
    expect(response.headers.get("location")).toContain("status=verified");
  });

  it("reports invalid or expired verification links to an existing session", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "otp_expired", message: "expired" } });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=expired&next=%2Fsettings%2Fverification"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=expired_or_used");
  });

  it("adds the one-time welcome marker only to a genuinely successful signup callback", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?token_hash=token&type=email&next=%2Fsettings%2Fverification&welcome=1"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/settings/verification?status=verified&welcome=1");
  });

  it("reports malformed confirmation links without claiming success", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?type=email&next=%2Fsettings%2Fverification"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/verify-email?status=invalid");
  });

  it("reports an already-confirmed signed-in account accurately for a consumed link", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired", message: "already used" } });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?token_hash=used&type=email&next=%2Fsettings%2Fverification"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/settings/verification?status=already_verified");
    expect(response.headers.get("location")).not.toContain("welcome=1");
  });

  it("uses the canonical HTTPS origin for production callback redirects", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    auth.verifyOtp.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("http://localhost:3000/auth/callback?token_hash=valid&type=email&next=%2Fsettings%2Fverification"));
    expect(response.headers.get("location")).toBe("https://ggmarket.eu/settings/verification?status=verified");
  });

  it("preserves password recovery redirects without claiming account verification", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=recovery&next=%2Freset-password"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password");
  });

  it("handles OAuth cancellation without attempting a code exchange", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?error=access_denied&error_description=User+cancelled&next=%2Flisting%2Ftest"));
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://ggmarket.test/login?error=oauth_cancelled&next=%2Flisting%2Ftest");
  });

  it("does not present an expired legacy recovery link as cancelled Google sign-in", async () => {
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?error=access_denied&error_code=otp_expired&next=%2Freset-password"));

    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password?status=expired_or_used");
    expect(response.headers.get("location")).not.toContain("oauth_cancelled");
  });

  it("keeps a failed legacy recovery code exchange out of ordinary login", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "bad_code_verifier" } });
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=legacy-recovery&next=%2Freset-password"));

    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password?status=invalid");
  });

  it("keeps an inactive legacy recovery account out of ordinary login", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=legacy-recovery&next=%2Freset-password"));

    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password?status=unavailable");
  });

  it("rejects unsafe OAuth return destinations", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=valid&next=%2F%252fevil.example"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/profile");
  });

  it("ends a newly established OAuth session for a suspended account", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=google&next=%2Fmessages"));
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("https://ggmarket.test/login?error=account_suspended&next=%2Fmessages");
  });
});
