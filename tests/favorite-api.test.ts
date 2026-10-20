import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  listing: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null,
  listingError: null as { code: string } | null,
  writeError: null as { code: string } | null,
  upsertPayload: null as Record<string, unknown> | null,
  deleteFilters: [] as Array<[string, string]>,
}));

vi.mock("@/lib/auth", () => ({ getUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      if (table === "listings") {
        const query = {
          select() { return query; },
          eq() { return query; },
          async maybeSingle() { return { data: state.listing, error: state.listingError }; },
        };
        return query;
      }
      const query = {
        upsert(payload: Record<string, unknown>) {
          state.upsertPayload = payload;
          return Promise.resolve({ error: state.writeError });
        },
        delete() { return query; },
        eq(column: string, value: string) {
          state.deleteFilters.push([column, value]);
          return state.deleteFilters.length === 2
            ? Promise.resolve({ error: state.writeError })
            : query;
        },
      };
      return query;
    },
  })),
}));
vi.mock("@/lib/validation", async () => import("../lib/validation"));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

import { DELETE, POST } from "../app/api/favorites/route";

const listingId = "11111111-1111-4111-8111-111111111111";
const request = (method: "POST" | "DELETE", body: unknown = { listingId }) =>
  new Request("https://ggmarket.test/api/favorites", {
    method,
    headers: {
      "content-type": "application/json",
      host: "ggmarket.test",
      origin: "https://ggmarket.test",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
const formRequest = (intent: "add" | "remove", host = "ggmarket.test") =>
  new Request("https://0.0.0.0/api/favorites", {
    method: "POST",
    headers: {
      host,
      origin: `https://${host}`,
      referer: `https://${host}/marketplace?category=games`,
      "sec-fetch-site": "same-origin",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ listingId, intent }),
  });

describe("favorites API ownership and persistence contract", () => {
  beforeEach(() => {
    state.user = { id: "user-1" };
    state.listing = { id: listingId };
    state.listingError = null;
    state.writeError = null;
    state.upsertPayload = null;
    state.deleteFilters = [];
  });

  it("rejects an unauthenticated request without writing", async () => {
    state.user = null;
    const response = await POST(request("POST"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Please log in to save listings." });
    expect(state.upsertPayload).toBeNull();
  });

  it("rejects an invalid listing id", async () => {
    const response = await POST(request("POST", { listingId: "not-a-uuid" }));
    expect(response.status).toBe(400);
    expect(state.upsertPayload).toBeNull();
  });

  it("writes an idempotent favorite owned by the current user", async () => {
    const response = await POST(request("POST"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ favorite: true });
    expect(state.upsertPayload).toEqual({ user_id: "user-1", listing_id: listingId });
  });

  it("scopes deletion to both current user and listing", async () => {
    const response = await DELETE(request("DELETE"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ favorite: false });
    expect(state.deleteFilters).toEqual([
      ["user_id", "user-1"],
      ["listing_id", listingId],
    ]);
  });

  it("returns a safe error and does not claim success when persistence fails", async () => {
    state.writeError = { code: "42501" };
    const response = await POST(request("POST"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "The listing could not be saved." });
  });

  it("supports a native add form and returns to the public-host page", async () => {
    const response = await POST(formRequest("add", "192.168.2.21:3000"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://192.168.2.21:3000/marketplace?category=games");
    expect(state.upsertPayload).toEqual({ user_id: "user-1", listing_id: listingId });
  });

  it("supports native remove intent without requiring JavaScript", async () => {
    const response = await POST(formRequest("remove"));
    expect(response.status).toBe(303);
    expect(state.deleteFilters).toEqual([
      ["user_id", "user-1"],
      ["listing_id", listingId],
    ]);
  });

  it("redirects an unauthenticated native form to Login with its return path", async () => {
    state.user = null;
    const response = await POST(formRequest("add"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://ggmarket.test/login?next=%2Fmarketplace%3Fcategory%3Dgames",
    );
  });
});
