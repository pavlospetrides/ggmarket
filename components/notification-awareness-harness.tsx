"use client";

import { useEffect, useRef, useState } from "react";
import { createActiveConversationRegistry, shouldSuppressForegroundMessage } from "@/lib/active-conversation-notifications";
import { applyNotificationEvent, createNotificationState, type NotificationItem } from "@/lib/notification-state";

const conversationA = "11111111-1111-4111-8111-111111111111";

export function NotificationAwarenessHarness({ initiallyActive }: { initiallyActive: boolean }) {
  const [registry] = useState(createActiveConversationRegistry);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initiallyActive ? conversationA : null);
  const [live, setLive] = useState(true);
  const [state, setState] = useState(() => createNotificationState("account-a", []));
  const stateRef = useRef(state);
  const readyRef = useRef<HTMLParagraphElement>(null);
  const [unread, setUnread] = useState(0);
  const [toastTitle, setToastTitle] = useState("none");
  const [lastEnvironment, setLastEnvironment] = useState("none");

  useEffect(() => {
    if (!activeConversationId) return;
    return registry.register(activeConversationId, live);
  }, [activeConversationId, live, registry]);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; conversationId: string }>).detail;
      const item: NotificationItem = {
        id: detail.id,
        type: "message",
        title: `New message ${detail.id}`,
        body: "Harness message",
        href: `/messages/${detail.conversationId}`,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      const environment = {
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus(),
      };
      setLastEnvironment(`${environment.visibilityState}:${environment.hasFocus ? "focused" : "blurred"}`);
      const result = applyNotificationEvent(stateRef.current, "account-a", item, {
        suppressForegroundMessage: shouldSuppressForegroundMessage(item, registry, environment),
      });
      stateRef.current = result.state;
      setState(result.state);
      if (result.toast) setToastTitle(result.toast.title);
      if (result.unreadDelta) setUnread((count) => Math.max(0, count + result.unreadDelta));
    };
    window.addEventListener("lootriva:test-notification", receive);
    if (readyRef.current) readyRef.current.textContent = "ready";
    return () => window.removeEventListener("lootriva:test-notification", receive);
  }, [registry]);

  return <section className="mx-auto max-w-xl space-y-4 p-6" aria-label="Notification awareness harness">
    <h1 className="text-2xl font-bold">Smart notification awareness</h1>
    <p ref={readyRef} data-testid="harness-ready">starting</p>
    <p data-testid="view-state">{activeConversationId ? `active:${activeConversationId}:${live ? "live" : "disconnected"}` : "inactive"}</p>
    <p>Unread: <strong data-testid="unread-count">{unread}</strong></p>
    <p>Toast: <strong data-testid="toast-title">{toastTitle}</strong></p>
    <p>Last environment: <strong data-testid="last-environment">{lastEnvironment}</strong></p>
    <p>Stored notifications: {state.items.length}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-secondary" onClick={() => setLive((value) => !value)}>
        {live ? "Disconnect chat" : "Reconnect chat"}
      </button>
      <button type="button" className="btn-secondary" onClick={() => setActiveConversationId(null)}>Leave conversation</button>
    </div>
  </section>;
}
