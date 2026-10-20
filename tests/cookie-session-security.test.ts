import { describe, expect, it } from "vitest";
import {
  getSupabaseCookieOptions,
  hasSupabaseAuthStorageCookie,
  withPrivateNoStore,
} from "../lib/supabase/cookie-security";

describe("Supabase cookie security", () => {
  it("uses Secure cookies only in production while preserving the SSR browser model", () => {
    expect(getSupabaseCookieOptions("production")).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: true,
    });
    expect(getSupabaseCookieOptions("development")).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: false,
    });
  });

  it("recognizes auth-token chunks and PKCE verifier cookies without matching unrelated cookies", () => {
    expect(hasSupabaseAuthStorageCookie([{ name: "sb-project-ref-auth-token" }])).toBe(true);
    expect(hasSupabaseAuthStorageCookie([{ name: "sb-project-ref-auth-token.1" }])).toBe(true);
    expect(hasSupabaseAuthStorageCookie([{ name: "sb-project-ref-auth-token-code-verifier" }])).toBe(true);
    expect(hasSupabaseAuthStorageCookie([{ name: "theme" }])).toBe(false);
  });

  it("marks authentication responses private and non-cacheable", () => {
    const response = withPrivateNoStore(new Response(null, { status: 204 }));
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
  });
});
