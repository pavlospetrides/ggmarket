import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ removed: [] as string[], mutation: false, deleted: true, unavailable: false, owner: "seller", count: 2, status: "active" }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getUser: async () => ({ id: "seller" }) }));
vi.mock("@/lib/listing-media-storage", async () => import("../lib/listing-media-storage"));
vi.mock("@/lib/listing-media-delivery", async () => import("../lib/listing-media-delivery"));
vi.mock("@/lib/media-storage/cleanup", () => ({ completeMediaCleanup: async () => {
  state.removed.push("owner/listing/image/original.webp", "owner/listing/image/card.webp");
  return { error: null };
} }));
vi.mock("@/lib/media-storage", () => ({ storedMediaProvider: (value: string | null) => value ?? "supabase", createMediaStorage: () => {
  if (state.unavailable) throw new Error("unavailable");
  return { remove: async (paths: string[]) => { state.removed.push(...paths); return { error: null }; } };
} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => {
  let deleting = false;
  const query = {
    select: () => query, eq: () => query,
    delete: () => { state.mutation = true; deleting = true; return query; },
    maybeSingle: async () => ({ data: deleting ? state.deleted ? { id: "image" } : null : { id: "image", listing_id: "listing", storage_provider: "r2", storage_path: "owner/listing/image/original.webp", card_path: "owner/listing/image/card.webp", detail_path: null, listing: { seller_id: state.owner, status: state.status } }, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ count: state.count, error: null }).then(resolve),
  }; return query;
} }) }));
import { DELETE } from "../app/api/listing-images/[id]/route";
const remove = () => DELETE(new Request("https://test.invalid/api/image", { method: "DELETE" }), { params: Promise.resolve({ id: "image" }) });
describe("RLS-gated provider image deletion", () => {
  beforeEach(() => Object.assign(state, { removed: [], mutation: false, deleted: true, unavailable: false, owner: "seller", count: 2, status: "active" }));
  it("cleans exact recorded R2 keys only after an affected-row authorization result", async () => { expect((await remove()).status).toBe(200); expect(state.removed).toEqual(["owner/listing/image/original.webp", "owner/listing/image/card.webp"]); });
  it("does not clean objects when RLS returns no deleted row", async () => { state.deleted = false; expect((await remove()).status).toBe(400); expect(state.removed).toEqual([]); });
  it("does not delete metadata when provider configuration is missing", async () => { state.unavailable = true; expect((await remove()).status).toBe(503); expect(state.mutation).toBe(false); expect(state.removed).toEqual([]); });
  it("does not remove the last active listing image", async () => { state.count = 1; expect((await remove()).status).toBe(400); expect(state.mutation).toBe(false); });
  it("rejects another seller before mutation", async () => { state.owner = "foreign"; expect((await remove()).status).toBe(404); expect(state.mutation).toBe(false); });
});
