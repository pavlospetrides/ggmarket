import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  DEFAULT_GG_CARD,
  GG_CARD_THEMES,
  getGGCardTheme,
  mapGGCardRow,
  normalizeHexColor,
  resolveGGCardColors,
} from "../lib/gg-card";
import { ggCardSchema } from "../lib/validation";
import { shouldAnimateBadge } from "../components/ui/lanyard-badge";

describe("Lootriva Card domain contract", () => {
  it("provides the private GG Purple default and four complete safe themes", () => {
    expect(DEFAULT_GG_CARD).toEqual({
      slogan: "Play. Trade. Belong.",
      themeId: "gg-purple",
      isPublic: false,
      textColor: "#F5F1FF",
      frontPatternColor: "#F5F1FF",
    });
    expect(Object.keys(GG_CARD_THEMES)).toEqual(["gg-purple", "midnight-black", "arctic-white", "crimson"]);
    expect(getGGCardTheme("crimson")).toEqual({
      id: "crimson",
      label: "Crimson",
      strapColor: "#a61f35",
      inkColor: "#fff3f5",
      cardColor: "#2a0f16",
    });
  });

  it("normalizes exact six-digit HEX colors without accepting CSS payloads", () => {
    expect(normalizeHexColor("  #8f7bff ")).toBe("#8F7BFF");
    expect(normalizeHexColor("#0B0D12")).toBe("#0B0D12");
    for (const value of ["#fff", "#ffffffff", "red", "url(javascript:alert(1))", "#123456;display:none", `#${"a".repeat(80)}`]) {
      expect(normalizeHexColor(value)).toBeNull();
    }
  });

  it("computes WCAG contrast and resolves legacy colors independently", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.478, 2);
    expect(resolveGGCardColors("arctic-white", null, null)).toEqual({
      textColor: "#182033",
      frontPatternColor: "#182033",
    });
    expect(resolveGGCardColors("gg-purple", "#001122", "#aabbcc")).toEqual({
      textColor: "#001122",
      frontPatternColor: "#AABBCC",
    });
  });

  it("normalizes a valid payload at the 80-character boundary", () => {
    expect(ggCardSchema.parse({ slogan: `  ${"x".repeat(80)}  `, themeId: "arctic-white", isPublic: true, textColor: "#123abc", frontPatternColor: "#fedcba" })).toEqual({
      slogan: "x".repeat(80),
      themeId: "arctic-white",
      isPublic: true,
      textColor: "#123ABC",
      frontPatternColor: "#FEDCBA",
    });
  });

  it("maps database fields to the serializable UI shape and defaults a missing owner row", () => {
    expect(mapGGCardRow({ slogan: "Ready player", theme_id: "midnight-black", is_public: true, text_color: "#112233", front_pattern_color: "#aabbcc" })).toEqual({
      slogan: "Ready player", themeId: "midnight-black", isPublic: true, textColor: "#112233", frontPatternColor: "#AABBCC",
    });
    expect(mapGGCardRow({ slogan: "Legacy", theme_id: "arctic-white", is_public: false, text_color: null, front_pattern_color: null })).toEqual({
      slogan: "Legacy", themeId: "arctic-white", isPublic: false, textColor: "#182033", frontPatternColor: "#182033",
    });
    expect(mapGGCardRow(null, true)).toEqual(DEFAULT_GG_CARD);
    expect(mapGGCardRow(null, false)).toBeNull();
  });

  it.each([
    [{ slogan: "", themeId: "gg-purple", isPublic: false, textColor: "#FFFFFF", frontPatternColor: "#FFFFFF" }, "blank slogan"],
    [{ slogan: "x".repeat(81), themeId: "gg-purple", isPublic: false, textColor: "#FFFFFF", frontPatternColor: "#FFFFFF" }, "oversized slogan"],
    [{ slogan: "hello\u0000world", themeId: "gg-purple", isPublic: false, textColor: "#FFFFFF", frontPatternColor: "#FFFFFF" }, "control characters"],
    [{ slogan: "hello", themeId: "custom-css", isPublic: false, textColor: "#FFFFFF", frontPatternColor: "#FFFFFF" }, "unknown theme"],
    [{ slogan: "hello", themeId: "gg-purple", isPublic: false, textColor: "red", frontPatternColor: "#FFFFFF" }, "unsafe text color"],
    [{ slogan: "hello", themeId: "gg-purple", isPublic: false, textColor: "#FFFFFF", frontPatternColor: "#123456;" }, "unsafe pattern color"],
    [{ slogan: "hello", themeId: "gg-purple", isPublic: false, textColor: "#FFFFFF", frontPatternColor: "#FFFFFF", userId: crypto.randomUUID() }, "target user id"],
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
