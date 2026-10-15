import { describe, expect, it } from "vitest";
import { inferTaxonomyIntent, resolveTaxonomyQuery, taxonomyFilterEntries, updateTaxonomyFilterParams } from "../lib/gaming-taxonomy";

describe("structured gaming search", () => {
  it.each([
    ["PS5 games", "games", { family: "playstation", platform: "ps5" }, ""],
    ["PSP games", "games", { family: "playstation", platform: "psp" }, ""],
    ["Xbox One controller", "controllers", { compatibility: "xbox-one" }, ""],
    ["Nintendo Switch accessories", "peripherals", { compatibility: "switch" }, ""],
    ["RTX 4070", "pc-components", { subcategory: "gpu" }, "RTX 4070"],
  ])("infers %s without relying only on title text", (query, category, attributes, residualQuery) => {
    expect(inferTaxonomyIntent(query)).toEqual({ category, attributes, residualQuery });
  });

  it("does not infer ambiguous platform words without gaming context", () => {
    expect(inferTaxonomyIntent("switch")).toEqual({ attributes: {}, residualQuery: "switch" });
    expect(inferTaxonomyIntent("one boxed item")).toEqual({ attributes: {}, residualQuery: "one boxed item" });
  });

  it("keeps unrecognized search terms after extracting structured intent", () => {
    expect(inferTaxonomyIntent("PS4 games Limassol")).toEqual({
      category: "games",
      attributes: { family: "playstation", platform: "ps4" },
      residualQuery: "Limassol",
    });
  });

  it("lets explicit URL filters override inferred intent", () => {
    expect(resolveTaxonomyQuery({ q: "PS5 games", category: "controllers", compatibility: "ps4" })).toEqual({
      category: "controllers",
      residualQuery: "",
      inferred: false,
      filters: [{ key: "compatibility", value: "ps4", mode: "array" }],
    });
  });

  it("retains inferred keys that are not explicitly overridden", () => {
    expect(resolveTaxonomyQuery({ q: "PS5 games", category: "games" })).toMatchObject({
      category: "games",
      residualQuery: "",
      filters: [
        { key: "family", value: "playstation", mode: "scalar" },
        { key: "platform", value: "ps5", mode: "scalar" },
      ],
    });
    expect(resolveTaxonomyQuery({ q: "PS5 games", category: "games", platform: "ps4" }).filters).toEqual(expect.arrayContaining([
      { key: "family", value: "playstation", mode: "scalar" },
      { key: "platform", value: "ps4", mode: "scalar" },
    ]));
  });

  it("drops structured filters that do not belong to the selected category", () => {
    expect(resolveTaxonomyQuery({ category: "games", family: "playstation", platform: "ps5", vram_gb: "12" }).filters).toEqual([
      { key: "family", value: "playstation", mode: "scalar" },
      { key: "platform", value: "ps5", mode: "scalar" },
    ]);
  });

  it("drops contradictory hierarchy values from crafted URLs", () => {
    expect(resolveTaxonomyQuery({ category: "games", family: "xbox", platform: "ps5" }).filters).toEqual([
      { key: "family", value: "xbox", mode: "scalar" },
    ]);
    expect(resolveTaxonomyQuery({ category: "controllers", subcategory: "gpu" }).filters).toEqual([]);
  });

  it("builds controlled scalar and array JSONB filters only", () => {
    expect(taxonomyFilterEntries({ subcategory: "gpu", manufacturer: "NVIDIA", compatibility: "ps5", unknown: "ignore" })).toEqual([
      { key: "subcategory", value: "gpu", mode: "scalar" },
      { key: "compatibility", value: "ps5", mode: "array" },
      { key: "manufacturer", value: "NVIDIA", mode: "scalar" },
    ]);
  });

  it("ignores obsolete physical format URL parameters", () => {
    expect(taxonomyFilterEntries({ category: "games", physical_format: "blu-ray-disc", genre: "action" })).toEqual([
      { key: "genre", value: "action", mode: "scalar" },
    ]);
  });

  it("updates a platform family immediately while preserving unrelated filters", () => {
    expect(updateTaxonomyFilterParams({
      category: "games",
      q: "metal gear",
      family: "playstation",
      platform: "psp",
      genre: "action",
      physical_format: "umd",
      page: "4",
    }, "family", "xbox")).toEqual({
      category: "games",
      q: "metal gear",
      family: "xbox",
      genre: "action",
    });

    expect(updateTaxonomyFilterParams({ category: "games", q: "metal gear", family: "playstation", platform: "ps5", genre: "action" }, "family", "")).toEqual({
      category: "games",
      q: "metal gear",
      genre: "action",
    });
  });

  it("preserves numeric attribute types for exact JSONB filtering", () => {
    expect(taxonomyFilterEntries({ subcategory: "gpu", vram_gb: "12", dpi: "not-a-number" })).toEqual([
      { key: "subcategory", value: "gpu", mode: "scalar" },
      { key: "vram_gb", value: 12, mode: "scalar" },
    ]);
  });

  it("preserves boolean attribute types for exact JSONB filtering", () => {
    expect(taxonomyFilterEntries({ subcategory: "steering-wheel", force_feedback: "true" })).toEqual([
      { key: "subcategory", value: "steering-wheel", mode: "scalar" },
      { key: "force_feedback", value: true, mode: "scalar" },
    ]);
  });

  it("uses structured-only search when all query terms are recognized", () => {
    expect(resolveTaxonomyQuery({ q: "PSP games" })).toEqual({
      category: "games",
      residualQuery: "",
      inferred: true,
      filters: [
        { key: "family", value: "playstation", mode: "scalar" },
        { key: "platform", value: "psp", mode: "scalar" },
      ],
    });
  });
});
