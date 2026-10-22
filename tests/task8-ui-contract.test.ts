import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("account activity UI contracts", () => {
  it("bounds the conversation timeline and keeps its composer reachable", () => {
    const chat = read("components/chat-interface.tsx");

    expect(chat).toContain('role="log"');
    expect(chat).toContain('aria-live="polite"');
    expect(chat).toContain("min-h-0");
    expect(chat).toContain("overflow-y-auto");
    expect(chat).toContain("env(safe-area-inset-bottom)");
    expect(chat).toContain('htmlFor="offer-amount"');
    expect(chat).toContain('id="offer-amount"');
    expect(chat).toContain("[overflow-wrap:anywhere]");
  });

  it("labels trade fields and announces transaction outcomes", () => {
    const trade = read("components/trade-proposal-form.tsx");

    expect(trade).toContain('htmlFor="trade-listing"');
    expect(trade).toContain('htmlFor="trade-cash"');
    expect(trade).toContain('htmlFor="trade-note"');
    expect(trade).toContain('aria-live="polite"');
    expect(trade).toContain("disabled={busy}");
  });

  it("requires explicit confirmation for destructive account and admin actions", () => {
    const saved = read("components/saved-searches-manager.tsx");
    const admin = read("components/admin-report-actions.tsx");

    expect(saved).toContain("pendingDeleteId");
    expect(saved).toContain("Cancel delete");
    expect(saved).toContain("Confirm delete");
    expect(admin).toContain("confirming");
    expect(admin).toContain("Cancel removal");
    expect(admin).toContain("Confirm removal");
  });

  it("contains live notification content and avoids invented moderation metrics", () => {
    const bell = read("components/notification-bell.tsx");
    const list = read("components/notifications-list.tsx");
    const adminPage = read("app/admin/page.tsx");

    expect(bell).toContain("aria-expanded={open}");
    expect(bell).toContain('aria-live="polite"');
    expect(bell).toContain('event.key === "Escape"');
    expect(bell).toContain("containerRef.current?.contains");
    expect(bell).toContain("triggerRef.current?.focus()");
    expect(list).toContain("[overflow-wrap:anywhere]");
    expect(list).toContain('aria-live="polite"');
    expect(adminPage).not.toContain("Removed today");
    expect(adminPage).not.toContain("Average review time");
    expect(adminPage).toContain('{ count: "exact" }');
    expect(adminPage).toContain("const openCount = count ?? reports.length");
  });

  it("recovers account activity controls when network requests reject", () => {
    const saved = read("components/saved-searches-manager.tsx");
    const chat = read("components/chat-interface.tsx");
    const list = read("components/notifications-list.tsx");
    const bell = read("components/notification-bell.tsx");
    const center = read("components/notification-center.tsx");

    expect(saved).toContain("createBusy");
    expect(saved.match(/finally/g)?.length).toBeGreaterThanOrEqual(4);
    expect(saved).toContain("The alert could not be created. Try again.");

    expect(chat).toContain("pendingActionId");
    expect(chat).toContain("failPendingMessage");
    expect(chat).toContain("retryMessage");
    expect(chat).toContain("Message could not be sent. Try again.");
    expect(chat.match(/finally/g)?.length).toBeGreaterThanOrEqual(4);

    expect(list).toContain("busyItemId");
    expect(list.match(/finally/g)?.length).toBeGreaterThanOrEqual(2);
    expect(list).toContain("This notification could not be marked as read.");

    expect(bell).toContain("const viewedIds = unreadItems.map");
    expect(bell).toContain("void markViewed(viewedIds)");
    expect(center.match(/Notifications could not be updated\./g)?.length).toBeGreaterThanOrEqual(2);
    expect(center).toContain("void reconcile(userId, generation)");
    expect(center).toContain("return false");
  });

  it("keeps chat sending safe before hydration and reconciles scoped realtime state", () => {
    const chat = read("components/chat-interface.tsx");

    expect(chat).toContain('method="post"');
    expect(chat).toContain("/messages`}");
    expect(chat).toContain('name="clientId"');
    expect(chat).toContain('type="submit"');
    expect(chat).toContain("useHydrated");
    expect(chat).toContain("data-message-status");
    expect(chat).toContain("scopeRef.current");
    expect(chat).toContain("AbortController");
    expect(chat).toContain('addEventListener("visibilitychange"');
    expect(chat).toContain('addEventListener("online"');
    expect(chat).toContain("setInterval");
    expect(chat).toContain("removeChannel");
  });

  it("keeps task routes contained and clear of mobile navigation", () => {
    for (const path of [
      "app/messages/page.tsx",
      "app/notifications/page.tsx",
      "app/saved-searches/page.tsx",
      "app/admin/page.tsx",
      "app/offline/page.tsx",
    ]) {
      const source = read(path);
      expect(source, path).toContain("min-w-0");
      expect(source, path).toContain("pb-");
    }
  });
});
