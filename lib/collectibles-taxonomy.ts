import type { ListingAttributes } from "./types";
import type { TaxonomyField, TaxonomyNode, TaxonomyOption } from "./gaming-taxonomy";

const option = (value: string, label: string): TaxonomyOption => ({ value, label });
const subcategory = (id: string, label: string): TaxonomyNode => ({ id, label, kind: "subcategory", categorySlug: "collectibles" });

export const COLLECTIBLE_SUBCATEGORIES = [
  subcategory("pokemon-tcg", "Pokémon TCG"),
  subcategory("yugioh-tcg", "Yu-Gi-Oh! TCG"),
  subcategory("magic-the-gathering", "Magic: The Gathering"),
  subcategory("one-piece-card-game", "One Piece Card Game"),
  subcategory("other-trading-card-games", "Other Trading Card Games"),
  subcategory("gaming-anime-figures", "Gaming & Anime Figures"),
  subcategory("funko-collectible-figures", "Funko Pop & Collectible Figures"),
  subcategory("collectors-editions-merchandise", "Collector's Editions & Gaming Merchandise"),
  subcategory("other-collectibles", "Other Collectibles"),
] as const;

export const COLLECTIBLE_PRODUCT_TYPE_OPTIONS = [
  option("single-card", "Single Card"), option("graded-card", "Graded Card"), option("booster-pack", "Booster Pack"), option("booster-box", "Booster Box"), option("sealed-product", "Sealed Product"), option("deck", "Deck"), option("figure", "Figure"), option("statue", "Statue"), option("collection", "Collection"), option("bundle", "Bundle"), option("other", "Other"),
] as const;

export const COLLECTIBLES_MARKETPLACE_FILTER_KEYS = [
  "product_type", "card_game", "grading_status", "grading_company",
  "grading_score", "sealed_condition", "language",
] as const;
const collectiblesMarketplaceFilterKeys = new Set<string>(COLLECTIBLES_MARKETPLACE_FILTER_KEYS);

export function isCollectiblesMarketplaceFilterKey(key: string): boolean {
  return collectiblesMarketplaceFilterKeys.has(key);
}

const cardTypes = new Set(["single-card", "graded-card", "booster-pack", "booster-box", "sealed-product", "deck"]);
const figureTypes = new Set(["figure", "statue"]);
const sealedTypes = new Set(["booster-pack", "booster-box", "sealed-product"]);
const cardSubcategories = new Set(["pokemon-tcg", "yugioh-tcg", "magic-the-gathering", "one-piece-card-game", "other-trading-card-games"]);
const figureSubcategories = new Set(["gaming-anime-figures", "funko-collectible-figures"]);

function productTypesFor(subcategoryId: unknown) {
  if (typeof subcategoryId !== "string" || subcategoryId === "other-collectibles") return COLLECTIBLE_PRODUCT_TYPE_OPTIONS;
  const allowed = cardSubcategories.has(subcategoryId)
    ? new Set([...cardTypes, "collection", "bundle", "other"])
    : figureSubcategories.has(subcategoryId)
      ? new Set([...figureTypes, "collection", "bundle", "other"])
      : new Set(["sealed-product", ...figureTypes, "collection", "bundle", "other"]);
  return COLLECTIBLE_PRODUCT_TYPE_OPTIONS.filter((item) => allowed.has(item.value));
}

const productTypeField = (attributes: ListingAttributes): TaxonomyField => ({ key: "product_type", label: "Product type", type: "select", required: true, options: productTypesFor(attributes.subcategory) });
const cardFields: readonly TaxonomyField[] = [
  { key: "card_game", label: "Card game", type: "select", options: [option("pokemon", "Pokémon"), option("yugioh", "Yu-Gi-Oh!"), option("magic", "Magic: The Gathering"), option("one-piece", "One Piece Card Game"), option("other", "Other")] },
  { key: "card_name", label: "Card name", type: "text", placeholder: "e.g. Pikachu" },
  { key: "set_name", label: "Set / Expansion", type: "text", placeholder: "e.g. Base Set" },
  { key: "card_number", label: "Card number", type: "text", placeholder: "e.g. 4/102" },
  { key: "rarity", label: "Rarity", type: "text" },
  { key: "language", label: "Language", type: "select", options: [option("english", "English"), option("japanese", "Japanese"), option("greek", "Greek"), option("german", "German"), option("french", "French"), option("italian", "Italian"), option("spanish", "Spanish"), option("other", "Other")] },
  { key: "edition", label: "Edition", type: "text" },
  { key: "grading_status", label: "Is this card graded?", type: "select", options: [option("graded", "Yes"), option("ungraded", "No")] },
];
const gradingFields: readonly TaxonomyField[] = [
  { key: "grading_company", label: "Grading company", type: "select", options: [option("psa", "PSA"), option("bgs", "BGS"), option("cgc", "CGC"), option("other", "Other")] },
  { key: "grading_score", label: "Grade", type: "text", placeholder: "Use the value shown by the grading company" },
  { key: "grading_certification_number", label: "Certification number", type: "text" },
];
const figureFields: readonly TaxonomyField[] = [
  { key: "manufacturer", label: "Manufacturer", type: "text" }, { key: "figure_series", label: "Figure series", type: "text" }, { key: "character", label: "Character", type: "text" }, { key: "edition", label: "Edition", type: "text" },
  { key: "packaging_condition", label: "Packaging condition", type: "select", options: [option("sealed", "Factory sealed"), option("excellent", "Excellent"), option("good", "Good"), option("worn", "Worn"), option("none", "No packaging")] },
  { key: "original_box", label: "Original box available", type: "boolean" },
];
const sealedField: TaxonomyField = { key: "sealed_condition", label: "Sealed condition", type: "select", options: [option("factory-sealed", "Factory sealed"), option("opened-complete", "Opened, complete"), option("opened-incomplete", "Opened, incomplete")] };
const customFields: readonly TaxonomyField[] = [
  { key: "product_type_other", label: "Other product type", type: "text" }, { key: "card_game_other", label: "Other card game", type: "text" }, { key: "grading_company_other", label: "Other grading company", type: "text" }, { key: "language_other", label: "Other language", type: "text" },
];

export const COLLECTIBLE_FIELDS: readonly TaxonomyField[] = [productTypeField({}), ...cardFields, ...gradingFields, ...figureFields, sealedField, ...customFields];

export const COLLECTIBLES_ROOT: TaxonomyNode = { id: "collectibles", label: "Collectibles & Trading Cards", kind: "root", categorySlug: "collectibles", children: COLLECTIBLE_SUBCATEGORIES };

export function getCollectiblesFields(attributes: ListingAttributes): readonly TaxonomyField[] {
  const fields: TaxonomyField[] = [productTypeField(attributes)];
  const productType = typeof attributes.product_type === "string" ? attributes.product_type : "";
  if (cardTypes.has(productType)) fields.push(...cardFields);
  if (productType === "graded-card" || attributes.grading_status === "graded") fields.push(...gradingFields);
  if (figureTypes.has(productType)) fields.push(...figureFields);
  if (sealedTypes.has(productType)) fields.push(sealedField);
  if (productType === "other") fields.push(customFields[0]);
  if (attributes.card_game === "other") fields.push(customFields[1]);
  if (attributes.grading_company === "other") fields.push(customFields[2]);
  if (attributes.language === "other") fields.push(customFields[3]);
  return [...new Map(fields.map((field) => [field.key, field])).values()];
}

export function validateCollectiblesAttributes(attributes: ListingAttributes): { success: true } | { success: false; error: string } {
  if (typeof attributes.subcategory !== "string" || !COLLECTIBLE_SUBCATEGORIES.some((item) => item.id === attributes.subcategory)) return { success: false, error: "Choose a valid collectible subcategory." };
  const allowedTypes = productTypesFor(attributes.subcategory);
  if (typeof attributes.product_type !== "string" || !allowedTypes.some((item) => item.value === attributes.product_type)) return { success: false, error: "Choose a valid collectible product type." };
  if (attributes.grading_status === "ungraded" && ["grading_company", "grading_score", "grading_certification_number", "grading_company_other"].some((key) => attributes[key] !== undefined)) return { success: false, error: "Grading details are not valid for an ungraded card." };
  const certification = attributes.grading_certification_number;
  if (certification !== undefined && (typeof certification !== "string" || !/^[A-Za-z0-9 .-]{1,80}$/.test(certification))) return { success: false, error: "Enter a valid seller-provided certification number." };
  const score = attributes.grading_score;
  if (score !== undefined && (typeof score !== "string" || !/^[A-Za-z0-9.+\/-]{1,20}$/.test(score))) return { success: false, error: "Enter the grade exactly as shown by the grading company." };
  return { success: true };
}
