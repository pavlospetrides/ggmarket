import type { AttributeValue, ListingAttributes } from "./types";
import {
  inferPcHardwareIntent,
  PC_HARDWARE_FIELDS,
  PC_HARDWARE_FILTER_KEYS,
  PC_HARDWARE_OPTIONS,
  PC_HARDWARE_ROOT,
  getPcHardwareFields,
  updatePcHardwareAttribute,
  validatePcHardwareAttributes,
} from "./pc-hardware-taxonomy";

export type TaxonomyOption = Readonly<{ value: string; label: string; description?: string }>;
export type TaxonomyField = Readonly<{ key: string; label: string; type: "text" | "number" | "select" | "multiselect" | "boolean"; options?: readonly TaxonomyOption[]; required?: boolean; placeholder?: string; min?: number; max?: number }>;
export type TaxonomyNode = Readonly<{ id: string; label: string; kind: "root" | "family" | "subcategory" | "platform" | "model"; categorySlug: string; description?: string; children?: readonly TaxonomyNode[]; fields?: readonly TaxonomyField[] }>;

const option = (value: string, label: string, description?: string): TaxonomyOption => ({ value, label, ...(description ? { description } : {}) });
const node = (categorySlug: string, kind: TaxonomyNode["kind"], id: string, label: string, children?: readonly TaxonomyNode[], description?: string, fields?: readonly TaxonomyField[]): TaxonomyNode => ({ id, label, kind, categorySlug, ...(children?.length ? { children } : {}), ...(description ? { description } : {}), ...(fields?.length ? { fields } : {}) });

export const GAME_PLATFORM_OPTIONS = [
  option("ps5", "PlayStation 5"), option("ps4", "PlayStation 4"), option("ps3", "PlayStation 3"), option("ps2", "PlayStation 2"), option("ps1", "PlayStation 1"), option("psp", "PlayStation Portable (PSP)"), option("ps-vita", "PlayStation Vita"),
  option("xbox-series-x", "Xbox Series X"), option("xbox-series-xs", "Xbox Series X|S"), option("xbox-one", "Xbox One"), option("xbox-360", "Xbox 360"), option("original-xbox", "Original Xbox"),
  option("switch-2", "Nintendo Switch 2"), option("switch", "Nintendo Switch"), option("wii-u", "Nintendo Wii U"), option("wii", "Nintendo Wii"), option("nintendo-3ds", "Nintendo 3DS"), option("nintendo-ds", "Nintendo DS"), option("gamecube", "Nintendo GameCube"), option("nintendo-64", "Nintendo 64"), option("snes", "Super Nintendo (SNES)"), option("nes", "Nintendo Entertainment System (NES)"), option("game-boy", "Game Boy"), option("game-boy-color", "Game Boy Color"), option("game-boy-advance", "Game Boy Advance"),
  option("windows-pc", "Windows PC"), option("macos", "macOS"), option("linux", "Linux"), option("mega-drive", "Sega Mega Drive / Genesis"), option("master-system", "Sega Master System"), option("dreamcast", "Sega Dreamcast"), option("saturn", "Sega Saturn"), option("game-gear", "Sega Game Gear"), option("atari", "Atari systems"), option("other-legacy", "Other / Legacy Platform"),
] as const;

export const COMPATIBILITY_OPTIONS = [...GAME_PLATFORM_OPTIONS.filter((item) => !["xbox-series-xs", "macos", "linux", "atari", "other-legacy"].includes(item.value)), option("xbox-series", "Xbox Series X|S"), option("android", "Android"), option("ios", "iOS")] as const;
export const GENRE_OPTIONS = [option("action", "Action"), option("adventure", "Adventure"), option("rpg", "Role-playing (RPG)"), option("shooter", "Shooter"), option("sports", "Sports"), option("racing", "Racing"), option("fighting", "Fighting"), option("strategy", "Strategy"), option("simulation", "Simulation"), option("puzzle", "Puzzle"), option("platformer", "Platformer"), option("horror", "Horror"), option("family", "Family"), option("other", "Other")] as const;
export const PEGI_OPTIONS = ["3", "7", "12", "16", "18"].map((value) => option(value, `PEGI ${value}`));

const manufacturerField: TaxonomyField = { key: "manufacturer", label: "Manufacturer", type: "text", placeholder: "e.g. Sony, ASUS, NVIDIA" };
const modelField: TaxonomyField = { key: "exact_model", label: "Exact model", type: "text", required: true, placeholder: "Enter the exact model" };
const compatibilityField: TaxonomyField = { key: "compatibility", label: "Compatible platforms", type: "multiselect", options: COMPATIBILITY_OPTIONS, required: true };
const connectionField: TaxonomyField = { key: "connection", label: "Connection", type: "select", options: [option("wired", "Wired"), option("wireless", "Wireless"), option("both", "Wired & wireless")] };

const gameFields: readonly TaxonomyField[] = [
  { key: "genre", label: "Genre", type: "select", options: GENRE_OPTIONS }, { key: "edition", label: "Edition", type: "text", placeholder: "e.g. Standard, Collector’s" }, { key: "packaging", label: "Original packaging", type: "select", options: [option("original", "Original case / box"), option("replacement", "Replacement case"), option("none", "No case / loose")] }, { key: "manuals", label: "Manuals or inserts included", type: "boolean" }, { key: "region", label: "Region", type: "select", options: [option("pal", "PAL"), option("ntsc-u", "NTSC-U"), option("ntsc-j", "NTSC-J"), option("region-free", "Region free"), option("other", "Other / Unknown")] }, { key: "pegi", label: "Age rating", type: "select", options: PEGI_OPTIONS },
];
const gameFamily = (id: string, label: string, platformIds: readonly string[]) => node("games", "family", id, label, GAME_PLATFORM_OPTIONS.filter((item) => platformIds.includes(item.value)).map((item) => node("games", "platform", item.value, item.label, undefined, item.description)));

const modelGroups = {
  playstation: ["ps5", "ps5-slim", "ps5-pro", "ps5-digital-edition", "ps4", "ps4-pro", "ps4-slim", "ps3", "ps2", "ps1", "psp", "ps-vita"], xbox: ["xbox-series-x", "xbox-series-s", "xbox-one", "xbox-one-s", "xbox-one-x", "xbox-360", "original-xbox"], nintendo: ["switch-2", "switch-oled", "switch", "switch-lite", "wii-u", "wii", "nintendo-3ds", "nintendo-ds", "gamecube", "older-nintendo"], handheld: ["steam-deck", "steam-deck-oled", "rog-ally", "rog-ally-x", "legion-go", "other-handheld-pc"], retro: ["mega-drive", "master-system", "dreamcast", "saturn", "game-gear", "atari", "other-retro-console"],
} as const;
const MODEL_LABELS: Record<string, string> = {
  ps5: "PlayStation 5", "ps5-slim": "PlayStation 5 Slim", "ps5-pro": "PlayStation 5 Pro", "ps5-digital-edition": "PlayStation 5 Digital Edition", ps4: "PlayStation 4", "ps4-pro": "PlayStation 4 Pro", "ps4-slim": "PlayStation 4 Slim", ps3: "PlayStation 3", ps2: "PlayStation 2", ps1: "PlayStation 1", psp: "PlayStation Portable (PSP)", "ps-vita": "PlayStation Vita", "xbox-series-x": "Xbox Series X", "xbox-series-s": "Xbox Series S", "xbox-one": "Xbox One", "xbox-one-s": "Xbox One S", "xbox-one-x": "Xbox One X", "xbox-360": "Xbox 360", "original-xbox": "Original Xbox", "switch-2": "Nintendo Switch 2", "switch-oled": "Nintendo Switch OLED", switch: "Nintendo Switch", "switch-lite": "Nintendo Switch Lite", "wii-u": "Nintendo Wii U", wii: "Nintendo Wii", "nintendo-3ds": "Nintendo 3DS", "nintendo-ds": "Nintendo DS", gamecube: "Nintendo GameCube", "older-nintendo": "Older Nintendo console", "steam-deck": "Steam Deck", "steam-deck-oled": "Steam Deck OLED", "rog-ally": "ASUS ROG Ally", "rog-ally-x": "ASUS ROG Ally X", "legion-go": "Lenovo Legion Go", "other-handheld-pc": "Other handheld gaming PC", "mega-drive": "Sega Mega Drive / Genesis", "master-system": "Sega Master System", dreamcast: "Sega Dreamcast", saturn: "Sega Saturn", "game-gear": "Sega Game Gear", atari: "Atari console", "other-retro-console": "Other retro console",
};
const consoleFamily = (id: keyof typeof modelGroups, label: string) => node("consoles", "family", id, label, modelGroups[id].map((model) => node("consoles", "model", model, MODEL_LABELS[model])));
const consoleFields: readonly TaxonomyField[] = [{ key: "storage", label: "Storage", type: "text", placeholder: "e.g. 1 TB" }, { key: "accessories_included", label: "Accessories included", type: "text" }, { key: "controllers_included", label: "Controllers included", type: "number", min: 0, max: 12 }, { key: "original_box", label: "Original box included", type: "boolean" }, { key: "working_condition", label: "Working condition", type: "select", options: [option("fully-working", "Fully working"), option("partly-working", "Partly working"), option("not-working", "Not working / for parts")] }, { key: "modifications", label: "Modifications", type: "text" }];

const controllerChildren = [["gamepad", "Gamepads"], ["playstation-controller", "PlayStation controllers"], ["xbox-controller", "Xbox controllers"], ["nintendo-controller", "Nintendo controllers"], ["pc-controller", "PC controllers"], ["retro-controller", "Retro controllers"], ["arcade-stick", "Arcade sticks"], ["fighting-controller", "Fighting controllers"], ["specialty-controller", "Specialty controllers"], ["controller-accessory", "Controller accessories"]] as const;
const simplePeripheralLabels: Record<string, string> = { mousepad: "Gaming mousepads", microphone: "Gaming microphones", webcam: "Streaming webcams", "capture-card": "Capture cards", "steering-wheel": "Steering wheels", "racing-pedals": "Racing pedals", "flight-stick": "Flight sticks", "arcade-controller": "Arcade controllers", "controller-charging-station": "Controller charging stations", "console-charging-accessory": "Console charging accessories", "console-stand": "Console stands", "console-case": "Console cases", "cable-adapter": "Cables & adapters", "other-accessory": "Other gaming accessories" };
const compatibilityPeripherals = new Set(["steering-wheel", "racing-pedals", "flight-stick", "arcade-controller", "controller-charging-station", "console-charging-accessory", "console-stand", "console-case", "cable-adapter"]);
const peripheralExtraFields: Record<string, readonly TaxonomyField[]> = {
  "steering-wheel": [{ key: "pedals_included", label: "Pedals included", type: "boolean" }, { key: "force_feedback", label: "Force feedback", type: "boolean" }],
};
const peripheralChildren: readonly TaxonomyNode[] = [
  node("peripherals", "subcategory", "headset", "Gaming headsets", undefined, undefined, [manufacturerField, connectionField, { key: "microphone", label: "Microphone included", type: "boolean" }, compatibilityField]),
  node("peripherals", "subcategory", "keyboard", "Gaming keyboards", undefined, undefined, [manufacturerField, { key: "keyboard_type", label: "Keyboard type", type: "select", options: [option("mechanical", "Mechanical"), option("membrane", "Membrane"), option("optical", "Optical")] }, { key: "layout", label: "Layout", type: "text" }, { key: "switch_type", label: "Switch type", type: "text" }, connectionField]),
  node("peripherals", "subcategory", "mouse", "Gaming mice", undefined, undefined, [manufacturerField, connectionField, { key: "dpi", label: "Maximum DPI", type: "number", min: 100, max: 100000 }]),
  ...Object.keys(simplePeripheralLabels).map((id) => node("peripherals", "subcategory", id, simplePeripheralLabels[id], undefined, undefined, [manufacturerField, ...(compatibilityPeripherals.has(id) ? [compatibilityField] : []), ...(peripheralExtraFields[id] ?? [])])),
];
export const GAMING_TAXONOMY: readonly TaxonomyNode[] = [
  node("games", "root", "games", "Games", [gameFamily("playstation", "PlayStation", ["ps5", "ps4", "ps3", "ps2", "ps1", "psp", "ps-vita"]), gameFamily("xbox", "Xbox", ["xbox-series-x", "xbox-series-xs", "xbox-one", "xbox-360", "original-xbox"]), gameFamily("nintendo", "Nintendo", ["switch-2", "switch", "wii-u", "wii", "nintendo-3ds", "nintendo-ds", "gamecube", "nintendo-64", "snes", "nes", "game-boy", "game-boy-color", "game-boy-advance"]), gameFamily("pc", "PC", ["windows-pc", "macos", "linux"]), gameFamily("sega", "Sega", ["mega-drive", "master-system", "dreamcast", "saturn", "game-gear"]), gameFamily("retro-other", "Atari & Other Legacy", ["atari", "other-legacy"])], undefined, gameFields),
  node("consoles", "root", "consoles", "Consoles", [consoleFamily("playstation", "PlayStation"), consoleFamily("xbox", "Xbox"), consoleFamily("nintendo", "Nintendo"), consoleFamily("handheld", "Handheld gaming PCs"), consoleFamily("retro", "Sega & Retro")], undefined, consoleFields),
  node("controllers", "root", "controllers", "Controllers", controllerChildren.map(([id, label]) => node("controllers", "subcategory", id, label)), undefined, [manufacturerField, modelField, connectionField, compatibilityField, { key: "receiver_included", label: "Receiver or cable included", type: "boolean" }, { key: "original_box", label: "Original box included", type: "boolean" }, { key: "modifications", label: "Modifications", type: "text" }]),
  node("peripherals", "root", "peripherals", "Peripherals & Accessories", peripheralChildren), PC_HARDWARE_ROOT,
  node("gaming-pcs", "root", "gaming-pcs", "Gaming PCs", [node("gaming-pcs", "subcategory", "complete-gaming-pc", "Complete gaming PCs"), node("gaming-pcs", "subcategory", "gaming-laptop", "Gaming laptops")], undefined, [{ key: "cpu", label: "Processor", type: "text" }, { key: "gpu", label: "Graphics card", type: "text" }, { key: "ram", label: "RAM", type: "text" }, { key: "storage", label: "Storage", type: "text" }]),
  node("monitors", "root", "monitors", "Gaming Monitors", undefined, undefined, [manufacturerField, modelField, { key: "size", label: "Screen size (inches)", type: "number", min: 10, max: 100 }, { key: "resolution", label: "Resolution", type: "text" }, { key: "refresh_rate", label: "Refresh rate (Hz)", type: "number", min: 30, max: 1000 }, { key: "panel_type", label: "Panel type", type: "text" }]),
  node("vr", "root", "vr", "VR", [node("vr", "subcategory", "vr-headset", "VR headsets"), node("vr", "subcategory", "vr-accessory", "VR accessories")], undefined, [manufacturerField, modelField, compatibilityField]), node("gaming-setup", "root", "gaming-setup", "Gaming Setup", [node("gaming-setup", "subcategory", "gaming-chair", "Gaming chairs"), node("gaming-setup", "subcategory", "gaming-desk", "Gaming desks")]),
] as const;

const allNodes = (root: TaxonomyNode): TaxonomyNode[] => [root, ...(root.children?.flatMap(allNodes) ?? [])];
const rootsBySlug = new Map(GAMING_TAXONOMY.map((root) => [root.categorySlug, root]));
const optionsByValue = new Map<string, TaxonomyOption>([...GAME_PLATFORM_OPTIONS, ...COMPATIBILITY_OPTIONS, ...GENRE_OPTIONS, ...PEGI_OPTIONS, ...PC_HARDWARE_OPTIONS, ...Object.entries(MODEL_LABELS).map(([value, label]) => option(value, label))].map((item) => [item.value, item]));
export function getTaxonomyRoot(categorySlug: string): TaxonomyNode | undefined { return rootsBySlug.get(categorySlug); }
function findNode(root: TaxonomyNode, id: string): TaxonomyNode | undefined { return allNodes(root).find((item) => item.id === id); }
function findParent(root: TaxonomyNode, childId: string): TaxonomyNode | undefined { return allNodes(root).find((candidate) => candidate.children?.some((child) => child.id === childId)); }
export function getTaxonomyPath(categorySlug: string, attributes: ListingAttributes): TaxonomyNode[] {
  const root = getTaxonomyRoot(categorySlug); if (!root) return [];
  const targetId = typeof attributes.model === "string" && findNode(root, attributes.model) ? attributes.model : typeof attributes.platform === "string" && findNode(root, attributes.platform) ? attributes.platform : typeof attributes.subcategory === "string" && findNode(root, attributes.subcategory) ? attributes.subcategory : typeof attributes.family === "string" && findNode(root, attributes.family) ? attributes.family : undefined;
  if (!targetId) return [root]; const target = findNode(root, targetId)!; const parent = findParent(root, target.id); return [root, ...(parent && parent.id !== root.id ? [parent] : []), ...(target.id !== root.id ? [target] : [])];
}
export function getTaxonomyFields(categorySlug: string, attributes: ListingAttributes = {}): readonly TaxonomyField[] { if (categorySlug === "pc-components") return getPcHardwareFields(attributes); const root = getTaxonomyRoot(categorySlug); if (!root) return []; const subcategory = typeof attributes.subcategory === "string" ? findNode(root, attributes.subcategory) : undefined; return [...new Map([...(root.fields ?? []), ...(subcategory?.fields ?? [])].map((field) => [field.key, field])).values()]; }

const legacyValueAliases: Record<string, string> = { "playstation 5": "ps5", "ps 5": "ps5", "playstation portable": "psp", "ps vita": "ps-vita", "xbox one": "xbox-one", "nintendo switch": "switch", "nintendo switch 2": "switch-2" };
const legacyKeyAliases: Record<string, string> = { compatible_platforms: "compatibility", console: "platform" };
export function normalizeTaxonomyAttributes(_categorySlug: string, attributes: ListingAttributes): ListingAttributes { return Object.fromEntries(Object.entries(attributes).map(([rawKey, rawValue]) => { const key = legacyKeyAliases[rawKey.toLowerCase()] ?? rawKey; const normalizeValue = (value: string) => legacyValueAliases[value.trim().toLowerCase()] ?? value; return [key, Array.isArray(rawValue) ? rawValue.map(normalizeValue) : typeof rawValue === "string" ? normalizeValue(rawValue) : rawValue]; })); }

const structuralKeys = new Set(["taxonomy_version", "subcategory", "family", "platform", "model", "compatibility"]);
export function validateTaxonomyAttributes(categorySlug: string, input: ListingAttributes): { success: true } | { success: false; error: string } {
  const root = getTaxonomyRoot(categorySlug); if (!root) return { success: true }; const attributes = normalizeTaxonomyAttributes(categorySlug, input); const allowedFields = new Map(getTaxonomyFields(categorySlug, attributes).map((field) => [field.key, field]));
  if (attributes.taxonomy_version !== "1") return { success: false, error: "Choose a complete product category." };
  if (categorySlug === "pc-components") {
    const allowedArrayKeys = new Set(getTaxonomyFields(categorySlug, attributes).filter((field) => field.type === "multiselect").map((field) => field.key));
    const invalidArrayKey = Object.entries(attributes).find(([key, value]) => Array.isArray(value) && !allowedArrayKeys.has(key));
    if (invalidArrayKey) return { success: false, error: `${invalidArrayKey[0].replaceAll("_", " ")} cannot contain multiple values.` };
    return validatePcHardwareAttributes(attributes);
  }
  if (categorySlug === "games") {
    const family = typeof attributes.family === "string" ? root.children?.find((item) => item.id === attributes.family) : undefined;
    if (attributes.subcategory !== "game" || !family || typeof attributes.platform !== "string" || !family.children?.some((item) => item.id === attributes.platform)) return { success: false, error: "Choose a valid game platform and generation." };
  } else if (categorySlug === "consoles") {
    const family = typeof attributes.family === "string" ? root.children?.find((item) => item.id === attributes.family) : undefined;
    if (!family || typeof attributes.model !== "string" || !family.children?.some((item) => item.id === attributes.model)) return { success: false, error: "Choose a valid console family and model." };
  } else if (root.children?.length && (typeof attributes.subcategory !== "string" || !root.children.some((item) => item.id === attributes.subcategory))) return { success: false, error: `Choose a valid ${root.label.toLowerCase()} product type.` };
  for (const [key, value] of Object.entries(attributes)) {
    if (Array.isArray(value) && key !== "compatibility") return { success: false, error: `${key.replaceAll("_", " ")} cannot contain multiple values.` };
    if (TAXONOMY_FIELD_KEYS.has(key) && !allowedFields.has(key)) return { success: false, error: `${key.replaceAll("_", " ")} is not valid for this product type.` };
    if (!structuralKeys.has(key) && !allowedFields.has(key)) continue;
    if (key === "taxonomy_version" && value !== "1") return { success: false, error: "Unsupported taxonomy version." };
    const isCanonicalGameType = categorySlug === "games" && key === "subcategory" && value === "game";
    if (["subcategory", "family", "platform", "model"].includes(key) && !isCanonicalGameType && (typeof value !== "string" || !findNode(root, value))) return { success: false, error: `Invalid ${key.replaceAll("_", " ")} for ${root.label}.` };
    const field = allowedFields.get(key);
    if (key === "compatibility" || field?.type === "multiselect") { if (!Array.isArray(value) || value.length === 0 || value.some((item) => !COMPATIBILITY_OPTIONS.some((allowed) => allowed.value === item))) return { success: false, error: "Choose valid compatible platforms." }; }
    else if (field?.type === "text" && typeof value !== "string") return { success: false, error: `Enter a valid ${field.label.toLowerCase()}.` };
    else if (field?.type === "select" && (typeof value !== "string" || !field.options?.some((item) => item.value === value))) return { success: false, error: `Choose a valid ${field.label.toLowerCase()}.` };
    else if (field?.type === "number" && (typeof value !== "number" || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))) return { success: false, error: `Enter a valid ${field.label.toLowerCase()}.` };
    else if (field?.type === "boolean" && typeof value !== "boolean") return { success: false, error: `${field.label} must be yes or no.` };
  }
  for (const field of allowedFields.values()) {
    const value = attributes[field.key];
    if (field.required && (value === undefined || value === "" || (Array.isArray(value) && value.length === 0))) return { success: false, error: `Enter ${field.label.toLowerCase()}.` };
  }
  return { success: true };
}
const FIELD_LABELS = new Map([...GAMING_TAXONOMY.flatMap((root) => allNodes(root).flatMap((item) => item.fields ?? [])), ...PC_HARDWARE_FIELDS].map((field) => [field.key, field.label]));
export const TAXONOMY_FIELD_KEYS = new Set(FIELD_LABELS.keys());
const deprecatedTaxonomyAttributes = new Set(["physical_format", "physical-format", "physicalFormat", "format"]);
export function isDeprecatedTaxonomyAttribute(key: string): boolean { return deprecatedTaxonomyAttributes.has(key); }
export function sanitizeTaxonomyAttributesForWrite(attributes: ListingAttributes): ListingAttributes {
  return Object.fromEntries(Object.entries(attributes)
    .filter(([key]) => !isDeprecatedTaxonomyAttribute(key))
    .map(([key, value]) => [key, TAXONOMY_FIELD_KEYS.has(key) && typeof value === "string" ? value.trim() : value]));
}
export function mergeListingAttributes(existing: ListingAttributes, changes: ListingAttributes, taxonomyKeysToClear: Iterable<string> = [...structuralKeys, ...TAXONOMY_FIELD_KEYS]): ListingAttributes {
  const cleared = new Set(taxonomyKeysToClear);
  return { ...Object.fromEntries(Object.entries(existing).filter(([key]) => !cleared.has(key))), ...changes };
}
const humanize = (value: string) => { const words = value.replaceAll("_", " ").replaceAll("-", " "); return words.charAt(0).toUpperCase() + words.slice(1); };
const displayValue = (value: AttributeValue): string => Array.isArray(value) ? value.map((item) => optionsByValue.get(item)?.label ?? humanize(item)).join(", ") : typeof value === "boolean" ? value ? "Yes" : "No" : typeof value === "number" ? new Intl.NumberFormat("en").format(value) : optionsByValue.get(value)?.label ?? value;
export function formatTaxonomyAttribute(key: string, value: AttributeValue): { label: string; value: string } { return { label: FIELD_LABELS.get(key) ?? humanize(key), value: displayValue(value) }; }

export type TaxonomyFilter = { key: string; value: string | number | boolean; mode: "scalar" | "array" };
const FILTER_KEYS = [...new Set(["subcategory", "family", "platform", "model", "exact_model", "compatibility", "manufacturer", "genre", "edition", "packaging", "region", "pegi", "connection", "keyboard_type", "layout", "switch_type", "dpi", "pedals_included", "force_feedback", ...PC_HARDWARE_FILTER_KEYS])];
const NUMERIC_FILTER_KEYS = new Set<string>(["dpi", ...PC_HARDWARE_FIELDS.filter((field) => field.type === "number").map((field) => field.key)]);
const BOOLEAN_FILTER_KEYS = new Set<string>(["pedals_included", "force_feedback", ...PC_HARDWARE_FIELDS.filter((field) => field.type === "boolean").map((field) => field.key)]);
const ARRAY_FILTER_KEYS = new Set<string>(["compatibility", ...PC_HARDWARE_FIELDS.filter((field) => field.type === "multiselect").map((field) => field.key)]);
const filterKeySet = new Set<string>(FILTER_KEYS);
const queryValue = (params: Record<string, string | string[] | undefined>, key: string) => typeof params[key] === "string" ? (params[key] as string).trim().slice(0, 120) : "";

export function taxonomyFilterEntries(params: Record<string, string | string[] | undefined>): TaxonomyFilter[] {
  const filters: TaxonomyFilter[] = [];
  for (const key of FILTER_KEYS) {
    const value = queryValue(params, key);
    if (!value) continue;
    if (NUMERIC_FILTER_KEYS.has(key)) {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue) && numericValue >= 0) filters.push({ key, value: numericValue, mode: "scalar" });
      continue;
    }
    if (BOOLEAN_FILTER_KEYS.has(key)) {
      if (value === "true" || value === "false") filters.push({ key, value: value === "true", mode: "scalar" });
      continue;
    }
    filters.push({ key, value, mode: ARRAY_FILTER_KEYS.has(key) ? "array" : "scalar" });
  }
  return filters;
}

export function updateTaxonomyFilterParams(
  params: Record<string, string | string[] | undefined>,
  key: string,
  nextValue: string,
): Record<string, string> {
  if (params.category === "pc-components") {
    const next = sanitizeTaxonomyQueryParams(updatePcHardwareAttribute(params as ListingAttributes, key, nextValue) as Record<string, string | string[] | undefined>);
    delete next.page;
    return next;
  }
  const next = sanitizeTaxonomyQueryParams(params);
  delete next.page;
  if (nextValue) next[key] = nextValue;
  else delete next[key];
  if (key === "family") {
    delete next.platform;
    delete next.model;
  }
  return next;
}

export function sanitizeTaxonomyQueryParams(params: Record<string, string | string[] | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).flatMap(([key, currentValue]) =>
    typeof currentValue === "string" && currentValue && !isDeprecatedTaxonomyAttribute(key)
      ? [[key, currentValue]]
      : []));
}

export function inferTaxonomyIntent(query: string): { category?: string; attributes: Record<string, string>; residualQuery: string } {
  const normalized = query.trim().replace(/\s+/g, " ");
  const pcIntent = inferPcHardwareIntent(normalized);
  if (pcIntent) return pcIntent;
  const lower = normalized.toLowerCase();
  const isGames = /\b(games?|video games?)\b/.test(lower);
  const isController = /\b(controllers?|gamepads?)\b/.test(lower);
  const isAccessory = /\b(accessory|accessories|peripherals?)\b/.test(lower);
  const platforms: Array<[RegExp, string, string]> = [
    [/\bpsp\b|playstation portable/, "psp", "playstation"], [/\bps\s?vita\b|playstation vita/, "ps-vita", "playstation"], [/\bps5\b|playstation 5/, "ps5", "playstation"], [/\bps4\b|playstation 4/, "ps4", "playstation"], [/xbox one/, "xbox-one", "xbox"], [/xbox 360/, "xbox-360", "xbox"], [/xbox series/, "xbox-series", "xbox"], [/nintendo switch 2|switch 2/, "switch-2", "nintendo"], [/nintendo switch/, "switch", "nintendo"],
  ];
  const match = platforms.find(([pattern]) => pattern.test(lower));
  const residualAfter = (patterns: RegExp[]) => patterns.reduce((value, pattern) => {
    const insensitivePattern = new RegExp(pattern.source, pattern.flags.includes("i") ? pattern.flags : `${pattern.flags}i`);
    return value.replace(insensitivePattern, " ");
  }, normalized).replace(/\s+/g, " ").trim();
  if (isGames && match) return { category: "games", attributes: { family: match[2], platform: match[1] === "xbox-series" ? "xbox-series-xs" : match[1] }, residualQuery: residualAfter([match[0], /\b(?:video\s+)?games?\b/i]) };
  if (isController && match) return { category: "controllers", attributes: { compatibility: match[1] }, residualQuery: residualAfter([match[0], /\b(?:controllers?|gamepads?)\b/i]) };
  if (isAccessory && match) return { category: "peripherals", attributes: { compatibility: match[1] }, residualQuery: residualAfter([match[0], /\b(?:accessory|accessories|peripherals?)\b/i]) };
  if (/\brtx\s*\d{3,4}\b/i.test(normalized) || /\bradeon\s+(rx\s*)?\d{3,4}\b/i.test(normalized)) return { category: "pc-components", attributes: { subcategory: "gpu" }, residualQuery: normalized };
  return { attributes: {}, residualQuery: normalized };
}

export function resolveTaxonomyQuery(params: Record<string, string | string[] | undefined>): { category?: string; residualQuery: string; inferred: boolean; filters: TaxonomyFilter[] } {
  const query = queryValue(params, "q");
  const intent = inferTaxonomyIntent(query);
  const explicitCategory = queryValue(params, "category");
  const explicitFilters = taxonomyFilterEntries(params);
  const hasExplicit = Boolean(explicitCategory || explicitFilters.length);
  const compatibleInference = !explicitCategory || !intent.category || explicitCategory === intent.category ? intent.attributes : {};
  const explicitByKey = new Map(explicitFilters.map((filter) => [filter.key, filter]));
  const selectedCategory = explicitCategory || intent.category;
  const allowedKeys = selectedCategory ? new Set([
    ...(selectedCategory === "games" ? ["subcategory", "family", "platform"] : selectedCategory === "consoles" ? ["family", "model"] : ["subcategory"]),
    ...getTaxonomyFields(selectedCategory, { ...(params as ListingAttributes), ...compatibleInference }).map((field) => field.key),
  ]) : undefined;
  const candidateFilters = taxonomyFilterEntries({ ...compatibleInference, ...Object.fromEntries(explicitFilters.map((filter) => [filter.key, String(filter.value)])) })
    .map((filter) => explicitByKey.get(filter.key) ?? filter)
    .filter((filter) => !allowedKeys || allowedKeys.has(filter.key));
  const root = selectedCategory ? getTaxonomyRoot(selectedCategory) : undefined;
  const familyValue = candidateFilters.find((filter) => filter.key === "family")?.value;
  const selectedFamily = root?.children?.find((item) => item.id === familyValue);
  const pcFilters = () => {
    const byKey = new Map(candidateFilters.map((filter) => [filter.key, filter]));
    const subcategory = byKey.get("subcategory");
    if (!subcategory || typeof subcategory.value !== "string" || !root?.children?.some((item) => item.id === subcategory.value)) return [];
    const accepted: TaxonomyFilter[] = [subcategory];
    const attributes: ListingAttributes = { subcategory: subcategory.value };
    const acceptedKeys = new Set(["subcategory"]);
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const field of getPcHardwareFields(attributes)) {
        if (acceptedKeys.has(field.key)) continue;
        const filter = byKey.get(field.key);
        if (!filter) continue;
        const valid = field.type === "select" || field.type === "multiselect"
          ? typeof filter.value === "string" && Boolean(field.options?.some((item) => item.value === filter.value))
          : field.type === "number"
            ? typeof filter.value === "number" && Number.isFinite(filter.value) && (field.min === undefined || filter.value >= field.min) && (field.max === undefined || filter.value <= field.max)
            : field.type === "boolean"
              ? typeof filter.value === "boolean"
              : typeof filter.value === "string" && filter.value.length > 0;
        if (!valid) continue;
        accepted.push(filter);
        acceptedKeys.add(field.key);
        attributes[field.key] = field.type === "multiselect" ? [String(filter.value)] : filter.value;
        progressed = true;
      }
    }
    return accepted;
  };
  const mergedFilters = selectedCategory === "pc-components" ? pcFilters() : candidateFilters.filter((filter) => {
    if (!root || typeof filter.value !== "string") return true;
    if (filter.key === "family") return root.children?.some((item) => item.kind === "family" && item.id === filter.value) ?? false;
    if (filter.key === "platform" || filter.key === "model") return selectedFamily?.children?.some((item) => item.kind === filter.key && item.id === filter.value) ?? false;
    if (filter.key === "subcategory") return selectedCategory === "games" ? filter.value === "game" : root.children?.some((item) => item.kind === "subcategory" && item.id === filter.value) ?? false;
    return true;
  });
  return {
    ...(explicitCategory || intent.category ? { category: explicitCategory || intent.category } : {}),
    residualQuery: intent.residualQuery,
    inferred: !hasExplicit && Boolean(intent.category || Object.keys(intent.attributes).length),
    filters: mergedFilters,
  };
}

export function isTaxonomyFilterKey(key: string): boolean { return filterKeySet.has(key); }
