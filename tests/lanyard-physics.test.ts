import { describe, expect, it } from "vitest";
import { integrate, solve, spinStep, swingAngle, type Pt } from "../components/ui/lanyard-badge";

describe("lanyard physics", () => {
  it("keeps pinned points fixed and advances weighted points by velocity and gravity", () => {
    const points: Pt[] = [
      { x: 5, y: 7, px: 1, py: 2, w: 0 },
      { x: 10, y: 20, px: 8, py: 17, w: 1 },
    ];
    integrate(points, 0.5, 4, 0.5);
    expect(points[0]).toEqual({ x: 5, y: 7, px: 1, py: 2, w: 0 });
    expect(points[1]).toEqual({ x: 11, y: 22.5, px: 10, py: 20, w: 1 });
  });

  it("relaxes a link to its rest length without moving its pinned endpoint", () => {
    const points: Pt[] = [
      { x: 0, y: 0, px: 0, py: 0, w: 0 },
      { x: 20, y: 0, px: 20, py: 0, w: 1 },
    ];
    solve(points, [[0, 1, 10]], 1);
    expect(points[0].x).toBe(0);
    expect(points[1].x).toBeCloseTo(10);
  });

  it("reports rightward swing as positive and advances ring spin toward its target", () => {
    expect(swingAngle({ x: 0, y: 0 } as Pt, { x: 10, y: 10 } as Pt)).toBeCloseTo(Math.PI / 4);
    const spin = { a: 0, v: 0 };
    spinStep(spin, Math.PI, 0.01, 0);
    expect(spin.a).toBeGreaterThan(0);
    expect(spin.v).toBeGreaterThan(0);
  });
});
