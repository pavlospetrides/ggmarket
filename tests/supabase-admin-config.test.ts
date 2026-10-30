import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAdminClient } from "../lib/supabase/admin";
import { resolveSupabaseAdminConfig } from "../lib/supabase/admin-config";

describe("Supabase admin configuration", () => {
  it("uses the modern server-only variables provisioned by the Vercel integration", () => {
    expect(resolveSupabaseAdminConfig({
      SUPABASE_URL: "https://modern.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_modern",
    })).toEqual({
      url: "https://modern.supabase.co",
      key: "sb_secret_modern",
    });
  });

  it("creates the real server client when only modern Vercel variables exist", () => {
    const previous = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    process.env.SUPABASE_URL = "https://modern.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_modern";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      expect(createAdminClient()).not.toBeNull();
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it("keeps the legacy service-role configuration working", () => {
    expect(resolveSupabaseAdminConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://legacy.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
    })).toEqual({
      url: "https://legacy.supabase.co",
      key: "legacy-service-role",
    });
  });

  it("prefers the modern pair when both key generations are configured", () => {
    expect(resolveSupabaseAdminConfig({
      SUPABASE_URL: "https://modern.supabase.co",
      NEXT_PUBLIC_SUPABASE_URL: "https://legacy.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_modern",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
    })).toEqual({
      url: "https://modern.supabase.co",
      key: "sb_secret_modern",
    });
  });

  it("falls back to legacy values when modern variables are blank", () => {
    expect(resolveSupabaseAdminConfig({
      SUPABASE_URL: " ",
      NEXT_PUBLIC_SUPABASE_URL: "https://legacy.supabase.co",
      SUPABASE_SECRET_KEY: " ",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
    })).toEqual({
      url: "https://legacy.supabase.co",
      key: "legacy-service-role",
    });
  });

  it.each([
    {},
    { SUPABASE_URL: "https://modern.supabase.co" },
    { SUPABASE_SECRET_KEY: "sb_secret_modern" },
    { SUPABASE_URL: "   ", SUPABASE_SECRET_KEY: "sb_secret_modern" },
    { SUPABASE_URL: "https://modern.supabase.co", SUPABASE_SECRET_KEY: "   " },
  ])("fails closed for incomplete configuration %#", (environment) => {
    expect(resolveSupabaseAdminConfig(environment)).toBeNull();
  });
});
