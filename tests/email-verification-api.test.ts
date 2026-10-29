import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), resend: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth })),
}));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));
vi.mock("@/lib/validation", async () => import("../lib/validation"));
vi.mock("@/lib/security", async () => import("../lib/security"));

function request(host = "192.168.2.21:3000") {
  return new Request("http://0.0.0.0:3000/api/verification/email", {
    method: "POST",
    headers: { host, origin: `http://${host}` },
  });
}

describe("email verification resend API", () => {
  beforeEach(() => {
    auth.getUser.mockReset();
    auth.resend.mockReset();
    vi.unstubAllEnvs();
  });

  it("allows a signed-out user to request a replacement without account enumeration", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    auth.resend.mockResolvedValue({ error: null });
    const { POST } = await import("../app/api/verification/email/route");
    const response = await POST(new Request("https://ggmarket.test/api/verification/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "member@example.test" }),
    }));
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "member@example.test",
      options: { emailRedirectTo: "https://ggmarket.test/auth/callback?next=%2Fsettings%2Fverification" },
    });
    expect(await response.json()).toEqual({ status: "sent" });
  });

  it("uses the canonical HTTPS callback in production even when the request is localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    auth.resend.mockResolvedValue({ error: null });
    const { POST } = await import("../app/api/verification/email/route");
    await POST(new Request("http://localhost:3000/api/verification/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "member@example.test" }),
    }));
    expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({
      options: { emailRedirectTo: "https://ggmarket.eu/auth/callback?next=%2Fsettings%2Fverification" },
    }));
  });

  it("rejects a signed-out resend request without a valid email", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { POST } = await import("../app/api/verification/email/route");
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("rejects a declared oversized resend body before calling the provider", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { POST } = await import("../app/api/verification/email/route");
    const response = await POST(new Request("https://ggmarket.test/api/verification/email", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "70000" },
      body: JSON.stringify({ email: "member@example.test" }),
    }));
    expect(response.status).toBe(400);
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("reports already verified only from the authenticated user record", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { email: "member@example.test", email_confirmed_at: "2026-10-20T10:00:00Z" } }, error: null });
    const { POST } = await import("../app/api/verification/email/route");
    const response = await POST(request());
    expect(await response.json()).toEqual({ status: "already_verified" });
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("asks Supabase to resend with the public LAN callback and does not claim verification", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { email: "member@example.test", email_confirmed_at: null } }, error: null });
    auth.resend.mockResolvedValue({ error: null });
    const { POST } = await import("../app/api/verification/email/route");
    const response = await POST(request());
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "member@example.test",
      options: { emailRedirectTo: "http://192.168.2.21:3000/auth/callback?next=%2Fsettings%2Fverification" },
    });
    expect(await response.json()).toEqual({ status: "sent" });
  });

  it("preserves Supabase email rate limits without leaking provider details", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { email: "member@example.test", email_confirmed_at: null } }, error: null });
    auth.resend.mockResolvedValue({ error: { status: 429, message: "provider detail" } });
    const { POST } = await import("../app/api/verification/email/route");
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "Please wait before requesting another verification email." });
  });
});
