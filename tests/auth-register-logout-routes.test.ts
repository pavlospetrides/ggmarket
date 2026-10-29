import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth })),
}));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));
vi.mock("@/lib/validation", async () => import("../lib/validation"));

afterEach(() => vi.unstubAllEnvs());

function formRequest(path: string, values: Record<string, string>, host = "ggmarket.example") {
  return new Request(`https://0.0.0.0/${path}`, {
    method: "POST",
    headers: {
      host,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(values),
  });
}

describe("native registration fallback", () => {
  beforeEach(() => auth.signUp.mockReset());

  it("submits validated signup data with the public-host confirmation URL", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const { POST } = await import("../app/auth/register/route");
    const response = await POST(formRequest("auth/register", {
      username: "iphone_user",
      email: "iphone@example.invalid",
      password: "not-a-real-password",
    }, "192.168.2.21:3000"));

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "iphone@example.invalid",
      password: "not-a-real-password",
      options: {
        data: { username: "iphone_user", display_name: "iphone_user" },
        emailRedirectTo: "https://192.168.2.21:3000/auth/callback?next=%2Fsettings%2Fverification&welcome=1",
      },
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://192.168.2.21:3000/register?status=check_email");
  });

  it("returns visible safe feedback after a signup error", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: { message: "duplicate" } });
    const { POST } = await import("../app/auth/register/route");
    const response = await POST(formRequest("auth/register", {
      username: "iphone_user",
      email: "iphone@example.invalid",
      password: "not-a-real-password",
    }));

    expect(response.headers.get("location")).toBe("https://ggmarket.example/register?error=signup_failed");
  });

  it("welcomes an immediately confirmed signup without affecting ordinary login", async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: "test" }, user: { email_confirmed_at: "2026-10-22T10:00:00Z" } }, error: null });
    const { POST } = await import("../app/auth/register/route");
    const response = await POST(formRequest("auth/register", {
      username: "iphone_user",
      email: "iphone@example.invalid",
      password: "not-a-real-password",
    }));
    expect(response.headers.get("location")).toBe("https://ggmarket.example/settings/verification?status=verified&welcome=1");
  });

  it("pins production signup confirmation to the canonical HTTPS callback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const { POST } = await import("../app/auth/register/route");
    await POST(formRequest("auth/register", {
      username: "iphone_user",
      email: "iphone@example.invalid",
      password: "not-a-real-password",
    }, "localhost:3000"));

    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: "https://ggmarket.eu/auth/callback?next=%2Fsettings%2Fverification&welcome=1",
      }),
    }));
  });
});

describe("native password-reset fallback", () => {
  beforeEach(() => auth.resetPasswordForEmail.mockReset());

  it("submits through the public LAN host and returns visible status", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const { POST } = await import("../app/auth/forgot-password/route");
    const response = await POST(formRequest("auth/forgot-password", { email: "iphone@example.invalid" }, "192.168.2.21:3000"));

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("iphone@example.invalid", {
      redirectTo: "https://192.168.2.21:3000/auth/callback?next=/reset-password",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://192.168.2.21:3000/forgot-password?status=sent");
  });

  it("pins production password recovery to the canonical HTTPS callback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const { POST } = await import("../app/auth/forgot-password/route");
    await POST(formRequest("auth/forgot-password", { email: "iphone@example.invalid" }, "localhost:3000"));

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("iphone@example.invalid", {
      redirectTo: "https://ggmarket.eu/auth/callback?next=/reset-password",
    });
  });
});

describe("native logout contract", () => {
  beforeEach(() => auth.signOut.mockReset());

  it("invalidates the server session and redirects to the public home URL", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    const { POST } = await import("../app/auth/logout/route");
    const response = await POST(formRequest("auth/logout", {}, "192.168.2.21:3000"));

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://192.168.2.21:3000/");
  });

  it("returns to Settings with visible feedback when sign-out fails", async () => {
    auth.signOut.mockResolvedValue({ error: { message: "network" } });
    const { POST } = await import("../app/auth/logout/route");
    const response = await POST(formRequest("auth/logout", {}));

    expect(response.headers.get("location")).toBe("https://ggmarket.example/settings?error=logout_failed");
  });
});
