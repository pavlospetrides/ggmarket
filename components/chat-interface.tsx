"use client";
import Link from "next/link";
import { ArrowLeft, Circle, HandCoins, RefreshCw, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/constants";
import { createClientUuid } from "@/lib/client-id";
import {
  createChatScope,
  createPendingMessage,
  failPendingMessage,
  mergeChatMessages,
  retryFailedMessage,
  type ChatMessage,
  type PersistedMessageRow,
} from "@/lib/chat-state";
import type {
  ChatOffer,
  ChatTrade,
  ConversationSummary,
} from "@/lib/phase2-data";
import { useHydrated } from "./use-hydrated";

type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  currency: string;
  other: { id: string; username: string; display_name: string };
  messages: ChatMessage[];
  offers: ChatOffer[];
  trades: ChatTrade[];
  ownListings: { id: string; title: string }[];
};
type TimelineItem =
  | ({ kind: "message" } & ChatMessage)
  | ({ kind: "offer" } & ChatOffer)
  | ({ kind: "trade" } & ChatTrade);

const chatTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function ChatInterface({
  currentUserId,
  conversation,
  conversations,
  initialClientId,
}: {
  currentUserId: string;
  conversation: Conversation;
  conversations: ConversationSummary[];
  initialClientId: string;
}) {
  const hydrated = useHydrated();
  const scope = createChatScope(currentUserId, conversation.id);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [messages, setMessages] = useState(conversation.messages);
  const [conversationList, setConversationList] = useState(conversations);
  const [offers, setOffers] = useState(conversation.offers);
  const [trades, setTrades] = useState(conversation.trades);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [connection, setConnection] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const [busy, setBusy] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState("");
  const [nextClientId, setNextClientId] = useState(initialClientId);
  const sendInFlight = useRef(false);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const timeline = useMemo(
    () =>
      [
        ...messages.map((item) => ({ ...item, kind: "message" as const })),
        ...offers.map((item) => ({ ...item, kind: "offer" as const })),
        ...trades.map((item) => ({ ...item, kind: "trade" as const })),
      ].toSorted(
        (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      ) as TimelineItem[],
    [messages, offers, trades],
  );

  const updateConversationPreview = useCallback((body: string, createdAt: string) => {
    setConversationList((current) => current
      .map((item) => item.id === conversation.id
        ? { ...item, lastMessage: body, lastMessageAt: createdAt, unread: 0 }
        : item)
      .toSorted((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt)));
  }, [conversation.id]);

  useEffect(() => {
    const effectScope = scope;
    const abortController = new AbortController();
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${conversation.id}`, {
      config: { private: true, presence: { key: currentUserId } },
    });
    channelRef.current = channel;
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as PersistedMessageRow;
          if (scopeRef.current !== effectScope || row.conversation_id !== conversation.id) return;
          setMessages((current) => mergeChatMessages(current, [row]));
          updateConversationPreview(row.body, row.created_at);
          if (row.sender_id !== currentUserId) void markRead();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "offers",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            created_by?: string;
            buyer_id?: string;
            seller_id?: string;
            amount?: number | string;
            currency?: string;
            status?: string;
            created_at?: string;
          };
          if (!row.id || !row.created_by || !row.buyer_id || !row.seller_id || row.amount == null || !row.currency || !row.status || !row.created_at) return;
          const currency =
            typeof row.currency === "string" && /^[A-Z]{3}$/.test(row.currency)
              ? row.currency
              : conversation.currency;
          const offer: ChatOffer = {
            id: row.id,
            createdBy: row.created_by,
            buyerId: row.buyer_id,
            sellerId: row.seller_id,
            amount: Number(row.amount),
            currency,
            status: row.status,
            createdAt: row.created_at,
          };
          setOffers((current) =>
            current.some((item) => item.id === offer.id)
              ? current.map((item) => (item.id === offer.id ? offer : item))
              : [...current, offer],
          );
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId === conversation.other.id) {
          setTyping(Boolean(payload.typing));
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setTyping(false), 2500);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(
          Object.values(state)
            .flat()
            .some(
              (entry) =>
                (entry as { userId?: string }).userId === conversation.other.id,
            ),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await reconcileMessages();
          if (scopeRef.current !== effectScope) return;
          setConnection("live");
          await channel.track({
            userId: currentUserId,
            onlineAt: new Date().toISOString(),
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")
          setConnection("error");
      });

    async function reconcileMessages() {
      try {
        const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
          signal: abortController.signal,
          cache: "no-store",
        });
        const result = await response.json() as { messages?: PersistedMessageRow[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Messages could not be synchronized.");
        if (scopeRef.current !== effectScope) return;
        setMessages((current) => mergeChatMessages(current, result.messages ?? []));
        const latest = result.messages?.at(-1);
        if (latest) updateConversationPreview(latest.body, latest.created_at);
      } catch (reason) {
        if (abortController.signal.aborted || scopeRef.current !== effectScope) return;
        setConnection("error");
        if (reason instanceof Error && reason.message) setError(reason.message);
      }
    }

    async function markRead() {
      try {
        const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
          method: "PATCH",
          signal: abortController.signal,
        });
        if (!response.ok) throw new Error("Messages could not be marked as read.");
      } catch {
        if (!abortController.signal.aborted && scopeRef.current === effectScope) {
          setError("Messages could not be marked as read.");
        }
      }
    }

    function recoverWhenVisible() {
      if (document.visibilityState === "visible") void reconcileMessages();
    }

    void markRead();
    const reconciliationTimer = window.setInterval(recoverWhenVisible, 12_000);
    document.addEventListener("visibilitychange", recoverWhenVisible);
    window.addEventListener("online", recoverWhenVisible);
    return () => {
      abortController.abort();
      window.clearInterval(reconciliationTimer);
      document.removeEventListener("visibilitychange", recoverWhenVisible);
      window.removeEventListener("online", recoverWhenVisible);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (channelRef.current === channel) channelRef.current = null;
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [conversation.currency, conversation.id, conversation.other.id, currentUserId, scope, updateConversationPreview]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [timeline.length]);

  function broadcastTyping(typingNow: boolean) {
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, typing: typingNow },
    });
  }
  async function persistMessage(clientId: string, body: string, clearComposer: boolean) {
    if (sendInFlight.current) return;
    const requestScope = scope;
    sendInFlight.current = true;
    broadcastTyping(false);
    setError("");
    setBusy(true);
    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body, clientId }),
        },
      );
      const result = await response.json() as PersistedMessageRow & { error?: string };
      if (!response.ok) throw new Error(result.error || "Request failed");
      if (scopeRef.current !== requestScope) return;
      setMessages((current) => mergeChatMessages(current, [result]));
      updateConversationPreview(result.body, result.created_at);
      if (clearComposer) setComposer((current) => current.trim() === body ? "" : current);
      setNextClientId(createClientUuid());
    } catch (reason) {
      if (scopeRef.current !== requestScope) return;
      setMessages((current) => failPendingMessage(current, clientId));
      const failure = reason instanceof Error ? reason.message : "";
      setError(failure && failure !== "Request failed" && failure !== "Message could not be sent."
        ? failure
        : "Message could not be sent. Try again.");
    } finally {
      if (scopeRef.current === requestScope) setBusy(false);
      sendInFlight.current = false;
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    if (!hydrated) return;
    event.preventDefault();
    if (sendInFlight.current || !composer.trim()) return;
    const body = composer.trim();
    const clientId = nextClientId;
    const optimistic = createPendingMessage({
      clientId,
      senderId: currentUserId,
      body,
      createdAt: new Date().toISOString(),
    });
    setMessages((current) => [...current, optimistic]);
    updateConversationPreview(body, optimistic.createdAt);
    void persistMessage(clientId, body, true);
  }

  function retryMessage(message: ChatMessage) {
    if (!message.clientId || sendInFlight.current) return;
    setMessages((current) => retryFailedMessage(current, message.clientId!));
    setComposer(message.body);
    void persistMessage(message.clientId, message.body, true);
  }
  async function makeOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const amount = Number(fields.get("amount"));
    const parentOfferId = fields.get("parentOfferId") || undefined;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          amount,
          parentOfferId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed");
      setOffers((current) => [
        ...current.map((item) =>
          item.id === parentOfferId ? { ...item, status: "countered" } : item,
        ),
        {
          id: result.id,
          createdBy: result.created_by,
          buyerId: result.buyer_id,
          sellerId: result.seller_id,
          amount: Number(result.amount),
          currency: result.currency,
          status: result.status,
          createdAt: result.created_at,
        },
      ]);
      form.reset();
    } catch {
      setError("The offer could not be sent. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function offerAction(
    id: string,
    action: "accepted" | "declined" | "withdrawn",
  ) {
    if (pendingActionId) return;
    setError("");
    setPendingActionId(`offer-${id}`);
    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Request failed");
      setOffers((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: action } : item,
        ),
      );
    } catch {
      setError("The offer could not be updated. Try again.");
    } finally {
      setPendingActionId(null);
    }
  }
  async function tradeAction(
    id: string,
    action: "accepted" | "declined" | "withdrawn",
  ) {
    if (pendingActionId) return;
    setError("");
    setPendingActionId(`trade-${id}`);
    try {
      const response = await fetch(`/api/trades/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Request failed");
      setTrades((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: action } : item,
        ),
      );
    } catch {
      setError("The trade proposal could not be updated. Try again.");
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div className="container-page min-w-0 py-0 md:py-8">
      <div className="card flex h-[calc(100dvh-138px-env(safe-area-inset-bottom))] min-h-[32rem] min-w-0 overflow-hidden bg-[#0b0f17] md:grid md:h-[min(780px,calc(100dvh-7rem))] md:min-h-[36rem] md:grid-cols-[330px_1fr] md:shadow-[var(--shadow-md)]">
        <aside className="hidden border-r border-[var(--border)] md:block">
          <div className="border-b border-[var(--border)] p-4 text-lg font-bold">
            Messages
          </div>
          {conversationList.map((item) => (
            <Link
              key={item.id}
              href={`/messages/${item.id}`}
              className={`block border-b border-[var(--border)] p-4 transition ${item.id === conversation.id ? "bg-[#1d1930] shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-[var(--surface-alt)]"}`}
            >
              <strong className="block truncate">{item.otherName}</strong>
              <span className="mt-1 block truncate text-xs text-[#b6a8ff]">
                {item.listingTitle}
              </span>
              <span className="mt-1 block truncate text-sm text-[var(--muted)]">
                {item.lastMessage || "Start the conversation"}
              </span>
            </Link>
          ))}
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex min-h-20 items-center gap-3 border-b border-[var(--border)] p-3 sm:p-4">
            <Link
              href="/messages"
              className="grid size-10 place-items-center md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
            <span className="grid size-10 place-items-center rounded-full bg-[#30265b] font-bold">
              {conversation.other.display_name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate">
                {conversation.other.display_name}
              </strong>
              <span
                className={`flex items-center gap-1 text-xs ${online ? "text-[var(--success)]" : "text-[var(--muted)]"}`}
              >
                <Circle className={`size-2 ${online ? "fill-current" : ""}`} aria-hidden="true" />
                {online ? "Online now" : typing ? "Typing…" : "Offline"}
              </span>
            </div>
            <Link
              href={`/listing/${conversation.listingId}`}
              className="max-w-[45%] rounded-xl border border-[var(--border)] p-2 text-right hover:bg-[var(--surface-2)]"
            >
              <strong className="block truncate text-xs">
                {conversation.listingTitle}
              </strong>
              <span className="text-xs text-[#b6a8ff]">
                {formatPrice(conversation.listingPrice, conversation.currency)}{" "}
                · View listing
              </span>
            </Link>
          </header>
          {connection === "error" && (
            <div className="flex items-center justify-center gap-2 bg-[#3a1d22] p-2 text-xs text-[#ffabb4]" role="status" aria-live="polite">
              <RefreshCw className="size-3" aria-hidden="true" /> Realtime connection lost.
              Messages can still be sent.
            </div>
          )}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(132,104,255,.04),transparent_36%)] p-4 sm:p-6" role="log" aria-live="polite" aria-label="Messages">
            {timeline.map((item) =>
              item.kind === "message" ? (
                <div
                  key={`m-${item.id}`}
                  className={`flex ${item.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    data-message-status={item.status}
                    className={`min-w-0 max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${item.senderId === currentUserId ? "rounded-br-md bg-gradient-to-br from-[#8063f8] to-[#6748dc]" : "rounded-bl-md border border-white/[.055] bg-[var(--surface-alt)]"} ${item.status === "failed" ? "ring-1 ring-[var(--danger)]" : ""}`}
                  >
                    <p className="[overflow-wrap:anywhere]">{item.body}</p>
                    <span className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-70">
                      <time>{chatTimeFormatter.format(new Date(item.createdAt))}</time>
                      {item.status === "pending" && <span>Sending…</span>}
                      {item.status === "failed" && (
                        <button type="button" onClick={() => retryMessage(item)} disabled={busy} className="font-bold underline underline-offset-2">
                          Retry
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              ) : item.kind === "offer" ? (
                <article
                  key={`o-${item.id}`}
                  className="mx-auto w-full min-w-0 max-w-md overflow-hidden rounded-2xl border border-[#59459a] bg-[#1b1730] p-4 [overflow-wrap:anywhere]"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-[#b9aaff]">
                    Structured offer
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {item.createdBy === currentUserId
                      ? "You offered"
                      : `${conversation.other.display_name} offered`}{" "}
                    {formatPrice(item.amount, item.currency)}
                  </p>
                  <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                    {item.status}
                  </p>
                  {item.status === "pending" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.createdBy === currentUserId ? (
                        <button
                          type="button"
                          disabled={pendingActionId !== null}
                          onClick={() => void offerAction(item.id, "withdrawn")}
                          className="btn-secondary"
                        >
                          Withdraw
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={pendingActionId !== null}
                            onClick={() => void offerAction(item.id, "declined")}
                            className="btn-secondary"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={pendingActionId !== null}
                            onClick={() => void offerAction(item.id, "accepted")}
                            className="btn-primary"
                          >
                            Accept
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ) : (
                <article
                  key={`t-${item.id}`}
                  className="mx-auto w-full min-w-0 max-w-md overflow-hidden rounded-2xl border border-[#315c68] bg-[#111f27] p-4 [overflow-wrap:anywhere]"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-[#75d7e8]">
                    Trade proposal
                  </p>
                  <p className="mt-2 font-bold">
                    {item.offeredTitle || "Cash-only trade"}
                  </p>
                  {item.cashAdjustment > 0 && (
                    <p className="text-sm">
                      Plus {formatPrice(item.cashAdjustment)}
                    </p>
                  )}
                  {item.note && (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {item.note}
                    </p>
                  )}
                  <p className="mt-2 text-xs capitalize text-[var(--muted)]">
                    {item.status}
                  </p>
                  {item.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      {item.proposerId === currentUserId ? (
                        <button
                          type="button"
                          disabled={pendingActionId !== null}
                          onClick={() => void tradeAction(item.id, "withdrawn")}
                          className="btn-secondary"
                        >
                          Withdraw
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={pendingActionId !== null}
                            onClick={() => void tradeAction(item.id, "declined")}
                            className="btn-secondary"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={pendingActionId !== null}
                            onClick={() => void tradeAction(item.id, "accepted")}
                            className="btn-primary"
                          >
                            Accept
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ),
            )}
            {typing && (
              <p className="text-xs text-[var(--muted)]">
                {conversation.other.display_name} is typing…
              </p>
            )}
            <div ref={endRef} />
          </div>
          <div className="shrink-0 border-t border-[var(--border)] bg-[#0e121af2] px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:p-4 md:pb-4">
            {error && (
              <p role="alert" className="mb-2 text-xs text-[var(--danger)]">
                {error}{" "}
                <button type="button" onClick={() => setError("")} aria-label="Dismiss">
                  <X className="inline size-3" />
                </button>
              </p>
            )}
            <details className="mb-3">
              <summary className="cursor-pointer text-sm font-bold text-[#b9aaff]">
                <HandCoins className="mr-1 inline size-4" aria-hidden="true" /> Make an offer
              </summary>
              <form onSubmit={makeOffer} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select className="input" name="parentOfferId" aria-label="Offer type">
                  <option value="">New offer</option>
                  {offers.filter((item) => item.status === "pending" && item.createdBy !== currentUserId).map((item) => <option key={item.id} value={item.id}>Counter {formatPrice(item.amount, item.currency)}</option>)}
                </select>
                <label className="sr-only" htmlFor="offer-amount">Offer amount</label>
                <input
                  id="offer-amount"
                  className="input"
                  type="number"
                  name="amount"
                  min="1"
                  max="1000000"
                  placeholder="Offer amount (€)"
                  required
                />
                <button type="submit" disabled={busy} className="btn-secondary">
                  Send offer
                </button>
              </form>
            </details>
            <form action={`/api/conversations/${conversation.id}/messages`} method="post" onSubmit={sendMessage} className="flex gap-2" data-hydrated={hydrated}>
              <input type="hidden" name="clientId" value={nextClientId} />
              <label className="sr-only" htmlFor="chat-message">
                Message
              </label>
              <input
                id="chat-message"
                name="message"
                className="input"
                maxLength={2000}
                autoComplete="off"
                placeholder="Type a message…"
                value={composer}
                onChange={(event) => {
                  setComposer(event.target.value);
                  broadcastTyping(Boolean(event.target.value));
                }}
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="btn-primary px-4"
                aria-label="Send message"
              >
                <Send className="size-5" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Send</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
