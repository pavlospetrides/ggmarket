import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupProfileMedia } from "../lib/profile-media-storage";

const state = vi.hoisted(() => ({ removals: [] as string[], current: null as string | null, jobs: [] as Array<{ path: string; owner_id: string; kind: string }>, failRemove: false, completed: [] as string[] }));
vi.mock("server-only", () => ({}));
vi.mock("../lib/media-storage/config", () => ({ resolveR2Config: () => ({}) }));
vi.mock("../lib/media-storage/r2", () => ({ createR2Storage: () => ({ remove: async (paths: string[]) => { state.removals.push(...paths); return { error: state.failRemove ? "failed" : null }; } }) }));

const owner = "e5710eb1-8604-4be9-a573-0cc73a5027b9";
const path = `profile-media/${owner}/avatar/b7a5fb8b-bf47-4a6e-8d42-8102f04eb63f.webp`;
const foreign = "profile-media/11111111-1111-4111-8111-111111111111/avatar/b7a5fb8b-bf47-4a6e-8d42-8102f04eb63f.webp";

function admin() {
  return { from(table: string) {
    if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { avatar_path: state.current, cover_path: null }, error: null }) }) }) };
    return {
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ limit: async () => ({ data: state.jobs, error: null }) }) }) }) }),
      update: () => ({ eq: (column: string, value: string) => ({ eq: () => ({ is: async () => { state.completed.push(value); return { error: null }; } }) }) }),
    };
  } } as never;
}

beforeEach(() => { state.removals = []; state.current = null; state.jobs = []; state.failRemove = false; state.completed = []; });

describe("profile media cleanup", () => {
  it("removes only obsolete paths with an exact matching owner and kind", async () => {
    state.jobs = [{ path, owner_id: owner, kind: "avatar" }, { path: foreign, owner_id: owner, kind: "avatar" }];
    const result = await cleanupProfileMedia(admin(), owner, "avatar");
    expect(state.removals).toEqual([path]);
    expect(state.completed).toEqual([path]);
    expect(result.pending).toBe(true);
  });

  it("never removes the active object and leaves failed removal retryable", async () => {
    state.jobs = [{ path, owner_id: owner, kind: "avatar" }];
    state.current = path;
    expect((await cleanupProfileMedia(admin(), owner, "avatar")).pending).toBe(true);
    expect(state.removals).toEqual([]);
    state.current = null; state.failRemove = true;
    expect((await cleanupProfileMedia(admin(), owner, "avatar")).pending).toBe(true);
    expect(state.completed).toEqual([]);
  });
});
