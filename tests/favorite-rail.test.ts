import { describe, expect, it } from "vitest";
import {
  FAVORITE_RAIL_BATCH_SIZE,
  getFavoriteRailBatch,
  reconcileFavoriteRailState,
  shouldRunFavoriteRailAnimation,
  toFavoriteRailItem,
  type FavoriteRailItem,
} from "@/lib/favorite-rail";
import type { Listing } from "@/lib/types";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    slug: "boxed-console",
    title: "Boxed console",
    description: "Complete with the original controller and cables.",
    price: 450,
    currency: "EUR",
    location: "Athens",
    condition: "like_new",
    status: "active",
    category: { id: "category", name: "Consoles", slug: "consoles", icon: "gamepad" },
    images: ["https://example.test/signed/console.webp"],
    seller: {
      id: "seller",
      username: "arcade",
      displayName: "Arcade Vault",
      rating: 4.8,
      reviewCount: 32,
      verified: true,
      memberSince: "2025-01-01T00:00:00.000Z",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    views: 10,
    shipping: true,
    meetup: true,
    attributes: { intent: "sale" },
    isFavorite: true,
    ...overrides,
  };
}

function railItems(count: number): FavoriteRailItem[] {
  return Array.from({ length: count }, (_, index) =>
    toFavoriteRailItem(listing({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      title: `Listing ${index + 1}`,
    })),
  );
}

describe("toFavoriteRailItem", () => {
  it("maps only real listing fields into a product rail item", () => {
    const item = toFavoriteRailItem(listing());

    expect(item).toEqual({
      id: "77777777-7777-4777-8777-777777777777",
      href: "/listing/77777777-7777-4777-8777-777777777777",
      title: "Boxed console",
      description: "Complete with the original controller and cables.",
      priceLabel: "€450",
      image: "https://example.test/signed/console.webp",
      category: "Consoles",
      condition: "Like new",
      sellerName: "Arcade Vault",
      sellerVerified: true,
      location: "Athens",
      shipping: true,
      meetup: true,
      status: "active",
    });
  });

  it("preserves wanted budget semantics and the listing currency", () => {
    const item = toFavoriteRailItem(listing({
      price: 900,
      currency: "USD",
      attributes: { intent: "wanted", wanted_budget_min: 600 },
    }));

    expect(item.priceLabel).toBe("US$600–US$900");
  });

  it("uses null for a missing primary image instead of fabricating one", () => {
    expect(toFavoriteRailItem(listing({ images: [] })).image).toBeNull();
  });
});

describe("favorite rail batching", () => {
  it("caps the simulated collection at eight and reports the visible range", () => {
    const items = railItems(18);
    const batch = getFavoriteRailBatch(items, 1);

    expect(FAVORITE_RAIL_BATCH_SIZE).toBe(8);
    expect(batch.items.map((item) => item.title)).toEqual([
      "Listing 9", "Listing 10", "Listing 11", "Listing 12",
      "Listing 13", "Listing 14", "Listing 15", "Listing 16",
    ]);
    expect(batch).toMatchObject({ batch: 1, batchCount: 3, start: 9, end: 16, total: 18 });
  });

  it("clamps a removed last batch and moves selection to a remaining listing", () => {
    const items = railItems(8);
    const result = reconcileFavoriteRailState(
      { batch: 1, activeId: "removed", flippedId: "removed" },
      items,
    );

    expect(result).toEqual({ batch: 0, activeId: items[0]?.id, flippedId: null });
  });

  it("keeps a selected listing by ID when it remains in the current batch", () => {
    const items = railItems(10);
    const selected = items[9]?.id ?? null;

    expect(reconcileFavoriteRailState({ batch: 1, activeId: selected, flippedId: selected }, items))
      .toEqual({ batch: 1, activeId: selected, flippedId: selected });
  });

  it("returns an inert state for an empty collection", () => {
    expect(reconcileFavoriteRailState({ batch: 4, activeId: "old", flippedId: "old" }, []))
      .toEqual({ batch: 0, activeId: null, flippedId: null });
  });
});

describe("favorite rail animation scheduling", () => {
  it.each([
    [{ busy: true, reduced: false, documentVisible: true, intersecting: true }, true],
    [{ busy: false, reduced: false, documentVisible: true, intersecting: true }, false],
    [{ busy: true, reduced: true, documentVisible: true, intersecting: true }, false],
    [{ busy: true, reduced: false, documentVisible: false, intersecting: true }, false],
    [{ busy: true, reduced: false, documentVisible: true, intersecting: false }, false],
  ])("returns %s for %o", (input, expected) => {
    expect(shouldRunFavoriteRailAnimation(input)).toBe(expected);
  });
});
