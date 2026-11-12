import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectListingImagesForDelivery } from "../lib/listing-media";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const rows = [
  {
    id: "second",
    storage_path: "listing/second/original.webp",
    card_path: "listing/second/card.webp",
    detail_path: "listing/second/detail.webp",
    sort_order: 1,
  },
  {
    id: "first",
    storage_path: "listing/first/original.webp",
    card_path: "listing/first/card.webp",
    detail_path: "listing/first/detail.webp",
    sort_order: 0,
  },
];

describe("listing image signing selection", () => {
  it("selects only the first ordered card image for a collection", () => {
    expect(selectListingImagesForDelivery(rows, "card")).toEqual([
      { record: rows[1], path: rows[1].card_path },
    ]);
  });

  it("selects every ordered detail image for a listing page", () => {
    expect(selectListingImagesForDelivery(rows, "detail")).toEqual([
      { record: rows[1], path: rows[1].detail_path },
      { record: rows[0], path: rows[0].detail_path },
    ]);
  });

  it("falls back to the legacy original without losing its order", () => {
    const legacy = [{ id: "legacy", storage_path: "old/photo.jpg", sort_order: 3 }];

    expect(selectListingImagesForDelivery(legacy, "card")).toEqual([
      { record: legacy[0], path: "old/photo.jpg" },
    ]);
    expect(selectListingImagesForDelivery(legacy, "detail")).toEqual([
      { record: legacy[0], path: "old/photo.jpg" },
    ]);
  });
});

describe("data access media bounds", () => {
  it("selects variant metadata and keeps one batched one-hour signing call", () => {
    const source = read("lib/data.ts");

    expect(source).toContain("card_path,detail_path");
    expect(source).toContain("selectListingImagesForDelivery(row.images, imagePurpose)");
    expect(source).toContain("signAuthorizedListingImages(selections");
    expect(source).not.toContain("imagePaths.map(async (path)");
    expect(source).toContain('enrichRows(supabase, [data as unknown as ListingRow], "detail")');
  });

  it("batches conversation card signing instead of signing once per row", () => {
    const source = read("lib/phase2-data.ts");

    expect(source).toContain("listing_images(storage_path,card_path,storage_provider,sort_order)");
    expect(source).toContain("signAuthorizedListingImages(selections");
    expect(source).not.toContain("createSignedUrl(imagePath, 3600)");
  });
});
