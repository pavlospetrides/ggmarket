import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: true, listing: true, active: true, metadata: null as unknown, failure: false, provider: "r2", writes: [] as string[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getUser: async () => state.user ? { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } : null }));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/listing-media", async () => import("../lib/listing-media"));
vi.mock("@/lib/listing-media-storage", async () => import("../lib/listing-media-storage"));
vi.mock("@/lib/media-storage/uploads", () => ({ reserveUploadProvider: async () => state.provider }));
vi.mock("@/lib/media-storage/config", async () => import("../lib/media-storage/config"));
vi.mock("@/lib/media-storage", () => ({ createMediaStorage: () => {
  if (state.failure) throw new Error("credentials must not escape");
  return { upload: async (path: string) => { state.writes.push(path); return { error: null }; }, remove: async () => ({ error: null }) };
} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  rpc: async () => ({ data: state.active, error: null }),
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, in: () => query,
      maybeSingle: async () => ({ data: table === "listings" && state.listing ? { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } : null, error: null }),
      insert: (payload: unknown) => { state.metadata = payload; state.writes.push("metadata"); return query; },
      single: async () => ({ data: state.metadata, error: null }),
    }; return query;
  },
}) }));
import { POST } from "../app/api/listings/[id]/images/route";
const listingId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const uploadId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
async function upload(bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")) {
  const form = new FormData(); form.set("uploadId", uploadId); form.set("sortOrder", "0"); form.set("image", new File([bytes], "image.png", { type: "image/png" }));
  return POST(new Request("https://test.invalid/upload", { method: "POST", body: form }), { params: Promise.resolve({ id: listingId }) });
}
describe("provider upload route (mock cloud and RLS responses)", () => {
  beforeEach(() => { Object.assign(state, { user: true, listing: true, active: true, metadata: null, failure: false, provider: "r2", writes: [] }); });
  it("records R2 only after all generated variants have been uploaded", async () => {
    const response = await upload(); expect(response.status).toBe(201);
    expect(state.metadata).toMatchObject({ storage_provider: "r2", id: uploadId, listing_id: listingId });
    expect(state.writes.map((path) => path.split("/").at(-1))).toEqual(["original.webp", "detail.webp", "card.webp", "metadata"]);
  });
  it("rejects a suspended actor before writing objects", async () => { state.active = false; expect((await upload()).status).toBe(403); expect(state.writes).toEqual([]); });
  it("rejects cross-account or unavailable listing rows", async () => { state.listing = false; expect((await upload()).status).toBe(404); expect(state.writes).toEqual([]); });
  it("rejects anonymous uploads", async () => { state.user = false; expect((await upload()).status).toBe(401); expect(state.writes).toEqual([]); });
  it("fails safely before objects or metadata when provider initialization fails", async () => { state.failure = true; const response = await upload(); expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("credentials"); expect(state.writes).toEqual([]); });
  it("rejects spoofed image bytes", async () => { expect((await upload(Buffer.from("not an image"))).status).toBe(400); expect(state.writes).toEqual([]); });
});
