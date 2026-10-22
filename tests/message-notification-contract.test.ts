import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/202610030001_phase2_marketplace.sql", "utf8");
const provider = readFileSync("components/notification-center.tsx", "utf8");
const messagesRoute = readFileSync("app/api/conversations/[id]/messages/route.ts", "utf8");

describe("incoming message notification contract", () => {
  it("creates one recipient-only notification per persisted message", () => {
    expect(migration).toContain("new.sender_id = c.buyer_id then c.seller_id else c.buyer_id");
    expect(migration).toContain("'message:' || new.id");
    expect(migration).toContain("on conflict do nothing");
  });

  it("uses one account-filtered global subscription and reconnect reconciliation", () => {
    expect(provider).toContain("filter: `user_id=eq.${userId}`");
    expect(provider).toContain("user-notifications:${userId}");
    expect(provider).toContain("status === \"SUBSCRIBED\"");
    expect(provider).toContain("visibilitychange");
    expect(provider).toContain("unreadMessages");
  });

  it("derives the global message badge from unread message notification rows", () => {
    const api = readFileSync("app/api/notifications/route.ts", "utf8");
    expect(api).toContain('.eq("type", "message")');
    expect(api).toContain("unreadMessages");
  });

  it("marks only the current user's notifications for the opened conversation", () => {
    expect(messagesRoute).toContain('.eq("user_id", user.id)');
    expect(messagesRoute).toContain('.eq("type", "message")');
    expect(messagesRoute).toContain('.eq("href", `/messages/${id}`)');
  });
});
