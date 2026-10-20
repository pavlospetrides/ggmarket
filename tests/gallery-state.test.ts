import { describe, expect, it } from "vitest";
import { advanceGalleryIndex } from "../lib/gallery-state";

describe("listing gallery state", () => {
  it("advances, reverses, and wraps deterministically", () => {
    expect(advanceGalleryIndex(0, 3, 1)).toBe(1);
    expect(advanceGalleryIndex(1, 3, 1)).toBe(2);
    expect(advanceGalleryIndex(2, 3, 1)).toBe(0);
    expect(advanceGalleryIndex(0, 3, -1)).toBe(2);
  });

  it("keeps a single-image gallery stable", () => {
    expect(advanceGalleryIndex(0, 1, 1)).toBe(0);
  });
});
