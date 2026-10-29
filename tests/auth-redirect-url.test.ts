import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthCallbackUrl } from "../lib/auth-redirect";

describe("auth callback URL generation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("pins browser-generated production links to canonical HTTPS", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildAuthCallbackUrl("http://localhost:3000", "/settings/verification"))
      .toBe("https://ggmarket.eu/auth/callback?next=%2Fsettings%2Fverification");
  });

  it("keeps local and LAN callbacks available outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(buildAuthCallbackUrl("http://192.168.2.21:3000/register", "/reset-password"))
      .toBe("http://192.168.2.21:3000/auth/callback?next=%2Freset-password");
  });

  it("marks only initial signup callbacks for the welcome experience", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildAuthCallbackUrl("http://localhost:3000", "/settings/verification", true))
      .toBe("https://ggmarket.eu/auth/callback?next=%2Fsettings%2Fverification&welcome=1");
  });

  it("uses the trusted deployment origin for Vercel previews", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "ggmarket-git-auth-a1b2c3.vercel.app");
    expect(buildAuthCallbackUrl("http://localhost:3000", "/settings/verification"))
      .toBe("https://ggmarket-git-auth-a1b2c3.vercel.app/auth/callback?next=%2Fsettings%2Fverification");
  });

  it("uses the browser's HTTPS Vercel preview origin when server-only Vercel variables are unavailable", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildAuthCallbackUrl(
      "https://ggmarket-git-browser-a1b2c3.vercel.app/register",
      "/settings/verification",
    )).toBe("https://ggmarket-git-browser-a1b2c3.vercel.app/auth/callback?next=%2Fsettings%2Fverification");
  });
});
