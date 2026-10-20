import { describe, expect, it } from "vitest";
import {
  buildListingTaxonomyAttributes,
  isTaxonomySelectionComplete,
  type TaxonomySelection,
} from "../components/taxonomy-selector";

describe("seller taxonomy payloads", () => {
  it.each([
    [{ categorySlug: "games", family: "playstation", platform: "ps5" }, "ps5"],
    [{ categorySlug: "games", family: "playstation", platform: "psp" }, "psp"],
    [{ categorySlug: "games", family: "xbox", platform: "xbox-one" }, "xbox-one"],
    [{ categorySlug: "games", family: "nintendo", platform: "switch" }, "switch"],
  ] as [TaxonomySelection, string][]) ("serializes a complete game path for %s", (selection, platform) => {
    expect(isTaxonomySelectionComplete(selection)).toBe(true);
    expect(buildListingTaxonomyAttributes(selection, { physical_format: "blu-ray-disc" })).toEqual({
      taxonomy_version: "1",
      subcategory: "game",
      family: selection.family,
      platform,
    });
  });

  it("requires every meaningful level before a seller advances", () => {
    expect(isTaxonomySelectionComplete({ categorySlug: "games" })).toBe(false);
    expect(isTaxonomySelectionComplete({ categorySlug: "games", family: "playstation" })).toBe(false);
    expect(isTaxonomySelectionComplete({ categorySlug: "controllers" })).toBe(false);
    expect(isTaxonomySelectionComplete({ categorySlug: "controllers", subcategory: "gamepad" })).toBe(true);
  });

  it("keeps multiple verified controller compatibility values", () => {
    const result = buildListingTaxonomyAttributes(
      { categorySlug: "controllers", subcategory: "gamepad" },
      { compatibility: ["ps5", "windows-pc"] },
    );
    expect(result).toEqual({ taxonomy_version: "1", subcategory: "gamepad", compatibility: ["ps5", "windows-pc"] });
  });

  it("does not let stale structural field state override a new hierarchy selection", () => {
    expect(buildListingTaxonomyAttributes(
      { categorySlug: "games", family: "nintendo", platform: "switch" },
      { family: "playstation", platform: "ps5", physical_format: "cartridge" },
    )).toMatchObject({ family: "nintendo", platform: "switch" });
  });

  it("keeps free-text exact models separate from console hierarchy models", () => {
    expect(buildListingTaxonomyAttributes(
      { categorySlug: "pc-components", subcategory: "gpu" },
      { gpu_chipset_vendor: "nvidia", gpu_series: "rtx-40", gpu_model: "rtx-4070", manufacturer: "asus", exact_model: "DUAL-RTX4070-O12G" },
    )).toMatchObject({ subcategory: "gpu", gpu_model: "rtx-4070", exact_model: "DUAL-RTX4070-O12G" });
  });

  it("drops hidden fields when a seller changes product type", () => {
    expect(buildListingTaxonomyAttributes(
      { categorySlug: "pc-components", subcategory: "cpu" },
      { manufacturer: "amd", socket: "am5", cpu_family: "ryzen-7", cpu_generation: "ryzen-7000", cpu_model: "ryzen-7-7800x3d", vram_gb: 12, used_for_mining: true },
    )).toEqual({ taxonomy_version: "1", subcategory: "cpu", manufacturer: "amd", socket: "am5", cpu_family: "ryzen-7", cpu_generation: "ryzen-7000", cpu_model: "ryzen-7-7800x3d" });
  });

  it("removes incompatible taxonomy fields but preserves unrelated seller work", () => {
    const preserved = {
      platform: "ps5",
      physical_format: "blu-ray-disc",
      genre: "rpg",
      seller_note: "Includes receipt",
      intent: "sale",
    };
    expect(buildListingTaxonomyAttributes(
      { categorySlug: "pc-components", subcategory: "gpu" },
      { gpu_chipset_vendor: "nvidia", gpu_series: "rtx-40", gpu_model: "rtx-4070", manufacturer: "asus", vram_gb: 12 },
      preserved,
    )).toEqual({
      taxonomy_version: "1",
      subcategory: "gpu",
      gpu_chipset_vendor: "nvidia",
      gpu_series: "rtx-40",
      gpu_model: "rtx-4070",
      manufacturer: "asus",
      vram_gb: 12,
      physical_format: "blu-ray-disc",
      seller_note: "Includes receipt",
      intent: "sale",
    });
  });
});
