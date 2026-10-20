import { describe, expect, it } from "vitest";
import {
  createChatScope,
  createPendingMessage,
  failPendingMessage,
  mergeChatMessages,
  reconcileChatState,
  type ChatState,
  type PersistedMessageRow,
} from "../lib/chat-state";

const scopeA = createChatScope("account-a", "conversation-1");
const scopeB = createChatScope("account-b", "conversation-1");
const clientId = "11111111-1111-4111-8111-111111111111";
const pending = createPendingMessage({
  clientId,
  senderId: "account-a",
  body: "Hello",
  createdAt: "2026-10-20T08:00:01.000Z",
});
const persisted: PersistedMessageRow = {
  id: "22222222-2222-4222-8222-222222222222",
  conversation_id: "conversation-1",
  sender_id: "account-a",
  body: "Hello",
  client_id: clientId,
  created_at: "2026-10-20T08:00:02.000Z",
};

describe("account-scoped chat state", () => {
  it("replaces a pending message with its canonical persisted row", () => {
    const merged = mergeChatMessages([pending], [persisted]);

    expect(merged).toEqual([{
      id: persisted.id,
      senderId: "account-a",
      body: "Hello",
      clientId,
      createdAt: persisted.created_at,
      status: "sent",
    }]);
  });

  it("deduplicates a realtime event that arrives before the POST response", () => {
    const afterEvent = mergeChatMessages([pending], [persisted]);
    const afterResponse = mergeChatMessages(afterEvent, [persisted]);

    expect(afterResponse).toHaveLength(1);
    expect(afterResponse[0]?.id).toBe(persisted.id);
  });

  it("orders reconciled messages chronologically regardless of arrival order", () => {
    const later = { ...persisted, id: "33333333-3333-4333-8333-333333333333", client_id: null, created_at: "2026-10-20T08:01:00.000Z" };
    const earlier = { ...persisted, id: "44444444-4444-4444-8444-444444444444", client_id: null, created_at: "2026-10-20T07:59:00.000Z" };

    expect(mergeChatMessages([], [later, earlier]).map((item) => item.id)).toEqual([
      earlier.id,
      later.id,
    ]);
  });

  it("retains failed message text and idempotency identity for retry", () => {
    const failed = failPendingMessage([pending], clientId);

    expect(failed[0]).toMatchObject({
      body: "Hello",
      clientId,
      status: "failed",
    });
  });

  it("ignores delayed reconciliation from another authenticated account", () => {
    const state: ChatState = { scope: scopeB, messages: [] };

    const result = reconcileChatState(state, scopeA, [persisted]);

    expect(result).toBe(state);
    expect(result.messages).toEqual([]);
  });

  it("ignores delayed reconciliation from another conversation", () => {
    const currentScope = createChatScope("account-a", "conversation-2");
    const state: ChatState = { scope: currentScope, messages: [] };

    expect(reconcileChatState(state, scopeA, [persisted])).toBe(state);
  });
});

