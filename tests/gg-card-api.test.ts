import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null,
  payload: null as Record<string, unknown> | null,
  result: { data: { slogan: "GG forever", theme_id: "crimson", is_public: true, text_color: "#112233", front_pattern_color: "#AABBCC" }, error: null as { code: string } | null },
}));

vi.mock("@/lib/auth", () => ({ getUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      if (table !== "gg_cards") throw new Error(`unexpected table ${table}`);
      const query = {
        upsert(payload: Record<string, unknown>) { state.payload = payload; return query; },
        select() { return query; },
        async single() { return state.result; },
      };
      return query;
    },
  })),
}));
vi.mock("@/lib/validation", async () => import("../lib/validation"));
vi.mock("@/lib/security", async () => import("../lib/security"));

import { PATCH } from "../app/api/gg-card/route";

function request(body: unknown) {
  return new Request("https://lootriva.test/api/gg-card", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validCard = {
  slogan: "GG forever",
  themeId: "crimson",
  isPublic: true,
  textColor: "#112233",
  frontPatternColor: "#aabbcc",
};

describe("Lootriva Card mutation API", () => {
  beforeEach(() => {
    state.user = { id: "11111111-1111-4111-8111-111111111111" };
    state.payload = null;
    state.result = { data: { slogan: "GG forever", theme_id: "crimson", is_public: true, text_color: "#112233", front_pattern_color: "#AABBCC" }, error: null };
  });

  it("rejects unauthenticated callers before database access", async () => {
    state.user = null;
    const response = await PATCH(request(validCard));
    expect(response.status).toBe(401);
    expect(state.payload).toBeNull();
  });

  it("rejects forged identity and invalid themes before database access", async () => {
    for (const body of [
      { ...validCard, userId: crypto.randomUUID() },
      { ...validCard, themeId: "url(javascript:alert(1))" },
      { ...validCard, textColor: "red" },
      { ...validCard, frontPatternColor: "#123456;display:none" },
    ]) {
      const response = await PATCH(request(body));
      expect(response.status).toBe(400);
    }
    expect(state.payload).toBeNull();
  });

  it("rejects an oversized declared body before database access", async () => {
    const response = await PATCH(new Request("https://lootriva.test/api/gg-card", {
      method: "PATCH",
      headers: { "content-type": "application/json", "content-length": "70000" },
      body: JSON.stringify({ ...validCard, slogan: "safe" }),
    }));
    expect(response.status).toBe(400);
    expect(state.payload).toBeNull();
  });

  it("derives ownership from the session and returns the persisted safe shape", async () => {
    const response = await PATCH(request({ ...validCard, slogan: "  GG forever  " }));
    expect(response.status).toBe(200);
    expect(state.payload).toEqual({
      user_id: "11111111-1111-4111-8111-111111111111",
      slogan: "GG forever",
      theme_id: "crimson",
      is_public: true,
      text_color: "#112233",
      front_pattern_color: "#AABBCC",
    });
    await expect(response.json()).resolves.toEqual({ card: {
      slogan: "GG forever",
      themeId: "crimson",
      isPublic: true,
      textColor: "#112233",
      frontPatternColor: "#AABBCC",
    } });
  });

  it("returns a safe forbidden response when RLS or suspension rejects the write", async () => {
    state.result = { data: null as never, error: { code: "42501" } };
    const response = await PATCH(request(validCard));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Your Lootriva Card could not be saved." });
  });
});
