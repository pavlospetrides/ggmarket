export const GG_CARD_THEMES = {
  "gg-purple": { id: "gg-purple", label: "Lootriva Purple", strapColor: "#6d46d9", inkColor: "#f5f1ff", cardColor: "#171329" },
  "midnight-black": { id: "midnight-black", label: "Midnight Black", strapColor: "#171a21", inkColor: "#f4f5f7", cardColor: "#090b10" },
  "arctic-white": { id: "arctic-white", label: "Arctic White", strapColor: "#e8edf5", inkColor: "#182033", cardColor: "#f9fbff" },
  crimson: { id: "crimson", label: "Crimson", strapColor: "#a61f35", inkColor: "#fff3f5", cardColor: "#2a0f16" },
} as const;

export type GGCardThemeId = keyof typeof GG_CARD_THEMES;
export type GGCardConfig = {
  slogan: string;
  themeId: GGCardThemeId;
  isPublic: boolean;
  textColor: string;
  frontPatternColor: string;
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function normalizeHexColor(value: string) {
  const normalized = value.trim();
  return HEX_COLOR.test(normalized) ? normalized.toUpperCase() : null;
}

function relativeLuminance(color: string) {
  const normalized = normalizeHexColor(color);
  if (!normalized) throw new TypeError("Expected a six-digit HEX color.");
  const channels = [1, 3, 5].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function resolveGGCardColors(
  themeId: GGCardThemeId,
  textColor?: string | null,
  frontPatternColor?: string | null,
) {
  const fallback = GG_CARD_THEMES[themeId].inkColor.toUpperCase();
  return {
    textColor: textColor ? normalizeHexColor(textColor) ?? fallback : fallback,
    frontPatternColor: frontPatternColor ? normalizeHexColor(frontPatternColor) ?? fallback : fallback,
  };
}

const defaultColors = resolveGGCardColors("gg-purple");

export const DEFAULT_GG_CARD: GGCardConfig = {
  slogan: "Play. Trade. Belong.",
  themeId: "gg-purple",
  isPublic: false,
  ...defaultColors,
};

export function getGGCardTheme(themeId: GGCardThemeId) {
  return GG_CARD_THEMES[themeId];
}
export type GGCardRow = {
  slogan: string;
  theme_id: GGCardThemeId;
  is_public: boolean;
  text_color: string | null;
  front_pattern_color: string | null;
};

export function mapGGCardRow(row: GGCardRow | null, owner = false): GGCardConfig | null {
  if (!row) return owner ? { ...DEFAULT_GG_CARD } : null;
  return {
    slogan: row.slogan,
    themeId: row.theme_id,
    isPublic: row.is_public,
    ...resolveGGCardColors(row.theme_id, row.text_color, row.front_pattern_color),
  };
}
