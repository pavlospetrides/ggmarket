import { describe, expect, it } from "vitest";
import {
  GAMING_TAXONOMY,
  formatTaxonomyAttribute,
  getTaxonomyFields,
  getTaxonomyPath,
  getTaxonomyRoot,
  isDeprecatedTaxonomyAttribute,
  normalizeTaxonomyAttributes,
  mergeListingAttributes,
  sanitizeTaxonomyAttributesForWrite,
  validateTaxonomyAttributes,
} from "../lib/gaming-taxonomy";

const gamePlatforms = [
  "ps5", "ps4", "ps3", "ps2", "ps1", "psp", "ps-vita",
  "xbox-series-x", "xbox-series-xs", "xbox-one", "xbox-360", "original-xbox",
  "switch-2", "switch", "wii-u", "wii", "nintendo-3ds", "nintendo-ds",
  "gamecube", "nintendo-64", "snes", "nes", "game-boy", "game-boy-color",
  "game-boy-advance", "windows-pc", "macos", "linux",
  "mega-drive", "master-system", "dreamcast", "saturn", "game-gear",
  "atari", "other-legacy",
];

describe("gaming taxonomy", () => {
  it("covers every required physical game platform with stable identifiers", () => {
    const games = getTaxonomyRoot("games");
    expect(games?.id).toBe("games");
    const ids = games?.children?.flatMap((family) => family.children?.map((item) => item.id) ?? []) ?? [];
    expect(ids).toEqual(expect.arrayContaining(gamePlatforms));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    ["ps5", ["Games", "PlayStation", "PlayStation 5"]],
    ["psp", ["Games", "PlayStation", "PlayStation Portable (PSP)"]],
    ["xbox-one", ["Games", "Xbox", "Xbox One"]],
    ["switch-2", ["Games", "Nintendo", "Nintendo Switch 2"]],
  ])("builds the expected category path for %s", (platform, labels) => {
    expect(getTaxonomyPath("games", { subcategory: "game", platform }).map((item) => item.label)).toEqual(labels);
  });

  it("keeps the game platform hierarchy distinct from standalone console models", () => {
    const games = getTaxonomyRoot("games");
    const xbox = games?.children?.find((item) => item.id === "xbox");
    expect(xbox?.children?.some((item) => item.id === "xbox-series-s")).toBe(false);
    expect(xbox?.children?.some((item) => item.id === "xbox-series-xs")).toBe(true);
  });

  it("returns only product-relevant fields and never exposes physical format", () => {
    const gameKeys = getTaxonomyFields("games", { subcategory: "game", platform: "ps5" }).map((field) => field.key);
    expect(gameKeys).toEqual(expect.arrayContaining(["genre", "edition", "packaging", "manuals", "region", "pegi"]));
    expect(gameKeys).not.toContain("physical_format");
    expect(gameKeys).not.toContain("vram_gb");

    const gpuKeys = getTaxonomyFields("pc-components", { subcategory: "gpu" }).map((field) => field.key);
    expect(gpuKeys).toEqual(expect.arrayContaining(["manufacturer", "series", "exact_model", "vram_gb", "used_for_mining"]));
    expect(gpuKeys).not.toContain("pegi");

    expect(getTaxonomyFields("peripherals", { subcategory: "steering-wheel" }).map((field) => field.key)).toEqual(expect.arrayContaining(["compatibility", "pedals_included", "force_feedback"]));
  });

  it("accepts controlled multi-platform compatibility and rejects unknown values", () => {
    expect(validateTaxonomyAttributes("controllers", {
      taxonomy_version: "1",
      subcategory: "gamepad",
      exact_model: "DualSense",
      compatibility: ["ps5", "windows-pc", "android"],
    })).toEqual({ success: true });

    expect(validateTaxonomyAttributes("controllers", {
      taxonomy_version: "1",
      subcategory: "gamepad",
      exact_model: "DualSense",
      compatibility: ["ps5", "definitely-every-console"],
    }).success).toBe(false);
  });

  it("accepts a canonical game payload without physical format", () => {
    expect(validateTaxonomyAttributes("games", {
      taxonomy_version: "1",
      subcategory: "game",
      family: "playstation",
      platform: "ps5",
    })).toEqual({ success: true });
  });

  it("rejects incomplete, mismatched, and category-irrelevant classified payloads", () => {
    expect(validateTaxonomyAttributes("games", { taxonomy_version: "1", subcategory: "game", family: "xbox", platform: "ps5", physical_format: "blu-ray-disc" }).success).toBe(false);
    expect(validateTaxonomyAttributes("games", { taxonomy_version: "1", subcategory: "game", family: "playstation", platform: "ps5", physical_format: "blu-ray-disc", vram_gb: 12 }).success).toBe(false);
    expect(validateTaxonomyAttributes("games", { taxonomy_version: "1", subcategory: "game", family: "playstation", platform: "ps5" }).success).toBe(true);
    expect(validateTaxonomyAttributes("controllers", { taxonomy_version: "1", subcategory: "gamepad", compatibility: ["ps5"], exact_model: "DualSense" })).toEqual({ success: true });
  });

  it("rejects arrays outside controlled multi-value fields", () => {
    expect(validateTaxonomyAttributes("controllers", { taxonomy_version: "1", subcategory: "gamepad", exact_model: "DualSense", compatibility: ["ps5"], arbitrary: ["x"] }).success).toBe(false);
  });

  it("enforces scalar types for text and select taxonomy fields", () => {
    expect(validateTaxonomyAttributes("games", { taxonomy_version: "1", subcategory: "game", family: "playstation", platform: "ps5", genre: 42 }).success).toBe(false);
    expect(validateTaxonomyAttributes("controllers", { taxonomy_version: "1", subcategory: "gamepad", exact_model: 42, manufacturer: true, compatibility: ["ps5"] }).success).toBe(false);
  });

  it("normalizes known legacy labels without rewriting unknown attributes", () => {
    expect(normalizeTaxonomyAttributes("games", {
      platform: "PlayStation 5",
      seller_note: "First owner",
    })).toEqual({
      platform: "ps5",
      seller_note: "First owner",
    });
  });

  it("formats controlled arrays and unknown legacy keys for people", () => {
    expect(formatTaxonomyAttribute("compatibility", ["ps5", "windows-pc"])).toEqual({
      label: "Compatible platforms",
      value: "PlayStation 5, Windows PC",
    });
    expect(formatTaxonomyAttribute("seller_note", "First owner")).toEqual({
      label: "Seller note",
      value: "First owner",
    });
  });

  it("merges edits without dropping unknown legacy attributes", () => {
    expect(mergeListingAttributes(
      { platform: "PlayStation 5", physical_format: "blu-ray-disc", seller_note: "First owner", serial_verified: true },
      { platform: "psp", physical_format: "umd" },
      ["platform", "physical_format"],
    )).toEqual({ seller_note: "First owner", serial_verified: true, platform: "psp", physical_format: "umd" });
  });

  it("can clear all taxonomy-owned keys when a listing changes product class", () => {
    expect(mergeListingAttributes(
      { taxonomy_version: "1", platform: "ps5", physical_format: "blu-ray-disc", seller_note: "Keep me" },
      { taxonomy_version: "1", subcategory: "gpu", manufacturer: "NVIDIA" },
    )).toEqual({ physical_format: "blu-ray-disc", seller_note: "Keep me", taxonomy_version: "1", subcategory: "gpu", manufacturer: "NVIDIA" });
  });

  it("drops physical format from new writes but preserves historical data during an edit merge", () => {
    expect(sanitizeTaxonomyAttributesForWrite({
      taxonomy_version: "1",
      platform: "ps5",
      physical_format: "blu-ray-disc",
      format: "disc",
      genre: "action",
    })).toEqual({ taxonomy_version: "1", platform: "ps5", genre: "action" });

    const historical = { taxonomy_version: "1", platform: "ps5", physical_format: "blu-ray-disc", seller_note: "First owner" };
    expect(mergeListingAttributes(historical, sanitizeTaxonomyAttributesForWrite({ taxonomy_version: "1", platform: "ps4" }))).toEqual({
      taxonomy_version: "1",
      platform: "ps4",
      physical_format: "blu-ray-disc",
      seller_note: "First owner",
    });
    expect(isDeprecatedTaxonomyAttribute("physical_format")).toBe(true);
    expect(isDeprecatedTaxonomyAttribute("format")).toBe(true);
    expect(isDeprecatedTaxonomyAttribute("genre")).toBe(false);
  });

  it("keeps each configured root aligned to a stable database category slug", () => {
    expect(GAMING_TAXONOMY.map((root) => root.categorySlug)).toEqual(expect.arrayContaining([
      "games", "consoles", "controllers", "peripherals", "pc-components", "gaming-pcs", "monitors", "vr", "gaming-setup",
    ]));
  });
});
