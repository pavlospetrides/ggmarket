import { describe, expect, it } from "vitest";
import { formatTaxonomyAttribute, getTaxonomyFields, getTaxonomyPath, getTaxonomyRoot, resolveTaxonomyQuery, updateTaxonomyFilterParams, validateTaxonomyAttributes } from "../lib/gaming-taxonomy";

const listing = (family: string, item_type: string, extra: Record<string, string | boolean> = {}) => ({ taxonomy_version: "1", family, item_type, subcategory: item_type, ...extra });

describe("Collectibles & Cards native taxonomy", () => {
  it("has exactly two primary groups and six requested item types in each", () => {
    const root = getTaxonomyRoot("collectibles");
    expect(root?.label).toBe("Collectibles & Cards");
    expect(root?.children?.map((node) => node.label)).toEqual(["Collectibles", "Cards"]);
    expect(root?.children?.[0].children?.map((node) => node.label)).toEqual([
      "Action Figures & Statues", "Funko Pop", "Anime Collectibles", "Gaming Memorabilia", "Limited Editions", "Other Collectibles",
    ]);
    expect(root?.children?.[1].children?.map((node) => node.label)).toEqual([
      "Pokémon Cards", "Yu-Gi-Oh! Cards", "Magic: The Gathering", "Sports Cards", "Graded Cards", "Other Trading Cards",
    ]);
  });

  it("requires matching group and type and keeps the normal condition outside attributes", () => {
    expect(validateTaxonomyAttributes("collectibles", listing("collectibles", "funko-pop"))).toEqual({ success: true });
    expect(validateTaxonomyAttributes("collectibles", listing("cards", "sports-cards"))).toEqual({ success: true });
    expect(validateTaxonomyAttributes("collectibles", listing("cards", "funko-pop")).success).toBe(false);
    expect(validateTaxonomyAttributes("collectibles", { taxonomy_version: "1", family: "cards" }).success).toBe(false);
    expect(getTaxonomyFields("collectibles", listing("cards", "pokemon-cards")).some((field) => field.key === "condition")).toBe(false);
  });

  it("shows collectible-only fields and cards-only fields with conditional grading", () => {
    const collectibleKeys = getTaxonomyFields("collectibles", listing("collectibles", "action-figures-statues")).map((field) => field.key);
    expect(collectibleKeys).toEqual(["manufacturer", "character", "original_box", "limited_edition"]);
    const cardKeys = getTaxonomyFields("collectibles", listing("cards", "pokemon-cards")).map((field) => field.key);
    expect(cardKeys).toEqual(["card_game", "card_name", "set_name", "card_number", "grading_status"]);
    expect(getTaxonomyFields("collectibles", listing("cards", "graded-cards")).map((field) => field.key)).toEqual([...cardKeys, "grading_company", "grading_score"]);
    expect(getTaxonomyFields("collectibles", listing("cards", "pokemon-cards", { grading_status: "graded" })).map((field) => field.key)).toEqual([...cardKeys, "grading_company", "grading_score"]);
    expect(validateTaxonomyAttributes("collectibles", listing("cards", "pokemon-cards", { grading_status: "ungraded", grading_company: "psa" })).success).toBe(false);
    expect(validateTaxonomyAttributes("collectibles", listing("collectibles", "funko-pop", { grading_status: "graded" })).success).toBe(false);
  });

  it("formats values in their category context and preserves old listing taxonomy", () => {
    const graded = listing("cards", "graded-cards", { grading_status: "graded", grading_company: "psa", grading_score: "10" });
    expect(formatTaxonomyAttribute("grading_company", "psa", "collectibles", graded)).toEqual({ label: "Grading Company", value: "PSA" });
    expect(formatTaxonomyAttribute("item_type", "graded-cards", "collectibles", graded)).toEqual({ label: "Item type", value: "Graded Cards" });
    expect(getTaxonomyPath("collectibles", { subcategory: "pokemon-tcg" }).map((node) => node.label)).toEqual(["Collectibles & Cards", "Cards", "Pokémon Cards"]);
    expect(formatTaxonomyAttribute("card_game", "pokemon", "collectibles", { subcategory: "pokemon-tcg" }).value).toBe("Pokémon");
  });

  it("resolves top-level, group, leaf, and search filters without leaking stale leaves", () => {
    expect(resolveTaxonomyQuery({ category: "collectibles" }).filters).toEqual([]);
    expect(resolveTaxonomyQuery({ category: "collectibles", family: "cards" }).filters).toEqual([{ key: "family", value: "cards", mode: "scalar" }]);
    expect(resolveTaxonomyQuery({ category: "collectibles", family: "cards", item_type: "sports-cards", grading_status: "graded" }).filters.map((filter) => filter.key)).toEqual(["family", "item_type", "grading_status"]);
    expect(resolveTaxonomyQuery({ category: "collectibles", family: "cards", item_type: "funko-pop" }).filters.map((filter) => filter.key)).toEqual(["family"]);
    expect(resolveTaxonomyQuery({ q: "Pokemon cards" })).toMatchObject({ category: "collectibles", residualQuery: "" });
    expect(resolveTaxonomyQuery({ q: "Pokemon cards" }).filters.map((filter) => filter.value)).toEqual(["cards", "pokemon-cards"]);
    expect(resolveTaxonomyQuery({ q: "Pokemon cards", category: "collectibles", family: "collectibles" }).residualQuery).toBe("Pokemon cards");
    expect(resolveTaxonomyQuery({ category: "collectibles", item_type: "funko-pop" }).filters.map((filter) => filter.value)).toEqual(["collectibles", "funko-pop"]);
    expect(updateTaxonomyFilterParams({ category: "collectibles", family: "cards", item_type: "pokemon-cards", grading_status: "graded" }, "family", "collectibles")).toEqual({ category: "collectibles", family: "collectibles" });
  });
});
