import { describe, expect, it } from "vitest";
import { localSupabaseImagePattern } from "../next.config";

describe("Playwright isolated-worktree configuration", () => {
  it("loads without requiring a local environment file", async () => {
    const config = await import("../playwright.config");
    expect(config.default.webServer).toBeDefined();
    expect(config.default.expect?.timeout).toBe(20_000);
  });
});

describe("local Supabase image isolation", () => {
  it("allows only a configured loopback Supabase origin", () => {
    expect(localSupabaseImagePattern("http://127.0.0.1:54321")).toEqual({
      protocol: "http",
      hostname: "127.0.0.1",
      port: "54321",
      pathname: "/storage/v1/object/**",
    });
    expect(localSupabaseImagePattern("https://project.supabase.co")).toBeNull();
    expect(localSupabaseImagePattern("http://192.168.1.5:54321")).toBeNull();
  });

  it("enables local-IP image fetching only when the configured Supabase URL is loopback", async () => {
    expect(localSupabaseImagePattern("http://localhost:54321")).not.toBeNull();
    expect(localSupabaseImagePattern("https://project.supabase.co")).toBeNull();
  });
});
