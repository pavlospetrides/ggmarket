import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn(), getUser: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth })) }));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

describe("Supabase confirmation callback", () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset();
    auth.verifyOtp.mockReset();
    auth.getUser.mockReset();
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
    expect(response.headers.get("location")).toBe("https://ggmarket-sage.vercel.app/settings/verification?status=verified");
  });

  it("preserves password recovery redirects without claiming account verification", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=recovery&next=%2Freset-password"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password");
  });
});
