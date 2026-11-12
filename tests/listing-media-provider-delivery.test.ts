import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { signAuthorizedListingImages, removeStoredListingImages } from "../lib/listing-media-delivery";
import type { MediaStorage } from "../lib/media-storage/types";

function factory(calls: string[]) {
  return (provider: "supabase" | "r2") => ({
    createSignedUrls: async (paths: string[], seconds: number) => { calls.push(`${provider}:${seconds}:${paths.join(",")}`); return { data: paths.map((path) => ({ path, signedUrl: `https://${provider}.test/${path}` })), error: null }; },
    remove: async (paths: string[]) => { calls.push(`${provider}:${paths.join(",")}`); return { error: null }; },
  } as unknown as MediaStorage);
}
describe("authorized mixed-provider media", () => {
  it("signs each provider once and distinguishes identical keys across providers", async () => {
    const calls: string[] = [];
    const result = await signAuthorizedListingImages([
      { path: "same/card.webp", provider: "r2" }, { path: "same/card.webp", provider: "supabase" }, { path: "same/card.webp", provider: "r2" },
    ], factory(calls));
    expect(result).toEqual(["https://r2.test/same/card.webp", "https://supabase.test/same/card.webp", "https://r2.test/same/card.webp"]);
    expect(calls).toEqual(["r2:3600:same/card.webp", "supabase:3600:same/card.webp"]);
  });
  it("uses Supabase for rows without provider metadata", async () => {
    const calls: string[] = [];
    expect(await signAuthorizedListingImages([{ path: "legacy/photo.jpg" }], factory(calls))).toEqual(["https://supabase.test/legacy/photo.jpg"]);
  });
  it("does not silently send unavailable R2 keys to Supabase", async () => {
    await expect(signAuthorizedListingImages([{ path: "private/card.webp", provider: "r2" }], () => { throw new Error("unavailable"); })).rejects.toThrow();
  });
  it("fails closed on incomplete signing results", async () => {
    await expect(signAuthorizedListingImages([{ path: "private/card.webp" }], () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) as unknown as MediaStorage)).rejects.toThrow("Media signing unavailable.");
  });
  it("deletes only recorded variants from their own provider", async () => {
    const calls: string[] = [];
    const result = await removeStoredListingImages([
      { storage_path: "old/photo.jpg" },
      { storage_path: "new/original.webp", card_path: "new/card.webp", detail_path: "new/detail.webp", storage_provider: "r2" },
    ], factory(calls));
    expect(result).toEqual({ error: null });
    expect(calls).toEqual(["supabase:old/photo.jpg", "r2:new/original.webp,new/card.webp,new/detail.webp"]);
  });
  it("initializes every cleanup provider before deleting any object", async () => {
    const remove = vi.fn();
    const result = await removeStoredListingImages([{ storage_path: "old/photo.jpg" }, { storage_path: "new/original.webp", storage_provider: "r2" }], (provider) => { if (provider === "r2") throw new Error("secret"); return { remove } as unknown as MediaStorage; });
    expect(result.error).toBeTruthy(); expect(remove).not.toHaveBeenCalled();
  });
});
