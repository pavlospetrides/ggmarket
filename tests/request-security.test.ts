import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildContentSecurityPolicy, getPublicRequestOrigin, isTrustedMutationRequest } from "../lib/request-security";
import { proxy } from "../proxy";

vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe("mutation origin validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts localhost when Next is bound to 0.0.0.0", () => {
    expect(isTrustedMutationRequest(headers({
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "sec-fetch-site": "same-origin",
    }), "http:" )).toBe(true);
  });

  it("accepts a same-origin LAN phone request", () => {
    expect(isTrustedMutationRequest(headers({
      origin: "http://10.4.122.11:3000",
      host: "10.4.122.11:3000",
      "sec-fetch-site": "same-origin",
    }), "http:" )).toBe(true);
  });

  it("honors forwarded production host and protocol", () => {
    expect(isTrustedMutationRequest(headers({
      origin: "https://ggmarket.example",
      host: "internal:3000",
      "x-forwarded-host": "ggmarket.example",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "same-origin",
    }), "http:" )).toBe(true);
  });

  it("rejects a different origin even when the target host is trusted", () => {
    expect(isTrustedMutationRequest(headers({
      origin: "https://attacker.example",
      host: "ggmarket.example",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "cross-site",
    }), "http:" )).toBe(false);
  });

  it("rejects an originless request explicitly marked cross-site", () => {
    expect(isTrustedMutationRequest(headers({
      host: "ggmarket.example",
      "sec-fetch-site": "cross-site",
    }), "https:" )).toBe(false);
  });

  it("rejects an originless mutation when the browser does not prove it is same-origin", () => {
    expect(isTrustedMutationRequest(headers({
      host: "ggmarket.example",
    }), "https:" )).toBe(false);
  });

  it("uses the configured production origin instead of client-supplied forwarding headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ggmarket-sage.vercel.app");
    const requestHeaders = headers({
      host: "internal:3000",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
    });

    expect(getPublicRequestOrigin(requestHeaders, "http:")).toBe("https://ggmarket-sage.vercel.app");
    expect(isTrustedMutationRequest(new Headers({
      ...Object.fromEntries(requestHeaders.entries()),
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    }), "http:")).toBe(false);
  });

  it("never uses localhost or forwarded hosts as the production public origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    expect(getPublicRequestOrigin(headers({
      host: "localhost:3000",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "http",
    }), "http:")).toBe("https://ggmarket-sage.vercel.app");
  });

  it("rejects cross-site auth mutations in the application proxy", async () => {
    const response = await proxy(new NextRequest("https://ggmarket.example/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        host: "ggmarket.example",
        "sec-fetch-site": "cross-site",
      },
    }));

    expect(response.status).toBe(403);
  });
});

describe("content security policy", () => {
  it("covers executable, network, image, framing, and navigation sources", () => {
    const policy = buildContentSecurityPolicy(false);

    for (const directive of [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "img-src 'self' blob: data: https://images.unsplash.com https://*.supabase.co",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ]) expect(policy).toContain(`${directive};`);
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("allows only the local development transports required by Next and Supabase", () => {
    const policy = buildContentSecurityPolicy(true);
    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval';");
    expect(policy).toContain("http://127.0.0.1:* ws://127.0.0.1:*");
    expect(policy).toContain("http://localhost:* ws://localhost:*");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
