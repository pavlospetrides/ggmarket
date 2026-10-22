import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "account-a" } as { id: string } | null,
  queries: [] as Array<{ mode: "select" | "update"; filters: Array<[string, string, unknown]> }>,
  selectIndex: 0,
}));

class Query {
  constructor(private result: { data?: unknown[]; count?: number | null; error: null }, private record: (typeof state.queries)[number]) {}
  eq(column: string, value: unknown) { this.record.filters.push(["eq", column, value]); return this; }
  is(column: string, value: unknown) { this.record.filters.push(["is", column, value]); return this; }
  in(column: string, value: unknown) { this.record.filters.push(["in", column, value]); return this; }
  order() { return this; }
  limit() { return this; }
  then(resolve: (value: typeof this.result) => unknown) { return Promise.resolve(this.result).then(resolve); }
}

vi.mock("@/lib/auth", () => ({ getUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      expect(table).toBe("notifications");
      return {
        select() {
          const record = { mode: "select" as const, filters: [] as Array<[string, string, unknown]> };
          state.queries.push(record);
          const index = state.selectIndex++;
          return new Query(index === 0 ? { data: [], error: null } : { count: index === 1 ? 4 : 2, error: null }, record);
        },
        update() {
          const record = { mode: "update" as const, filters: [] as Array<[string, string, unknown]> };
          state.queries.push(record);
          return new Query({ error: null }, record);
        },
      };
    },
  })),
}));

import { GET, PATCH } from "../app/api/notifications/route";

describe("notification API", () => {
  beforeEach(() => {
    state.user = { id: "account-a" };
    state.queries = [];
    state.selectIndex = 0;
  });

  it("returns exact total and incoming-message unread counts", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({ userId: "account-a", items: [], unread: 4, unreadMessages: 2 });
    expect(state.queries[2].filters).toContainEqual(["eq", "user_id", "account-a"]);
    expect(state.queries[2].filters).toContainEqual(["eq", "type", "message"]);
    expect(state.queries[2].filters).toContainEqual(["is", "read_at", null]);
  });

  it("returns an explicit anonymous scope without querying private notifications", async () => {
    state.user = null;

    const response = await GET();

    expect(await response.json()).toEqual({ userId: null, items: [], unread: 0, unreadMessages: 0 });
    expect(state.queries).toEqual([]);
  });

  it("batch-marks only authenticated-owner rows in the displayed snapshot", async () => {
    const response = await PATCH(new Request("https://ggmarket.test/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: ["n1", "n2"] }),
    }));
    expect(response.status).toBe(200);
    expect(state.queries[0].filters).toEqual([
      ["eq", "user_id", "account-a"],
      ["is", "read_at", null],
      ["in", "id", ["n1", "n2"]],
    ]);
  });

  it("rejects malformed or duplicate batch identifiers", async () => {
    const response = await PATCH(new Request("https://ggmarket.test/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: ["n1", "n1"] }),
    }));
    expect(response.status).toBe(400);
    expect(state.queries).toEqual([]);
  });
});
