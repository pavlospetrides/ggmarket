import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { reserveUploadProvider } from "../lib/media-storage/uploads";

function database(deleted = false) {
  let row: Record<string, unknown> | undefined;
  return { from: (table: string) => {
    const query = {
      upsert: async (payload: Record<string, unknown>) => { row ??= payload; return { error: null }; },
      select: () => query, eq: () => query,
      single: async () => ({ data: row, error: null }),
      maybeSingle: async () => ({ data: table === "listing_image_cleanup_jobs" && deleted ? { image_id: "image" } : null, error: null }),
    }; return query;
  } } as unknown as SupabaseClient;
}
afterEach(() => vi.unstubAllEnvs());
describe("trusted upload provider reservation", () => {
  it("rejects deleted image ids before any object write can begin", async () => {
    vi.stubEnv("MEDIA_STORAGE_PROVIDER", "supabase");
    await expect(reserveUploadProvider(database(true), "image", "listing", "seller", "digest")).rejects.toThrow();
  });
  it("pins retries to the first provider across rollout flag changes", async () => {
    const admin = database();
    vi.stubEnv("MEDIA_STORAGE_PROVIDER", "supabase");
    expect(await reserveUploadProvider(admin, "image", "listing", "seller", "digest")).toBe("supabase");
    vi.stubEnv("MEDIA_STORAGE_PROVIDER", "r2");
    vi.stubEnv("R2_ACCOUNT_ID", "a".repeat(32)); vi.stubEnv("R2_BUCKET_NAME", "lootriva-images"); vi.stubEnv("R2_ACCESS_KEY_ID", "fake"); vi.stubEnv("R2_SECRET_ACCESS_KEY", "fake");
    expect(await reserveUploadProvider(admin, "image", "listing", "seller", "digest")).toBe("supabase");
  });
  it("rejects reuse of an upload id with different bytes", async () => {
    const admin = database(); vi.stubEnv("MEDIA_STORAGE_PROVIDER", "supabase");
    await reserveUploadProvider(admin, "image", "listing", "seller", "first");
    await expect(reserveUploadProvider(admin, "image", "listing", "seller", "second")).rejects.toThrow();
  });
  it("rejects assignment collisions across owners or listings", async () => {
    const admin = database(); vi.stubEnv("MEDIA_STORAGE_PROVIDER", "supabase");
    await reserveUploadProvider(admin, "image", "listing", "seller", "digest");
    await expect(reserveUploadProvider(admin, "image", "foreign", "seller", "digest")).rejects.toThrow();
    await expect(reserveUploadProvider(admin, "image", "listing", "foreign", "digest")).rejects.toThrow();
  });
});
