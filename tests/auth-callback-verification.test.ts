import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn(), getUser: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth })) }));
vi.mock("@/lib/security", async () => import("../lib/security"));

describe("Supabase confirmation callback", () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset();
    auth.verifyOtp.mockReset();
    auth.getUser.mockReset();
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
    auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=expired&next=%2Fsettings%2Fverification"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/settings/verification?status=invalid_or_expired");
  });

  it("preserves password recovery redirects without claiming account verification", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { GET } = await import("../app/auth/callback/route");
    const response = await GET(new Request("https://ggmarket.test/auth/callback?code=recovery&next=%2Freset-password"));
    expect(response.headers.get("location")).toBe("https://ggmarket.test/reset-password");
  });
});
