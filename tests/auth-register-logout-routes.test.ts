import { beforeEach, describe, expect, it, vi } from "vitest";

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
        emailRedirectTo: "https://192.168.2.21:3000/auth/callback?next=%2Fsettings%2Fverification",
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
