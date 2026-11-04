import { describe, expect, it } from "vitest";
import {
  classifyFavoriteRailGesture,
  favoriteRailCarouselIndex,
  favoriteRailIdentityChanged,
  favoriteRailLayoutTargets,
  favoriteRailMinGap,
  favoriteRailResponsiveSize,
  softenFavoriteRailPull,
} from "@/lib/favorite-rail";

describe("favorite lanyard physics helpers", () => {
  it("centers larger desktop cards with collision-safe spacing", () => {
    const targets = favoriteRailLayoutTargets(1334, 210.5, false, null, 5).xs;

    expect(targets).toEqual([199.69, 433.34, 667, 900.66, 1134.31]);
    expect(targets[1]! - targets[0]!).toBeGreaterThanOrEqual(favoriteRailMinGap(210.5, 0, 0));
  });

  it.each([
    { label: "320px mobile", width: 288, count: 5, cardWidth: 138, carousel: true, compact: true },
    { label: "390px mobile", width: 358, count: 5, cardWidth: 154, carousel: true, compact: true },
    { label: "tablet with two cards", width: 720, count: 2, cardWidth: 176, carousel: false, compact: false },
    { label: "1024px desktop with five cards", width: 992, count: 5, cardWidth: 210, carousel: true, compact: false },
    { label: "1366px desktop with five cards", width: 1334, count: 5, cardWidth: 210.5, carousel: false, compact: false },
    { label: "1366px desktop with eight cards", width: 1334, count: 8, cardWidth: 240, carousel: true, compact: false },
    { label: "1440px desktop with five cards", width: 1408, count: 5, cardWidth: 230.5, carousel: true, compact: false },
    { label: "1920px desktop with five cards", width: 1760, count: 5, cardWidth: 260, carousel: false, compact: false },
    { label: "single desktop card", width: 1334, count: 1, cardWidth: 240, carousel: false, compact: false },
    { label: "empty desktop rail", width: 1334, count: 0, cardWidth: 240, carousel: false, compact: false },
  ])("chooses readable responsive geometry for $label", ({ width, count, cardWidth, carousel, compact }) => {
    expect(favoriteRailResponsiveSize(width, count)).toEqual({ cardWidth, carousel, compact });
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

  it.each([
    {
      label: "quick vertical touch over a card",
      input: { deltaX: 2, deltaY: 24, elapsedMs: 45, pointerType: "touch", index: 0, carousel: true, reduced: false },
      expected: "none",
    },
    {
      label: "held downward touch over a card",
      input: { deltaX: 2, deltaY: 24, elapsedMs: 220, pointerType: "touch", index: 0, carousel: true, reduced: false },
      expected: "pull",
    },
    {
      label: "vertical touch between cards",
      input: { deltaX: 1, deltaY: 28, elapsedMs: 250, pointerType: "touch", index: -1, carousel: true, reduced: false },
      expected: "none",
    },
    {
      label: "clear horizontal carousel swipe",
      input: { deltaX: -26, deltaY: 3, elapsedMs: 50, pointerType: "touch", index: 0, carousel: true, reduced: false },
      expected: "swipe",
    },
    {
      label: "small diagonal movement",
      input: { deltaX: 9, deltaY: 8, elapsedMs: 60, pointerType: "touch", index: 0, carousel: true, reduced: false },
      expected: "pending",
    },
    {
      label: "large ambiguous movement",
      input: { deltaX: 18, deltaY: 17, elapsedMs: 80, pointerType: "touch", index: 0, carousel: true, reduced: false },
      expected: "none",
    },
    {
      label: "mouse pull",
      input: { deltaX: 1, deltaY: 12, elapsedMs: 20, pointerType: "mouse", index: 0, carousel: false, reduced: false },
      expected: "pull",
    },
    {
      label: "desktop drag",
      input: { deltaX: 18, deltaY: 2, elapsedMs: 20, pointerType: "mouse", index: 0, carousel: false, reduced: false },
      expected: "drag",
    },
    {
      label: "reduced-motion desktop drag",
      input: { deltaX: 18, deltaY: 2, elapsedMs: 20, pointerType: "mouse", index: 0, carousel: false, reduced: true },
      expected: "none",
    },
  ])("classifies $label as $expected", ({ input, expected }) => {
    expect(classifyFavoriteRailGesture(input)).toBe(expected);
  });
});
