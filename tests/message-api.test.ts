import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  client_id: string;
  created_at: string;
};

const conversationId = "11111111-1111-4111-8111-111111111111";
const otherConversationId = "22222222-2222-4222-8222-222222222222";
const clientId = "33333333-3333-4333-8333-333333333333";
const senderId = "buyer-1";
const persisted: Row = {
  id: "44444444-4444-4444-8444-444444444444",
  conversation_id: conversationId,
  sender_id: senderId,
  body: "Hello, is this available?",
  client_id: clientId,
  created_at: "2026-10-20T08:00:00.000Z",
};

const state = vi.hoisted(() => ({
  user: { id: "buyer-1" } as { id: string } | null,
  insertError: null as { code: string } | null,
  selectError: null as { code: string } | null,
  insertRow: null as Row | null,
  selectRows: [] as Row[],
  duplicateRow: null as Row | null,
  inserted: [] as Array<Record<string, unknown>>,
  filters: [] as Array<[string, unknown]>,
}));

class MessageQuery {
  private mode: "select" | "insert";

  constructor(mode: "select" | "insert") {
    this.mode = mode;
  }

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    state.filters.push([column, value]);
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return Promise.resolve({ data: state.selectRows, error: state.selectError });
  }

  single() {
    return Promise.resolve({ data: state.insertRow, error: state.insertError });
  }

  maybeSingle() {
    return Promise.resolve({ data: state.duplicateRow, error: null });
  }
}

vi.mock("@/lib/auth", () => ({ getUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      expect(table).toBe("messages");
      return {
        insert(value: Record<string, unknown>) {
          state.inserted.push(value);
          return new MessageQuery("insert");
        },
        select() {
          return new MessageQuery("select");
        },
      };
    },
  })),
}));
vi.mock("@/lib/validation", async () => import("../lib/validation"));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/request-security", async () => import("../lib/request-security"));

import { GET, POST } from "../app/api/conversations/[id]/messages/route";

const context = (id = conversationId) => ({ params: Promise.resolve({ id }) });

function jsonRequest(body: unknown = { body: persisted.body, clientId }) {
  return new Request(`https://ggmarket.test/api/conversations/${conversationId}/messages`, {
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
  return new Request(`https://ggmarket.test/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      host: "ggmarket.test",
      origin: "https://ggmarket.test",
      referer: `https://ggmarket.test/messages/${conversationId}`,
      "sec-fetch-site": "same-origin",
    },
    body: new URLSearchParams({ message: persisted.body, clientId }),
  });
}

describe("conversation message API", () => {
  beforeEach(() => {
    state.user = { id: senderId };
    state.insertError = null;
    state.selectError = null;
    state.insertRow = persisted;
    state.selectRows = [persisted];
    state.duplicateRow = null;
    state.inserted = [];
    state.filters = [];
  });

  it("rejects unauthenticated reads and writes before database access", async () => {
    state.user = null;

    const read = await GET(new Request(`https://ggmarket.test/api/conversations/${conversationId}/messages`), context());
    const write = await POST(jsonRequest(), context());

    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
    expect(state.inserted).toEqual([]);
    expect(state.filters).toEqual([]);
  });

  it("rejects malformed conversation identifiers", async () => {
    const response = await POST(jsonRequest(), context("not-a-uuid"));

    expect(response.status).toBe(400);
    expect(state.inserted).toEqual([]);
  });

  it("derives sender identity on the server and returns the persisted canonical row", async () => {
    const response = await POST(jsonRequest(), context());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(persisted);
    expect(state.inserted).toEqual([{
      conversation_id: conversationId,
      sender_id: senderId,
      body: persisted.body,
      client_id: clientId,
    }]);
  });

  it("rejects client-supplied sender or conversation identity", async () => {
    const response = await POST(jsonRequest({
      body: persisted.body,
      clientId,
      senderId: "seller-impersonation-attempt",
      conversationId: otherConversationId,
    }), context());

    expect(response.status).toBe(400);
    expect(state.inserted).toEqual([]);
  });

  it("returns forbidden when RLS rejects a non-participant write", async () => {
    state.insertRow = null;
    state.insertError = { code: "42501" };

    const response = await POST(jsonRequest(), context());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "You cannot send messages in this conversation." });
  });

  it("scopes duplicate idempotency recovery to sender and conversation", async () => {
    state.insertRow = null;
    state.insertError = { code: "23505" };
    state.duplicateRow = persisted;

    const response = await POST(jsonRequest(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(persisted);
    expect(state.filters).toEqual([
      ["sender_id", senderId],
      ["client_id", clientId],
      ["conversation_id", conversationId],
    ]);
  });

  it("returns only RLS-authorized conversation messages for reconciliation", async () => {
    const response = await GET(new Request(`https://ggmarket.test/api/conversations/${conversationId}/messages`), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ messages: [persisted] });
    expect(state.filters).toContainEqual(["conversation_id", conversationId]);
  });

  it("does not expose messages when RLS rejects a third-party read", async () => {
    state.selectRows = [];
    state.selectError = { code: "42501" };

    const response = await GET(new Request(`https://ggmarket.test/api/conversations/${conversationId}/messages`), context());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "You cannot read this conversation." });
  });

  it("accepts a native form POST and redirects back after persistence", async () => {
    const response = await POST(formRequest(), context());

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://ggmarket.test/messages/${conversationId}`);
    expect(state.inserted).toHaveLength(1);
  });
});

