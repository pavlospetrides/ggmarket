import type { ListingAttributes } from "./types";
import type { TaxonomyField, TaxonomyNode, TaxonomyOption } from "./gaming-taxonomy";

const option = (value: string, label: string): TaxonomyOption => ({ value, label });
const item = (id: string, label: string): TaxonomyNode => ({ id, label, kind: "subcategory", categorySlug: "collectibles" });
const family = (id: string, label: string, children: readonly TaxonomyNode[]): TaxonomyNode => ({ id, label, kind: "family", categorySlug: "collectibles", children });

export const COLLECTIBLE_FAMILIES = [
  family("collectibles", "Collectibles", [
    item("action-figures-statues", "Action Figures & Statues"),
    item("funko-pop", "Funko Pop"),
    item("anime-collectibles", "Anime Collectibles"),
    item("gaming-memorabilia", "Gaming Memorabilia"),
    item("limited-editions", "Limited Editions"),
    item("other-collectibles", "Other Collectibles"),
  ]),
  family("cards", "Cards", [
    item("pokemon-cards", "Pokémon Cards"),
    item("yugioh-cards", "Yu-Gi-Oh! Cards"),
    item("magic-the-gathering", "Magic: The Gathering"),
    item("sports-cards", "Sports Cards"),
    item("graded-cards", "Graded Cards"),
    item("other-trading-cards", "Other Trading Cards"),
  ]),
] as const;

export const COLLECTIBLES_ROOT: TaxonomyNode = {
  id: "collectibles", label: "Collectibles & Cards", kind: "root", categorySlug: "collectibles", children: COLLECTIBLE_FAMILIES,
};

const legacyTypes: Record<string, { family: string; item_type: string }> = {
  "pokemon-tcg": { family: "cards", item_type: "pokemon-cards" },
  "yugioh-tcg": { family: "cards", item_type: "yugioh-cards" },
  "one-piece-card-game": { family: "cards", item_type: "other-trading-cards" },
  "other-trading-card-games": { family: "cards", item_type: "other-trading-cards" },
  "gaming-anime-figures": { family: "collectibles", item_type: "anime-collectibles" },
  "funko-collectible-figures": { family: "collectibles", item_type: "funko-pop" },
  "collectors-editions-merchandise": { family: "collectibles", item_type: "limited-editions" },
};

export function classifyCollectible(attributes: ListingAttributes): { family: string; item_type: string } {
  const subcategory = typeof attributes.subcategory === "string" ? attributes.subcategory : "";
  const legacy = legacyTypes[subcategory];
  const type = typeof attributes.item_type === "string" ? attributes.item_type : "";
  const matchedFamily = COLLECTIBLE_FAMILIES.find((candidate) => candidate.children?.some((child) => child.id === type));
  if (matchedFamily) return { family: matchedFamily.id, item_type: type };
  if (attributes.family === "cards" && !subcategory) return { family: "cards", item_type: "other-trading-cards" };
  if (attributes.product_type === "graded-card" && (legacy?.family === "cards" || subcategory === "magic-the-gathering" || !subcategory)) return { family: "cards", item_type: "graded-cards" };
  if (legacy) return legacy;
  if (subcategory === "magic-the-gathering") return { family: "cards", item_type: subcategory };
  const canonicalFamily = COLLECTIBLE_FAMILIES.find((candidate) => candidate.children?.some((child) => child.id === subcategory));
  if (canonicalFamily) return { family: canonicalFamily.id, item_type: subcategory };
  if (["single-card", "booster-pack", "booster-box", "sealed-product", "deck"].includes(String(attributes.product_type ?? ""))) return { family: "cards", item_type: "other-trading-cards" };
  return { family: "collectibles", item_type: "other-collectibles" };
}

const collectibleFields: readonly TaxonomyField[] = [
  { key: "manufacturer", label: "Brand / Franchise", type: "text" },
  { key: "character", label: "Character / Series", type: "text" },
  { key: "original_box", label: "Original Packaging", type: "boolean" },
  { key: "limited_edition", label: "Limited Edition", type: "boolean" },
];
const cardFields: readonly TaxonomyField[] = [
  { key: "card_game", label: "Card Game / Collection", type: "select", options: [option("pokemon", "Pokémon"), option("yugioh", "Yu-Gi-Oh!"), option("magic", "Magic: The Gathering"), option("sports", "Sports"), option("one-piece", "One Piece"), option("other", "Other")] },
  { key: "card_name", label: "Card Name", type: "text" },
  { key: "set_name", label: "Set / Edition", type: "text" },
  { key: "card_number", label: "Card Number (optional)", type: "text" },
  { key: "grading_status", label: "Graded / Ungraded", type: "select", options: [option("graded", "Graded"), option("ungraded", "Ungraded")] },
];
const gradingFields: readonly TaxonomyField[] = [
  { key: "grading_company", label: "Grading Company", type: "select", options: [option("psa", "PSA"), option("bgs", "BGS"), option("cgc", "CGC"), option("other", "Other")] },
  { key: "grading_score", label: "Grade", type: "text", placeholder: "Value shown by the grading company" },
];
const legacyFields: readonly TaxonomyField[] = [
  { key: "product_type", label: "Original product type", type: "text" },
  { key: "figure_series", label: "Figure series", type: "text" },
  { key: "edition", label: "Edition", type: "text" },
  { key: "packaging_condition", label: "Packaging condition", type: "text" },
  { key: "sealed_condition", label: "Sealed condition", type: "text" },
  { key: "grading_certification_number", label: "Certification number", type: "text" },
  { key: "card_game_other", label: "Other card game", type: "text" },
  { key: "language", label: "Language", type: "text" },
  { key: "language_other", label: "Other language", type: "text" },
  { key: "grading_company_other", label: "Other grading company", type: "text" },
  { key: "product_type_other", label: "Other product type", type: "text" },
  { key: "rarity", label: "Rarity", type: "text" },
];

export const COLLECTIBLE_FIELDS: readonly TaxonomyField[] = [...collectibleFields, ...cardFields, ...gradingFields, ...legacyFields];
export const COLLECTIBLES_MARKETPLACE_FILTER_KEYS = ["card_game", "grading_status", "grading_company"] as const;
const marketplaceFilterKeys = new Set<string>(COLLECTIBLES_MARKETPLACE_FILTER_KEYS);
export function isCollectiblesMarketplaceFilterKey(key: string): boolean { return marketplaceFilterKeys.has(key); }

export function getCollectiblesFields(attributes: ListingAttributes): readonly TaxonomyField[] {
  if (!attributes.family && !attributes.item_type && !attributes.subcategory) return [];
  const type = classifyCollectible(attributes);
  const fields = type.family === "cards" ? [...cardFields] : [...collectibleFields];
  if (type.family === "cards" && (type.item_type === "graded-cards" || attributes.grading_status === "graded")) fields.push(...gradingFields);
  // Old listing values remain readable and editable without exposing old fields to new sellers.
  if (typeof attributes.subcategory === "string" && legacyTypes[attributes.subcategory]) fields.push(...legacyFields);
  return fields;
}

export function validateCollectiblesAttributes(attributes: ListingAttributes): { success: true } | { success: false; error: string } {
  const selected = COLLECTIBLE_FAMILIES.find((candidate) => candidate.id === attributes.family);
  if (!selected) return { success: false, error: "Choose Collectibles or Cards." };
  if (typeof attributes.item_type !== "string" || !selected.children?.some((child) => child.id === attributes.item_type)) return { success: false, error: "Choose a valid item type." };
  const legacySubcategory = typeof attributes.subcategory === "string" && Boolean(legacyTypes[attributes.subcategory]);
  if (!legacySubcategory && attributes.subcategory !== attributes.item_type) return { success: false, error: "Choose a matching item type." };
  if (selected.id === "cards" && attributes.item_type === "graded-cards" && attributes.grading_status === "ungraded") return { success: false, error: "A graded card cannot be marked ungraded." };
  if (attributes.grading_status === "ungraded" && (attributes.grading_company !== undefined || attributes.grading_score !== undefined)) return { success: false, error: "Remove grading details from an ungraded card." };
  if (attributes.grading_score !== undefined && (typeof attributes.grading_score !== "string" || !/^[A-Za-z0-9.+\/-]{1,20}$/.test(attributes.grading_score))) return { success: false, error: "Enter a valid seller-provided grade." };
  return { success: true };
}
