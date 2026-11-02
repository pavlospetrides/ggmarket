import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: auth.createServerClient,
}));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

import { proxy } from "../proxy";

describe("proxy authentication performance", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    auth.createServerClient.mockReset();
    auth.getClaims.mockReset().mockResolvedValue({ data: { claims: null }, error: null });
    auth.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    auth.createServerClient.mockReturnValue({
      auth: { getClaims: auth.getClaims, getUser: auth.getUser },
    });
  });

  it("does not contact Supabase Auth for an anonymous public request", async () => {
    const response = await proxy(new NextRequest("https://ggmarket.eu/marketplace"));

    expect(response.status).toBe(200);
    expect(auth.createServerClient).not.toHaveBeenCalled();
    expect(auth.getClaims).not.toHaveBeenCalled();
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("validates an authenticated cookie with claims instead of a user network lookup", async () => {
    const request = new NextRequest("https://ggmarket.eu/profile", {
      headers: { cookie: "sb-project-ref-auth-token=synthetic-session" },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(auth.createServerClient).toHaveBeenCalledOnce();
    expect(auth.getClaims).toHaveBeenCalledOnce();
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("private");
  });
});
