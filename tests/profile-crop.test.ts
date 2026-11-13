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
  it("returns finite bounded coordinates for invalid dimensions and controls", () => {
    for (const crop of [
      profileCropForView(0, 300, "avatar", 1, 0.5, 0.5),
      profileCropForView(300, Number.NaN, "cover", Number.POSITIVE_INFINITY, -9, 8),
      profileCropForView(600, 300, "avatar", 0, Number.NaN, Number.POSITIVE_INFINITY),
    ]) {
      for (const value of Object.values(crop)) expect(Number.isFinite(value)).toBe(true);
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.width).toBeGreaterThan(0);
      expect(crop.height).toBeGreaterThan(0);
      expect(crop.x + crop.width).toBeLessThanOrEqual(1);
      expect(crop.y + crop.height).toBeLessThanOrEqual(1);
    }
    expect(moveProfilePan(0.5, Number.NaN, 0, Number.POSITIVE_INFINITY)).toBe(0.5);
    expect(moveProfilePan(Number.NaN, 30, 100, 0.5)).toBe(0.5);
  });
});
