import type { NotificationItem } from "./notification-state";

export type ActiveConversationView = {
  conversationId: string;
  live: boolean;
};

export type ActiveConversationRegistry = {
  register: (conversationId: string, live: boolean) => () => void;
  current: () => ActiveConversationView | null;
};

export function createActiveConversationRegistry(): ActiveConversationRegistry {
  let view: (ActiveConversationView & { token: symbol }) | null = null;

  return {
    register(conversationId, live) {
      const token = Symbol(conversationId);
      view = { conversationId, live, token };
      return () => {
        if (view?.token === token) view = null;
      };
    },
    current() {
      return view ? { conversationId: view.conversationId, live: view.live } : null;
    },
  };
}

function notificationConversationId(item: NotificationItem) {
  if (item.type !== "message" || !item.href) return null;
  const match = /^\/messages\/([^/?#]+)$/.exec(item.href);
  return match?.[1] ?? null;
}

export function shouldSuppressForegroundMessage(
  item: NotificationItem,
  registry: ActiveConversationRegistry,
  environment: { visibilityState: string; hasFocus: boolean },
) {
  const view = registry.current();
  return Boolean(
    view?.live
    && environment.visibilityState === "visible"
    && environment.hasFocus
    && notificationConversationId(item) === view.conversationId,
  );
}
