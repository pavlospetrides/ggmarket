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
  inferTaxonomyIntent,
  taxonomyFilterEntries,
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

    const initialGpuKeys = getTaxonomyFields("pc-components", { subcategory: "gpu" }).map((field) => field.key);
    expect(initialGpuKeys).toEqual(["gpu_chipset_vendor"]);
    const gpuKeys = getTaxonomyFields("pc-components", {
      subcategory: "gpu",
      gpu_chipset_vendor: "nvidia",
      gpu_series: "rtx-40",
      gpu_model: "rtx-4070",
    }).map((field) => field.key);
    expect(gpuKeys).toEqual(expect.arrayContaining(["manufacturer", "gpu_series", "gpu_model", "exact_model", "vram_gb", "used_for_mining"]));
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
    expect(formatTaxonomyAttribute("manufacturer", "asus")).toEqual({ label: "Manufacturer", value: "ASUS" });
    expect(formatTaxonomyAttribute("capacity_gb", 2000)).toEqual({ label: "Capacity (GB)", value: "2,000" });
    expect(formatTaxonomyAttribute("interface", "pcie-4")).toEqual({ label: "Interface", value: "PCIe 4.0" });
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

  it("trims submitted taxonomy text without rewriting unknown legacy metadata", () => {
    expect(sanitizeTaxonomyAttributesForWrite({
      taxonomy_version: "1",
      subcategory: "gpu",
      exact_model: "  DUAL-RTX4070-O12G  ",
      seller_note: "  Keep original spacing  ",
    })).toEqual({
      taxonomy_version: "1",
      subcategory: "gpu",
      exact_model: "DUAL-RTX4070-O12G",
      seller_note: "  Keep original spacing  ",
    });
  });

  it("keeps each configured root aligned to a stable database category slug", () => {
    expect(GAMING_TAXONOMY.map((root) => root.categorySlug)).toEqual(expect.arrayContaining([
      "games", "consoles", "controllers", "peripherals", "pc-components", "gaming-pcs", "monitors", "vr", "gaming-setup",
    ]));
  });

  it("exposes the complete PC hardware hierarchy through the shared taxonomy facade", () => {
    const pc = getTaxonomyRoot("pc-components");
    expect(pc?.children?.map((item) => item.id)).toEqual(expect.arrayContaining([
      "cpu", "gpu", "ram", "motherboard", "psu", "ssd", "hdd", "case",
      "air-cooler", "aio-cooler", "custom-loop", "case-fan", "fan-controller",
      "network-card", "sound-card", "capture-card", "expansion-card",
      "optical-drive", "internal-adapter", "other-pc-component",
    ]));
    expect(pc?.children).toHaveLength(20);
  });

  it("resolves dependent PC fields and validation through the shared taxonomy facade", () => {
    const initialKeys = getTaxonomyFields("pc-components", { subcategory: "cpu" }).map((field) => field.key);
    expect(initialKeys).toEqual(["manufacturer"]);

    const cpu = {
      taxonomy_version: "1",
      subcategory: "cpu",
      manufacturer: "intel",
      socket: "lga1700",
      cpu_family: "core-i7",
      cpu_generation: "12th-gen",
      cpu_model: "core-i7-12700k",
    } as const;
    expect(getTaxonomyFields("pc-components", cpu).map((field) => field.key)).toEqual(expect.arrayContaining(["socket", "cpu_family", "cpu_generation", "cpu_model"]));
    expect(validateTaxonomyAttributes("pc-components", cpu)).toEqual({ success: true });
    expect(validateTaxonomyAttributes("pc-components", { ...cpu, socket: "am5" }).success).toBe(false);
  });

  it("parses PC hardware URL filters with their canonical scalar and array types", () => {
    expect(taxonomyFilterEntries({
      subcategory: "case",
      motherboard_support: "atx",
      max_gpu_length_mm: "420",
      rgb: "true",
    })).toEqual(expect.arrayContaining([
      { key: "subcategory", value: "case", mode: "scalar" },
      { key: "motherboard_support", value: "atx", mode: "array" },
      { key: "max_gpu_length_mm", value: 420, mode: "scalar" },
      { key: "rgb", value: true, mode: "scalar" },
    ]));
  });

  it("promotes exact PC model searches into structured filters without losing residual text", () => {
    expect(inferTaxonomyIntent("used RTX 4070 warranty")).toEqual({
      category: "pc-components",
      attributes: {
        subcategory: "gpu",
        gpu_chipset_vendor: "nvidia",
        gpu_series: "rtx-40",
        gpu_model: "rtx-4070",
      },
      residualQuery: "used warranty",
    });
  });
});
