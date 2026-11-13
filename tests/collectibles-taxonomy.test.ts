import { describe, expect, it } from "vitest";
import { formatTaxonomyAttribute, getTaxonomyFields, getTaxonomyRoot, resolveTaxonomyQuery, validateTaxonomyAttributes } from "../lib/gaming-taxonomy";

const base = (subcategory: string, product_type: string) => ({ taxonomy_version: "1", subcategory, product_type });

describe("collectibles taxonomy", () => {
  it("provides the approved stable subcategories and product types", () => {
    const root = getTaxonomyRoot("collectibles");
    expect(root?.label).toBe("Collectibles & Trading Cards");
    expect(root?.children?.map((item) => item.id)).toEqual([
      "pokemon-tcg", "yugioh-tcg", "magic-the-gathering", "one-piece-card-game", "other-trading-card-games",
      "gaming-anime-figures", "funko-collectible-figures", "collectors-editions-merchandise", "other-collectibles",
    ]);
    expect(getTaxonomyFields("collectibles", base("other-collectibles", "single-card")).find((field) => field.key === "product_type")?.options?.map((item) => item.value)).toEqual([
      "single-card", "graded-card", "booster-pack", "booster-box", "sealed-product", "deck", "figure", "statue", "collection", "bundle", "other",
    ]);
  });

  it.each([
    ["Pokemon single card", { ...base("pokemon-tcg", "single-card"), card_name: "Pikachu", set_name: "Base Set" }],
    ["Yu-Gi-Oh card", { ...base("yugioh-tcg", "single-card"), card_name: "Blue-Eyes White Dragon" }],
    ["graded card", { ...base("pokemon-tcg", "graded-card"), grading_status: "graded", grading_company: "psa", grading_score: "10", grading_certification_number: "1234-5678" }],
    ["ungraded card", { ...base("magic-the-gathering", "single-card"), grading_status: "ungraded" }],
    ["sealed booster", { ...base("one-piece-card-game", "booster-box"), sealed_condition: "factory-sealed" }],
    ["figure", { ...base("gaming-anime-figures", "figure"), manufacturer: "Good Smile", character: "Link" }],
    ["statue", { ...base("gaming-anime-figures", "statue"), figure_series: "Collector Series" }],
    ["collection", base("other-collectibles", "collection")],
    ["bundle", base("collectors-editions-merchandise", "bundle")],
    ["minimal", base("other-collectibles", "other")],
    ["custom card values", { ...base("other-trading-card-games", "single-card"), card_game: "other", card_game_other: "Lorcana", set_name: "Custom chapter" }],
  ])("accepts %s without making optional details mandatory", (_label, attributes) => {
    expect(validateTaxonomyAttributes("collectibles", attributes)).toEqual({ success: true });
  });

  it("rejects grading claims on ungraded cards and unsafe certification values", () => {
    expect(validateTaxonomyAttributes("collectibles", { ...base("pokemon-tcg", "single-card"), grading_status: "ungraded", grading_company: "psa" }).success).toBe(false);
    expect(validateTaxonomyAttributes("collectibles", { ...base("pokemon-tcg", "graded-card"), grading_status: "graded", grading_company: "psa", grading_certification_number: "<script>" }).success).toBe(false);
  });

  it("keeps figure and card fields scoped to their product type", () => {
    expect(validateTaxonomyAttributes("collectibles", { ...base("gaming-anime-figures", "figure"), card_number: "001" }).success).toBe(false);
    expect(validateTaxonomyAttributes("collectibles", { ...base("pokemon-tcg", "single-card"), character: "Pikachu" }).success).toBe(false);
  });

  it("formats collectible values from their own field schema", () => {
    const attributes = { ...base("pokemon-tcg", "graded-card"), grading_status: "graded", grading_company: "psa", grading_score: "10" };
    expect(formatTaxonomyAttribute("grading_company", "psa", "collectibles", attributes)).toEqual({ label: "Grading company", value: "PSA" });
    expect(formatTaxonomyAttribute("grading_score", "10", "collectibles", attributes)).toEqual({ label: "Grade", value: "10" });
  });

  it("resolves category-scoped collectible filters and search intent", () => {
    expect(resolveTaxonomyQuery({ category: "collectibles", subcategory: "pokemon-tcg", product_type: "graded-card", grading_company: "psa" }).filters.map((item) => item.key)).toEqual(["subcategory", "product_type", "grading_company"]);
    expect(resolveTaxonomyQuery({ q: "Pokemon cards" })).toMatchObject({ category: "collectibles", residualQuery: "" });
  });
});
