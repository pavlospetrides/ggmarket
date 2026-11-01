export const GG_CARD_THEMES = {
  "gg-purple": { id: "gg-purple", label: "GG Purple", strapColor: "#6d46d9", inkColor: "#f5f1ff", cardColor: "#171329" },
  "midnight-black": { id: "midnight-black", label: "Midnight Black", strapColor: "#171a21", inkColor: "#f4f5f7", cardColor: "#090b10" },
  "arctic-white": { id: "arctic-white", label: "Arctic White", strapColor: "#e8edf5", inkColor: "#182033", cardColor: "#f9fbff" },
  crimson: { id: "crimson", label: "Crimson", strapColor: "#a61f35", inkColor: "#fff3f5", cardColor: "#2a0f16" },
} as const;

export type GGCardThemeId = keyof typeof GG_CARD_THEMES;
export type GGCardConfig = { slogan: string; themeId: GGCardThemeId; isPublic: boolean };

export const DEFAULT_GG_CARD: GGCardConfig = {
  slogan: "Play. Trade. Belong.",
  themeId: "gg-purple",
  isPublic: false,
};

export function getGGCardTheme(themeId: GGCardThemeId) {
  return GG_CARD_THEMES[themeId];
}
export type GGCardRow = { slogan: string; theme_id: GGCardThemeId; is_public: boolean };

export function mapGGCardRow(row: GGCardRow | null, owner = false): GGCardConfig | null {
  if (!row) return owner ? { ...DEFAULT_GG_CARD } : null;
  return { slogan: row.slogan, themeId: row.theme_id, isPublic: row.is_public };
}
