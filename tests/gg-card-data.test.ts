import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ selected: "" }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    const row = {
      slogan: "Persisted identity",
      theme_id: "arctic-white",
      is_public: true,
      text_color: "#123456",
      front_pattern_color: "#ABCDEF",
    };
    const query = {
      select(columns: string) { state.selected = columns; return query; },
      eq() { return query; },
      async maybeSingle() {
        const selected = Object.fromEntries(
          state.selected.split(",").filter((column) => column in row).map((column) => [column, row[column as keyof typeof row]]),
        );
        return { data: selected, error: null };
      },
    };
    return { from: () => query };
  }),
}));

import { getOwnGGCard } from "../lib/data";

describe("Lootriva Card reload data", () => {
  beforeEach(() => { state.selected = ""; });

  it("restores both independently persisted colors for the authenticated owner", async () => {
    await expect(getOwnGGCard("11111111-1111-4111-8111-111111111111")).resolves.toEqual({
      slogan: "Persisted identity",
      themeId: "arctic-white",
      isPublic: true,
      textColor: "#123456",
      frontPatternColor: "#ABCDEF",
    });
    expect(state.selected).toBe("slogan,theme_id,is_public,text_color,front_pattern_color");
  });
});
