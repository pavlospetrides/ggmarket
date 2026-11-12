import { describe, expect, it } from "vitest";
// @ts-expect-error Directly executable ESM operations script, tested at runtime.
import { parseR2BackfillArgs, assertR2BackfillTarget, migrateR2Image, runR2Batch } from "../scripts/backfill-listing-images-to-r2.mjs";

const row = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", listing_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", storage_provider: "supabase", storage_path: "owner/listing/original.webp", card_path: "owner/listing/card.webp", detail_path: "owner/listing/detail.webp" };
function fixture() {
  const objects = new Map<string, Uint8Array>(); const events: string[] = [];
  const bytes = new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80]);
  const source = { download: async (path: string) => { events.push(`read:${path}`); return { data: bytes, error: null }; } };
  const destination = {
    upload: async (path: string, data: Uint8Array) => { events.push(`write:${path}`); objects.set(path, data); return { error: null }; },
    download: async (path: string) => ({ data: objects.get(path), error: null }),
    head: async (path: string) => ({ data: objects.has(path) ? { byteSize: objects.get(path)!.length } : undefined, error: null }),
  };
  const update = async () => { events.push("commit"); return true; };
  return { objects, events, source, destination, update };
}
describe("R2 backfill with in-memory cloud doubles", () => {
  it("defaults to a bounded dry run and validates operator target confirmations", () => {
    expect(parseR2BackfillArgs([])).toMatchObject({ apply: false, batchSize: 25, cursor: null });
    expect(() => parseR2BackfillArgs(["--batch-size", "101"])).toThrow();
    expect(() => parseR2BackfillArgs(["--cursor", "../wrong"])).toThrow();
    expect(() => assertR2BackfillTarget({ apply: true }, "https://testproject.supabase.co", "lootriva-images")).toThrow();
    expect(() => assertR2BackfillTarget({ apply: true, confirmProjectRef: "testproject", confirmR2Bucket: "other" }, "https://testproject.supabase.co", "lootriva-images")).toThrow();
    expect(() => assertR2BackfillTarget({ apply: true, confirmProjectRef: "testproject", confirmR2Bucket: "lootriva-images" }, "https://testproject.supabase.co", "lootriva-images")).not.toThrow();
  });
  it("copies and verifies every recorded variant before provider update", async () => {
    const f = fixture(); await migrateR2Image(row, f);
    expect(f.objects.size).toBe(3); expect(f.events.at(-1)).toBe("commit");
    expect(f.events.filter((event) => event.startsWith("write:"))).toHaveLength(3);
  });
  it("does not upload already verified objects on retry", async () => {
    const f = fixture(); await migrateR2Image(row, f); await migrateR2Image(row, f);
    expect(f.events.filter((event) => event.startsWith("write:"))).toHaveLength(3);
  });
  it("keeps Supabase authoritative when destination integrity verification fails", async () => {
    const f = fixture(); f.destination.download = async () => ({ data: new Uint8Array([0]), error: null });
    await expect(migrateR2Image(row, f)).rejects.toThrow("destination-verification-failed");
    expect(f.events).not.toContain("commit");
  });
  it("skips completed rows and never performs cloud writes in dry-run", async () => {
    const f = fixture(); const logs: string[] = [];
    const result = await runR2Batch([row, { ...row, id: "done", storage_provider: "r2" }], { apply: false }, f, (line: string) => logs.push(line));
    expect(result).toMatchObject({ inspected: 2, planned: 1, applied: 0, failed: 0 }); expect(f.events).toEqual([]);
    expect(logs.join("")).not.toContain("secret");
  });
  it("reports failures safely and preserves a retry cursor before the first failed row", async () => {
    const f = fixture(); f.source.download = async () => { throw new Error("secret credentials"); };
    const logs: string[] = [];
    const result = await runR2Batch([row], { apply: true }, f, (line: string) => logs.push(line));
    expect(result).toMatchObject({ failed: 1, nextCursor: null });
    expect(logs.join("")).not.toContain("secret");
    expect(f.events).not.toContain("commit");
  });
  it("does not commit when the metadata snapshot changed during copying", async () => {
    const f = fixture(); f.update = async () => false;
    await expect(migrateR2Image(row, f)).rejects.toThrow("metadata-snapshot-changed");
  });
});
