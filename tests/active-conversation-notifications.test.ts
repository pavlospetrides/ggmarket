import { describe, expect, it } from "vitest";
import {
  createActiveConversationRegistry,
  shouldSuppressForegroundMessage,
} from "../lib/active-conversation-notifications";
import type { NotificationItem } from "../lib/notification-state";

const conversationA = "11111111-1111-4111-8111-111111111111";
const conversationB = "22222222-2222-4222-8222-222222222222";
const message = (conversationId: string): NotificationItem => ({
  id: "notification-1",
  type: "message",
  title: "New message",
  body: "Hello",
  href: `/messages/${conversationId}`,
  read_at: null,
  created_at: "2026-11-03T08:00:00.000Z",
});

describe("active conversation notification awareness", () => {
  it("suppresses a message only for the matching live, visible, focused conversation", () => {
    const registry = createActiveConversationRegistry();
    registry.register(conversationA, true);

    expect(shouldSuppressForegroundMessage(message(conversationA), registry, {
      visibilityState: "visible",
      hasFocus: true,
    })).toBe(true);
  });

  it.each([
    ["another conversation", message(conversationB), "visible", true],
    ["another page", { ...message(conversationA), href: "/marketplace" }, "visible", true],
    ["hidden tab", message(conversationA), "hidden", true],
    ["unfocused window", message(conversationA), "visible", false],
    ["non-message event", { ...message(conversationA), type: "offer" }, "visible", true],
  ] as const)("keeps normal notification behavior for %s", (_label, item, visibilityState, hasFocus) => {
    const registry = createActiveConversationRegistry();
    registry.register(conversationA, true);

    expect(shouldSuppressForegroundMessage(item, registry, { visibilityState, hasFocus })).toBe(false);
  });

  it("stops suppressing when the chat disconnects and resumes after reconnect", () => {
    const registry = createActiveConversationRegistry();
    const releaseLive = registry.register(conversationA, true);
    releaseLive();
    registry.register(conversationA, false);
    expect(shouldSuppressForegroundMessage(message(conversationA), registry, { visibilityState: "visible", hasFocus: true })).toBe(false);

    registry.register(conversationA, true);
    expect(shouldSuppressForegroundMessage(message(conversationA), registry, { visibilityState: "visible", hasFocus: true })).toBe(true);
  });

  it("clears on navigation and ignores stale cleanup from a previous conversation", () => {
    const registry = createActiveConversationRegistry();
    const releaseA = registry.register(conversationA, true);
    const releaseB = registry.register(conversationB, true);
    releaseA();
    expect(registry.current()).toEqual({ conversationId: conversationB, live: true });
    releaseB();
    expect(registry.current()).toBeNull();
  });

  it("keeps tabs and devices independent instead of sharing active state", () => {
    const focusedTab = createActiveConversationRegistry();
    const otherSession = createActiveConversationRegistry();
    focusedTab.register(conversationA, true);

    expect(shouldSuppressForegroundMessage(message(conversationA), focusedTab, { visibilityState: "visible", hasFocus: true })).toBe(true);
    expect(shouldSuppressForegroundMessage(message(conversationA), otherSession, { visibilityState: "visible", hasFocus: true })).toBe(false);
  });
});
