import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getPublicRequestOrigin, isTrustedMutationRequest } from "../lib/request-security";
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
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ggmarket.example");
    const requestHeaders = headers({
      host: "internal:3000",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
    });

    expect(getPublicRequestOrigin(requestHeaders, "http:")).toBe("https://ggmarket.example");
    expect(isTrustedMutationRequest(new Headers({
      ...Object.fromEntries(requestHeaders.entries()),
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    }), "http:")).toBe(false);
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
