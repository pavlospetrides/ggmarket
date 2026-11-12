import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { buildProfileMediaPath, processProfileMedia } from "../lib/profile-media";

const owner = "e5710eb1-8604-4be9-a573-0cc73a5027b9";
const mediaId = "b7a5fb8b-bf47-4a6e-8d42-8102f04eb63f";

describe("profile media processing", () => {
  it("creates a square high resolution avatar from the selected crop", async () => {
    const input = await sharp({ create: { width: 400, height: 200, channels: 3, background: "red" } }).png().toBuffer();
    const output = await processProfileMedia(input, "avatar", { x: 0.5, y: 0, width: 0.5, height: 1 }, "image/png");
    expect((await sharp(output).metadata())).toMatchObject({ format: "webp", width: 1024, height: 1024 });
  });

  it("creates a wide cover without retaining metadata", async () => {
    const input = await sharp({ create: { width: 600, height: 200, channels: 3, background: "blue" } }).jpeg().toBuffer();
    const output = await processProfileMedia(input, "cover", { x: 0, y: 0, width: 1, height: 1 }, "image/jpeg");
    expect((await sharp(output).metadata())).toMatchObject({ format: "webp", width: 2400, height: 800 });
  });

  it("rejects malformed bytes, MIME mismatch and arbitrary crop", async () => {
    await expect(processProfileMedia(Buffer.from("not image"), "avatar", { x: 0, y: 0, width: 1, height: 1 }, "image/png")).rejects.toThrow();
    const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } }).png().toBuffer();
    await expect(processProfileMedia(input, "avatar", { x: 0, y: 0, width: 1, height: 1 }, "image/jpeg")).rejects.toThrow();
    await expect(processProfileMedia(input, "avatar", { x: -0.1, y: 0, width: 1, height: 1 }, "image/png")).rejects.toThrow();
    await expect(processProfileMedia(input, "avatar", { x: 0, y: 0, width: 0, height: 1 }, "image/png")).rejects.toThrow();
  });

  it("accepts only owner scoped generated paths", () => {
    expect(buildProfileMediaPath(owner, "avatar", mediaId)).toBe(`profile-media/${owner}/avatar/${mediaId}.webp`);
    expect(() => buildProfileMediaPath("../other", "cover", mediaId)).toThrow();
    expect(() => buildProfileMediaPath(owner, "cover", "../other")).toThrow();
  });
});
