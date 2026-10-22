import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthCallbackUrl } from "../lib/auth-redirect";

describe("auth callback URL generation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("pins browser-generated production links to canonical HTTPS", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildAuthCallbackUrl("http://localhost:3000", "/settings/verification"))
      .toBe("https://ggmarket-sage.vercel.app/auth/callback?next=%2Fsettings%2Fverification");
  });

  it("keeps local and LAN callbacks available outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(buildAuthCallbackUrl("http://192.168.2.21:3000/register", "/reset-password"))
      .toBe("http://192.168.2.21:3000/auth/callback?next=%2Freset-password");
  });

  it("marks only initial signup callbacks for the welcome experience", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildAuthCallbackUrl("http://localhost:3000", "/settings/verification", true))
      .toBe("https://ggmarket-sage.vercel.app/auth/callback?next=%2Fsettings%2Fverification&welcome=1");
  });
});
