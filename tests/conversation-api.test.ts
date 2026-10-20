import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "buyer-1" } as { id: string } | null,
  rpcData: "22222222-2222-4222-8222-222222222222" as string | null,
  rpcError: null as { code: string } | null,
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
}));

vi.mock("@/lib/auth", () => ({ getUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    async rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      return { data: state.rpcData, error: state.rpcError };
    },
  })),
}));
vi.mock("@/lib/validation", async () => import("../lib/validation"));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

import { POST } from "../app/api/conversations/route";

const listingId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";

function jsonRequest(body: unknown = { listingId }) {
  return new Request("https://ggmarket.test/api/conversations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "ggmarket.test",
      origin: "https://ggmarket.test",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

function formRequest() {
  return new Request("https://ggmarket.test/api/conversations", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      host: "ggmarket.test",
      origin: "https://ggmarket.test",
      referer: `https://ggmarket.test/listing/${listingId}`,
      "sec-fetch-site": "same-origin",
    },
    body: new URLSearchParams({ listingId }),
  });
}

describe("conversation start API", () => {
  beforeEach(() => {
    state.user = { id: "buyer-1" };
    state.rpcData = conversationId;
    state.rpcError = null;
    state.rpcCalls = [];
  });

  it("rejects invalid listing input before calling the RPC", async () => {
    const response = await POST(jsonRequest({ listingId: "invalid" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid listing." });
    expect(state.rpcCalls).toEqual([]);
  });

  it("rejects an unauthenticated JSON request without calling the RPC", async () => {
    state.user = null;

    const response = await POST(jsonRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Please log in to message sellers." });
    expect(state.rpcCalls).toEqual([]);
  });

  it("redirects an unauthenticated native form to login with listing context", async () => {
    state.user = null;

    const response = await POST(formRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://ggmarket.test/login?next=%2Flisting%2F${listingId}`,
    );
    expect(state.rpcCalls).toEqual([]);
  });

  it("returns the existing or newly-created conversation for JSON clients", async () => {
    const response = await POST(jsonRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: conversationId });
    expect(state.rpcCalls).toEqual([
      { name: "start_conversation", args: { target_listing_id: listingId } },
    ]);
  });

  it("redirects an authenticated native form to the conversation", async () => {
    const response = await POST(formRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://ggmarket.test/messages/${conversationId}`,
    );
  });

  it("returns a safe error when the authoritative RPC rejects the request", async () => {
    state.rpcError = { code: "23514" };
    state.rpcData = null;

    const response = await POST(jsonRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "This conversation could not be started." });
  });

  it("reuses an idempotent RPC result without accepting buyer or seller identity", async () => {
    const first = await POST(jsonRequest({ listingId }));
    const second = await POST(jsonRequest({ listingId }));

    await expect(first.json()).resolves.toEqual({ id: conversationId });
    await expect(second.json()).resolves.toEqual({ id: conversationId });
    expect(state.rpcCalls).toEqual([
      { name: "start_conversation", args: { target_listing_id: listingId } },
      { name: "start_conversation", args: { target_listing_id: listingId } },
    ]);
  });
});
