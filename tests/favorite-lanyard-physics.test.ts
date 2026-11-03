import { describe, expect, it } from "vitest";
import {
  favoriteRailCarouselIndex,
  favoriteRailIdentityChanged,
  favoriteRailLayoutTargets,
  favoriteRailMinGap,
  softenFavoriteRailPull,
} from "@/lib/favorite-rail";

describe("favorite lanyard physics helpers", () => {
  it("centers desktop cards with bounded spacing", () => {
    expect(favoriteRailLayoutTargets(1000, 124, false, null, 4).xs)
      .toEqual([198.68, 399.56, 600.44, 801.32]);
  });

  it("places the active mobile card in the viewport center", () => {
    const result = favoriteRailLayoutTargets(390, 110, true, 2, 5);

    expect(result.xs).toEqual([-69, 63, 195, 327, 459]);
    expect(result.total).toBe(660);
  });

  it("softens excessive pull without exceeding the reel limit", () => {
    expect(softenFavoriteRailPull(24, 64)).toBe(24);
    expect(softenFavoriteRailPull(200, 64)).toBeGreaterThan(48);
    expect(softenFavoriteRailPull(200, 64)).toBeLessThan(64);
  });

  it("increases collision clearance for popped cards", () => {
    expect(favoriteRailMinGap(120, 0, 0)).toBeCloseTo(128.4);
    expect(favoriteRailMinGap(120, 1, 0)).toBeCloseTo(133.2);
  });

  it("detects any listing identity or ordering change", () => {
    expect(favoriteRailIdentityChanged(["a", "b"], ["a", "b"])).toBe(false);
    expect(favoriteRailIdentityChanged(["a", "b"], ["b", "a"])).toBe(true);
    expect(favoriteRailIdentityChanged(["a", "b"], ["a"])).toBe(true);
  });

  it("uses swipe distance or velocity and clamps a finite carousel", () => {
    expect(favoriteRailCarouselIndex({ current: 2, deltaX: -45, velocity: 0, count: 5, cyclic: false })).toBe(3);
    expect(favoriteRailCarouselIndex({ current: 2, deltaX: 10, velocity: -0.5, count: 5, cyclic: false })).toBe(3);
    expect(favoriteRailCarouselIndex({ current: 0, deltaX: 60, velocity: 0, count: 5, cyclic: false })).toBe(0);
  });

  it("wraps a cyclic carousel and safely handles an empty collection", () => {
    expect(favoriteRailCarouselIndex({ current: 4, deltaX: -60, velocity: 0, count: 5, cyclic: true })).toBe(0);
    expect(favoriteRailCarouselIndex({ current: 0, deltaX: 60, velocity: 0, count: 5, cyclic: true })).toBe(4);
    expect(favoriteRailCarouselIndex({ current: 0, deltaX: -60, velocity: 0, count: 0, cyclic: true })).toBe(0);
  });
});
