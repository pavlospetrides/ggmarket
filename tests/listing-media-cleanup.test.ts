import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaStorage } from "../lib/media-storage/types";
vi.mock("server-only", () => ({}));
import { completeMediaCleanup } from "../lib/media-storage/cleanup";

const job = { image_id: "image", listing_id: "listing", storage_provider: "r2", paths: ["owner/listing/legacy.jpg", "owner/listing/card.webp"] };
function admin(events: string[]) {
  return { from: () => {
    const query = { select: () => query, eq: () => query, is: () => query, order: () => query, limit: () => query,
      update: () => { events.push("complete"); return query; }, in: () => query,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [job], error: null }).then(resolve),
    }; return query;
  } } as unknown as SupabaseClient;
}
describe("durable deletion cleanup", () => {
  it("provides credential-free operator help and denies an unapproved apply", () => {
    const output = execFileSync(process.execPath, ["scripts/retry-listing-media-cleanup.mjs", "--help"], { encoding: "utf8" });
    expect(output).toContain("Dry-run by default");
    expect(() => execFileSync(process.execPath, ["scripts/retry-listing-media-cleanup.mjs", "--apply"], { env: { NODE_ENV: "test" }, stdio: "pipe" })).toThrow();
  });
  it("uses the transactional deleted-row snapshot and marks it complete after object removal", async () => {
    const events: string[] = []; const remove = vi.fn(async (paths: string[]) => { events.push("remove"); expect(paths).toEqual(job.paths); return { error: null }; });
    expect(await completeMediaCleanup(admin(events), { imageId: "image" }, () => ({ remove }) as unknown as MediaStorage)).toEqual({ error: null });
    expect(events).toEqual(["remove", "complete"]);
  });
  it("retains the durable job if storage removal fails", async () => {
    const events: string[] = [];
    const result = await completeMediaCleanup(admin(events), { listingId: "listing" }, () => ({ remove: async () => ({ error: "failure" }) }) as unknown as MediaStorage);
    expect(result.error).toBeTruthy(); expect(events).toEqual([]);
  });
});
