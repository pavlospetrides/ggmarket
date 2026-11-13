import { describe, expect, it } from "vitest";
import { moveProfilePan, profileCropForView } from "../lib/profile-crop";

describe("profile editor crop", () => {
  it("maps square and wide previews to source rectangles", () => {
    expect(profileCropForView(600, 300, "avatar", 1, 0.5, 0.5)).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 });
    expect(profileCropForView(600, 300, "cover", 1, 0.5, 0.5).y).toBeCloseTo(1 / 6);
  });
  it("keeps zoom and drag inside the source bounds", () => {
    const crop = profileCropForView(600, 300, "avatar", 2, 1, 1);
    expect(crop.x + crop.width).toBe(1);
    expect(crop.y + crop.height).toBe(1);
    expect(moveProfilePan(0.5, 1000, 200, crop.width)).toBe(0);
  });
});
