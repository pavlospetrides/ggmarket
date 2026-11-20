import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  unstableCache: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/data", () => ({ getCategories: mocks.getCategories }));
vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));

describe("public catalog cache boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getCategories.mockReset();
    mocks.unstableCache.mockReset();
    mocks.getCategories.mockResolvedValue([{ id: "category-1", name: "Games" }]);
    mocks.unstableCache.mockImplementation((loader: () => Promise<unknown>) => {
      let value: Promise<unknown> | null = null;
      return () => value ??= loader();
    });
  });

  it("caches only the parameterless public category loader for five minutes", async () => {
    const { getCachedCategories } = await import("@/lib/public-catalog");

    expect(getCachedCategories.length).toBe(0);
    await expect(getCachedCategories()).resolves.toEqual([{ id: "category-1", name: "Games" }]);
    await expect(getCachedCategories()).resolves.toEqual([{ id: "category-1", name: "Games" }]);
    expect(mocks.getCategories).toHaveBeenCalledTimes(1);
    expect(mocks.unstableCache).toHaveBeenCalledTimes(1);
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-categories"],
      { revalidate: 300, tags: ["public-categories"] },
    );
  });
});
