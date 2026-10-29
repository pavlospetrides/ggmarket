import { describe, expect, it } from "vitest";
import {
  CANONICAL_SITE_ORIGIN,
  getApplicationOrigin,
  getCanonicalRedirectUrl,
} from "../lib/site-url";

describe("application URL configuration", () => {
  it("uses the official custom domain for production", () => {
    expect(CANONICAL_SITE_ORIGIN).toBe("https://ggmarket.eu");
    expect(getApplicationOrigin("http://localhost:3000", {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://ggmarket.eu",
    })).toBe("https://ggmarket.eu");
  });

  it("fails safely to the canonical origin when production configuration is absent or invalid", () => {
    expect(getApplicationOrigin("https://attacker.example", {
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://attacker.example",
    })).toBe("https://ggmarket.eu");
  });

  it("uses only a trusted Vercel deployment hostname for previews", () => {
    expect(getApplicationOrigin("http://localhost:3000", {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "ggmarket-git-domain-a1b2c3.vercel.app",
      NEXT_PUBLIC_SITE_URL: "https://ggmarket.eu",
    })).toBe("https://ggmarket-git-domain-a1b2c3.vercel.app");

    expect(getApplicationOrigin("https://preview.example", {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "attacker.example",
    })).toBe("https://ggmarket.eu");
  });

  it("preserves local and LAN request origins outside production", () => {
    expect(getApplicationOrigin("http://localhost:3000/path", { NODE_ENV: "development" }))
      .toBe("http://localhost:3000");
    expect(getApplicationOrigin("http://192.168.2.21:3000/path", { NODE_ENV: "test" }))
      .toBe("http://192.168.2.21:3000");
  });
});

describe("canonical host redirects", () => {
  it.each([
    ["https://www.ggmarket.eu/marketplace?q=gpu", "https://ggmarket.eu/marketplace?q=gpu"],
    ["https://ggmarket-sage.vercel.app/listing/abc?ref=old", "https://ggmarket.eu/listing/abc?ref=old"],
  ])("redirects %s while preserving path and query", (source, expected) => {
    expect(getCanonicalRedirectUrl(new URL(source))?.toString()).toBe(expected);
  });

  it.each([
    "https://ggmarket.eu/marketplace",
    "https://ggmarket-git-feature-a1b2c3.vercel.app/marketplace",
    "http://localhost:3000/marketplace",
  ])("does not redirect canonical, preview, or local traffic: %s", (source) => {
    expect(getCanonicalRedirectUrl(new URL(source))).toBeNull();
  });
});
