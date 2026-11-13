import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({ user: null as { id: string } | null, active: true, claim: true, ambiguousUpdate: false, profile: { avatar_path: null as string | null, cover_path: null as string | null }, uploads: [] as string[], removals: [] as string[] }));
vi.mock("@/lib/auth", () => ({ getUser: async () => mocks.user }));
vi.mock("@/lib/profile-media-storage", () => ({ profileMediaBucket: () => ({ upload: async (path: string) => { mocks.uploads.push(path); return { error: null }; }, remove: async (paths: string[]) => { mocks.removals.push(...paths); return { error: null }; }, createSignedUrls: async () => ({ data: [], error: null }) }), cleanupProfileMedia: async () => ({ pending: false }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }) }));
vi.mock("@/lib/supabase/server", () => {
  const finishUpdate = (change: Record<string, string | null>) => async () => {
    Object.assign(mocks.profile, change);
    return mocks.ambiguousUpdate ? { data: null, error: { code: "connection-lost" } } : { data: mocks.profile, error: null };
  };
  return { createClient: async () => ({
    rpc: async (name: string) => ({ data: name === "is_active_user" ? mocks.active : mocks.claim, error: null }),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.profile, error: null }) }) }),
      update: (change: Record<string, string | null>) => ({ eq: () => ({
        is: () => ({ select: () => ({ maybeSingle: finishUpdate(change) }) }),
        eq: () => ({ select: () => ({ maybeSingle: finishUpdate(change) }) }),
      }) }),
    }),
  }) };
});

const owner = "e5710eb1-8604-4be9-a573-0cc73a5027b9";
beforeEach(() => { mocks.user = { id: owner }; mocks.active = true; mocks.claim = true; mocks.ambiguousUpdate = false; mocks.profile.avatar_path = null; mocks.profile.cover_path = null; mocks.uploads = []; mocks.removals = []; });

describe("profile media route", () => {
  async function upload(kind: string, mime = "image/png", data?: Uint8Array, crop?: object) {
    const { POST } = await import("../app/api/profile/media/[kind]/route");
    const pixels = data ?? await sharp({ create: { width: 600, height: 600, channels: 3, background: "red" } }).png().toBuffer();
    const form = new FormData();
    form.set("image", new File([new Uint8Array(pixels)], "photo.png", { type: mime }));
    form.set("crop", JSON.stringify(crop ?? (kind === "avatar" ? { x: 0, y: 0, width: 1, height: 1 } : { x: 0, y: 1 / 3, width: 1, height: 1 / 3 })));
    return POST(new Request("https://lootriva.test/api/profile/media/" + kind, { method: "POST", body: form }), { params: Promise.resolve({ kind }) });
  }

  it("uploads avatar and cover to new owner scoped R2 paths", async () => {
    expect((await upload("avatar")).status).toBe(201);
    expect((await upload("cover")).status).toBe(201);
    expect(mocks.uploads).toHaveLength(2);
    expect(mocks.uploads[0]).toMatch(new RegExp(`^profile-media/${owner}/avatar/[0-9a-f-]+\\.webp$`));
    expect(mocks.uploads[1]).toMatch(new RegExp(`^profile-media/${owner}/cover/[0-9a-f-]+\\.webp$`));
    expect(mocks.profile.avatar_path).toBe(mocks.uploads[0]);
    expect(mocks.profile.cover_path).toBe(mocks.uploads[1]);
  });

  it("rejects invalid MIME, malformed content and excessive body size", async () => {
    expect((await upload("avatar", "image/svg+xml")).status).toBe(400);
    expect((await upload("avatar", "image/png", Buffer.from("broken"))).status).toBe(400);
    const { POST } = await import("../app/api/profile/media/[kind]/route");
    const oversized = await POST(new Request("https://lootriva.test", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=x", "content-length": "11000000" }, body: "x" }), { params: Promise.resolve({ kind: "avatar" }) });
    expect(oversized.status).toBe(400);
    expect(mocks.uploads).toEqual([]);
  });

  it("enforces database rate limit before storing bytes", async () => {
    mocks.claim = false;
    expect((await upload("avatar")).status).toBe(429);
    expect(mocks.uploads).toEqual([]);
  });

  it("replaces an avatar with a distinct path and preserves the previous metadata until upload succeeds", async () => {
    const first = await upload("avatar");
    expect(first.status).toBe(201);
    const oldPath = mocks.profile.avatar_path;
    const second = await upload("avatar");
    expect(second.status).toBe(201);
    expect(mocks.profile.avatar_path).not.toBe(oldPath);
    expect(mocks.removals).toEqual([]);
  });

  it("does not change another account through a supplied path or profile field", async () => {
    const { POST } = await import("../app/api/profile/media/[kind]/route");
    const form = new FormData();
    const pixels = await sharp({ create: { width: 100, height: 100, channels: 3, background: "red" } }).png().toBuffer();
    form.set("image", new File([new Uint8Array(pixels)], "avatar.png", { type: "image/png" }));
    form.set("crop", JSON.stringify({ x: 0, y: 0, width: 1, height: 1 }));
    form.set("profileId", "11111111-1111-4111-8111-111111111111");
    form.set("path", "profile-media/11111111-1111-4111-8111-111111111111/avatar/11111111-1111-4111-8111-111111111111.webp");
    const response = await POST(new Request("https://lootriva.test", { method: "POST", body: form }), { params: Promise.resolve({ kind: "avatar" }) });
    expect(response.status).toBe(201);
    expect(mocks.uploads[0]).toMatch(new RegExp(`^profile-media/${owner}/avatar/`));
  });
  it("rejects unauthenticated and suspended uploads before R2", async () => {
    const { POST } = await import("../app/api/profile/media/[kind]/route");
    mocks.user = null;
    expect((await POST(new Request("https://lootriva.test", { method: "POST" }), { params: Promise.resolve({ kind: "avatar" }) })).status).toBe(401);
    mocks.user = { id: owner }; mocks.active = false;
    expect((await POST(new Request("https://lootriva.test", { method: "POST" }), { params: Promise.resolve({ kind: "avatar" }) })).status).toBe(403);
    expect(mocks.uploads).toEqual([]);
  });

  it("rejects path manipulation and invalid kind", async () => {
    const { POST } = await import("../app/api/profile/media/[kind]/route");
    const response = await POST(new Request("https://lootriva.test", { method: "POST" }), { params: Promise.resolve({ kind: "../avatar" }) });
    expect(response.status).toBe(404);
  });

  it("removes only the session owner's avatar metadata", async () => {
    const { DELETE } = await import("../app/api/profile/media/[kind]/route");
    mocks.profile.avatar_path = `profile-media/${owner}/avatar/b7a5fb8b-bf47-4a6e-8d42-8102f04eb63f.webp`;
    const response = await DELETE(new Request("https://lootriva.test", { method: "DELETE" }), { params: Promise.resolve({ kind: "avatar" }) });
    expect(response.status).toBe(200);
    expect(mocks.profile.avatar_path).toBeNull();
    expect(mocks.removals).toEqual([]);
  });

  it("reconciles a committed removal after an ambiguous database response", async () => {
    const { DELETE } = await import("../app/api/profile/media/[kind]/route");
    mocks.profile.avatar_path = `profile-media/${owner}/avatar/b7a5fb8b-bf47-4a6e-8d42-8102f04eb63f.webp`;
    mocks.ambiguousUpdate = true;
    const response = await DELETE(new Request("https://lootriva.test", { method: "DELETE" }), { params: Promise.resolve({ kind: "avatar" }) });
    expect(response.status).toBe(200);
    expect(mocks.profile.avatar_path).toBeNull();
  });
});
