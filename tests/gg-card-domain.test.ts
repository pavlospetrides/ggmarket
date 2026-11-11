import { describe, expect, it } from "vitest";
import { DEFAULT_GG_CARD, GG_CARD_THEMES, getGGCardTheme, mapGGCardRow } from "../lib/gg-card";
import { ggCardSchema } from "../lib/validation";
import { shouldAnimateBadge } from "../components/ui/lanyard-badge";

describe("Lootriva Card domain contract", () => {
  it("provides the private GG Purple default and four complete safe themes", () => {
    expect(DEFAULT_GG_CARD).toEqual({ slogan: "Play. Trade. Belong.", themeId: "gg-purple", isPublic: false });
    expect(Object.keys(GG_CARD_THEMES)).toEqual(["gg-purple", "midnight-black", "arctic-white", "crimson"]);
    expect(getGGCardTheme("crimson")).toEqual({
      id: "crimson",
      label: "Crimson",
      strapColor: "#a61f35",
      inkColor: "#fff3f5",
      cardColor: "#2a0f16",
    });
  });

  it("normalizes a valid payload at the 80-character boundary", () => {
    expect(ggCardSchema.parse({ slogan: `  ${"x".repeat(80)}  `, themeId: "arctic-white", isPublic: true })).toEqual({
      slogan: "x".repeat(80),
      themeId: "arctic-white",
      isPublic: true,
    });
  });

  it("maps database fields to the serializable UI shape and defaults a missing owner row", () => {
    expect(mapGGCardRow({ slogan: "Ready player", theme_id: "midnight-black", is_public: true })).toEqual({
      slogan: "Ready player", themeId: "midnight-black", isPublic: true,
    });
    expect(mapGGCardRow(null, true)).toEqual(DEFAULT_GG_CARD);
    expect(mapGGCardRow(null, false)).toBeNull();
  });

  it.each([
    [{ slogan: "", themeId: "gg-purple", isPublic: false }, "blank slogan"],
    [{ slogan: "x".repeat(81), themeId: "gg-purple", isPublic: false }, "oversized slogan"],
    [{ slogan: "hello\u0000world", themeId: "gg-purple", isPublic: false }, "control characters"],
    [{ slogan: "hello", themeId: "custom-css", isPublic: false }, "unknown theme"],
    [{ slogan: "hello", themeId: "gg-purple", isPublic: false, userId: crypto.randomUUID() }, "target user id"],
  ])("rejects %s (%s)", (payload, _label) => {
    void _label;
    expect(ggCardSchema.safeParse(payload).success).toBe(false);
  });
});
describe("Lootriva Card animation lifecycle", () => {
  it.each([
    [{ reduced: false, documentVisible: true, intersecting: true }, true],
    [{ reduced: true, documentVisible: true, intersecting: true }, false],
    [{ reduced: false, documentVisible: false, intersecting: true }, false],
    [{ reduced: false, documentVisible: true, intersecting: false }, false],
  ])("runs frames only when motion is allowed and visible", (state, expected) => {
    expect(shouldAnimateBadge(state)).toBe(expected);
  });
});
