import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { signAuthorizedProfileMedia } from "../lib/profile-media-delivery";

const owner = "e5710eb1-8604-4be9-a573-0cc73a5027b9";
const path = `profile-media/${owner}/avatar/b7a5fb8b-bf47-4a6e-8d42-8102f04eb63f.webp`;

describe("profile media delivery", () => {
  it("signs distinct authorized owner paths in one R2 call", async () => {
    const sign = vi.fn(async (paths: string[]) => ({ data: paths.map((p) => ({ path: p, signedUrl: `https://private.test/${p}?signature=one` })), error: null }));
    const urls = await signAuthorizedProfileMedia([{ ownerId: owner, kind: "avatar", path }, { ownerId: owner, kind: "avatar", path }], { createSignedUrls: sign });
    expect(sign).toHaveBeenCalledOnce();
    expect(sign).toHaveBeenCalledWith([path], 3600);
    expect(urls).toEqual([`https://private.test/${path}?signature=one`, `https://private.test/${path}?signature=one`]);
  });

  it("never signs a cross-account or manipulated key", async () => {
    const sign = vi.fn();
    const urls = await signAuthorizedProfileMedia([{ ownerId: "11111111-1111-4111-8111-111111111111", kind: "avatar", path }, { ownerId: owner, kind: "cover", path }], { createSignedUrls: sign });
    expect(urls).toEqual([undefined, undefined]);
    expect(sign).not.toHaveBeenCalled();
  });
});
