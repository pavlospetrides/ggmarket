import { describe, expect, it } from "vitest";
import {
  CANONICAL_SITE_ORIGIN,
  getApplicationOrigin,
  getCanonicalRedirectUrl,
} from "../lib/site-url";

describe("application URL configuration", () => {
  it("uses the official custom domain for production", () => {
    expect(CANONICAL_SITE_ORIGIN).toBe("https://lootriva.com");
    expect(getApplicationOrigin("http://localhost:3000", {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://lootriva.com",
    })).toBe("https://lootriva.com");
  });

  it("fails safely to the canonical origin when production configuration is absent or invalid", () => {
    expect(getApplicationOrigin("https://attacker.example", {
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://attacker.example",
    })).toBe("https://lootriva.com");
  });

  it("uses only a trusted Vercel deployment hostname for previews", () => {
    expect(getApplicationOrigin("http://localhost:3000", {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "lootriva-git-domain-a1b2c3.vercel.app",
      NEXT_PUBLIC_SITE_URL: "https://lootriva.com",
    })).toBe("https://lootriva-git-domain-a1b2c3.vercel.app");

    expect(getApplicationOrigin("https://preview.example", {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "attacker.example",
    })).toBe("https://lootriva.com");
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
    ["https://www.lootriva.com/marketplace?q=gpu", "https://lootriva.com/marketplace?q=gpu"],
    ["https://ggmarket.eu/marketplace?q=gpu", "https://lootriva.com/marketplace?q=gpu"],
    ["https://www.ggmarket.eu/profile/player?tab=listings", "https://lootriva.com/profile/player?tab=listings"],
    ["https://ggmarket-sage.vercel.app/listing/abc?ref=old", "https://lootriva.com/listing/abc?ref=old"],
  ])("redirects %s while preserving path and query", (source, expected) => {
    expect(getCanonicalRedirectUrl(new URL(source))?.toString()).toBe(expected);
  });

  it.each([
    "https://lootriva.com/marketplace",
    "https://lootriva-git-feature-a1b2c3.vercel.app/marketplace",
    "http://localhost:3000/marketplace",
  ])("does not redirect canonical, preview, or local traffic: %s", (source) => {
    expect(getCanonicalRedirectUrl(new URL(source))).toBeNull();
  });

  it.each([
    ["https://ggmarket.eu/auth/recovery?token_hash=secret&type=recovery", "https://lootriva.com/forgot-password?status=legacy_link"],
    ["https://www.ggmarket.eu/auth/confirm-signup?token_hash=secret&type=email", "https://lootriva.com/verify-email?status=legacy_link"],
    ["https://www.lootriva.com/auth/callback?code=secret&next=%2Fprofile", "https://lootriva.com/login?error=legacy_link"],
    ["https://ggmarket.eu/listing/abc?provider_token=secret", "https://lootriva.com/login?error=legacy_link"],
    ["https://ggmarket.eu/listing/abc?access_token=secret#refresh_token=also-secret", "https://lootriva.com/login?error=legacy_link"],
  ])("never forwards authentication secrets from an alias: %s", (source, expected) => {
    const target = getCanonicalRedirectUrl(new URL(source));
    expect(target?.toString()).toBe(expected);
    expect(target?.toString()).not.toContain("secret");
  });

  it("does not redirect lookalike hosts", () => {
    expect(getCanonicalRedirectUrl(new URL("https://www.lootriva.com.attacker.example/marketplace"))).toBeNull();
  });
});
