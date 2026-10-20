import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithPassword } })),
}));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));
vi.mock("@/lib/validation", async () => import("../lib/validation"));

function loginRequest(next = "/profile", options: { url?: string; host?: string } = {}) {
  const body = new URLSearchParams({
    email: "iphone@example.invalid",
    password: "not-a-real-password",
    next,
  });
  return new Request(options.url ?? "https://ggmarket.example/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(options.host ? { host: options.host } : {}),
    },
    body,
  });
}

describe("native login fallback", () => {
  beforeEach(() => signInWithPassword.mockReset());

  it("sets the session and redirects to the safe requested route", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { POST } = await import("../app/auth/login/route");

    const response = await POST(loginRequest("/favorites?view=grid"));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "iphone@example.invalid",
      password: "not-a-real-password",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://ggmarket.example/favorites?view=grid");
  });

  it("returns to login with visible feedback when credentials are rejected", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    const { POST } = await import("../app/auth/login/route");

    const response = await POST(loginRequest("/favorites"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://ggmarket.example/login?error=invalid_credentials&next=%2Ffavorites",
    );
  });

  it("rejects unsafe redirect targets", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { POST } = await import("../app/auth/login/route");

    const response = await POST(loginRequest("https://evil.example"));

    expect(response.headers.get("location")).toBe("https://ggmarket.example/profile");
  });

  it("redirects LAN clients to the public request host instead of 0.0.0.0", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    const { POST } = await import("../app/auth/login/route");

    const response = await POST(loginRequest("/profile", {
      url: "http://0.0.0.0:3000/auth/login",
      host: "192.168.2.21:3000",
    }));

    expect(response.headers.get("location")).toBe(
      "http://192.168.2.21:3000/login?error=invalid_credentials&next=%2Fprofile",
    );
  });
});
