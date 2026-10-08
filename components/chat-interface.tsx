"use client";
import Link from "next/link";
import { ArrowLeft, Circle, HandCoins, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/constants";
import type {
  ChatMessage,
  ChatOffer,
  ChatTrade,
  ConversationSummary,
} from "@/lib/phase2-data";

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

export function ChatInterface({
  currentUserId,
  conversation,
  conversations,
}: {
  currentUserId: string;
  conversation: Conversation;
  conversations: ConversationSummary[];
}) {
  const [messages, setMessages] = useState(conversation.messages);
  const [offers, setOffers] = useState(conversation.offers);
  const [trades, setTrades] = useState(conversation.trades);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [connection, setConnection] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  useEffect(() => {
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
          const row = payload.new as {
            id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          setMessages((current) =>
            current.some((item) => item.id === row.id)
              ? current
              : [
                  ...current,
                  {
                    id: row.id,
                    senderId: row.sender_id,
                    body: row.body,
                    createdAt: row.created_at,
                  },
                ],
          );
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
        () => location.reload(),
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
          setConnection("live");
          await channel.track({
            userId: currentUserId,
            onlineAt: new Date().toISOString(),
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setConnection("error");
      });
    void fetch(`/api/conversations/${conversation.id}/messages`, {
      method: "PATCH",
    });
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [conversation.id, conversation.other.id, currentUserId]);
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
  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const input = new FormData(form).get("message");
    if (typeof input !== "string" || !input.trim()) return;
    const clientId = crypto.randomUUID();
    const optimistic = {
      id: clientId,
      senderId: currentUserId,
      body: input.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    form.reset();
    broadcastTyping(false);
    setBusy(true);
    const response = await fetch(
      `/api/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: input, clientId }),
      },
    );
    const result = await response.json();
    if (response.ok)
      setMessages((current) =>
        current.map((item) =>
          item.id === clientId
            ? {
                id: result.id,
                senderId: result.sender_id,
                body: result.body,
                createdAt: result.created_at,
              }
            : item,
        ),
      );
    else {
      setMessages((current) => current.filter((item) => item.id !== clientId));
      setError(result.error);
    }
    setBusy(false);
  }
  async function makeOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const amount = Number(fields.get("amount"));
    const parentOfferId = fields.get("parentOfferId") || undefined;
    setBusy(true);
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
    if (response.ok) {
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
    } else setError(result.error);
    setBusy(false);
  }
  async function offerAction(
    id: string,
    action: "accepted" | "declined" | "withdrawn",
  ) {
    const response = await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (response.ok)
      setOffers((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: action } : item,
        ),
      );
  }
  async function tradeAction(
    id: string,
    action: "accepted" | "declined" | "withdrawn",
  ) {
    const response = await fetch(`/api/trades/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (response.ok)
      setTrades((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: action } : item,
        ),
      );
  }

  return (
    <div className="container-page py-0 md:py-8">
      <div className="card min-h-[calc(100vh-76px)] overflow-hidden md:grid md:min-h-[720px] md:grid-cols-[330px_1fr]">
        <aside className="hidden border-r border-[var(--border)] md:block">
          <div className="border-b border-[var(--border)] p-4 text-lg font-bold">
            Messages
          </div>
          {conversations.map((item) => (
            <Link
              key={item.id}
              href={`/messages/${item.id}`}
              className={`block border-b border-[var(--border)] p-4 ${item.id === conversation.id ? "bg-[#1d1930]" : "hover:bg-[var(--surface-2)]"}`}
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
        <section className="flex min-w-0 flex-col">
          <header className="flex min-h-20 items-center gap-3 border-b border-[var(--border)] p-3 sm:p-4">
            <Link
              href="/messages"
              className="grid size-10 place-items-center md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft />
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
                <Circle className={`size-2 ${online ? "fill-current" : ""}`} />
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
            <div className="flex items-center justify-center gap-2 bg-[#3a1d22] p-2 text-xs text-[#ffabb4]">
              <RefreshCw className="size-3" /> Realtime connection lost.
              Messages can still be sent.
            </div>
          )}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            {timeline.map((item) =>
              item.kind === "message" ? (
                <div
                  key={`m-${item.id}`}
                  className={`flex ${item.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${item.senderId === currentUserId ? "rounded-br-md bg-[var(--brand)]" : "rounded-bl-md bg-[var(--surface-2)]"}`}
                  >
                    <p>{item.body}</p>
                    <time className="mt-1 block text-right text-[10px] opacity-65">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </div>
              ) : item.kind === "offer" ? (
                <article
                  key={`o-${item.id}`}
                  className="mx-auto max-w-md rounded-2xl border border-[#59459a] bg-[#1b1730] p-4"
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
                          onClick={() => offerAction(item.id, "withdrawn")}
                          className="btn-secondary"
                        >
                          Withdraw
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => offerAction(item.id, "declined")}
                            className="btn-secondary"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => offerAction(item.id, "accepted")}
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
                  className="mx-auto max-w-md rounded-2xl border border-[#315c68] bg-[#111f27] p-4"
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
                          onClick={() => tradeAction(item.id, "withdrawn")}
                          className="btn-secondary"
                        >
                          Withdraw
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => tradeAction(item.id, "declined")}
                            className="btn-secondary"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => tradeAction(item.id, "accepted")}
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
          <div className="border-t border-[var(--border)] p-3 sm:p-4">
            {error && (
              <p role="alert" className="mb-2 text-xs text-[var(--danger)]">
                {error}{" "}
                <button onClick={() => setError("")} aria-label="Dismiss">
                  <X className="inline size-3" />
                </button>
              </p>
            )}
            <details className="mb-3">
              <summary className="cursor-pointer text-sm font-bold text-[#b9aaff]">
                <HandCoins className="mr-1 inline size-4" /> Make an offer
              </summary>
              <form onSubmit={makeOffer} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select className="input" name="parentOfferId" aria-label="Offer type">
                  <option value="">New offer</option>
                  {offers.filter((item) => item.status === "pending" && item.createdBy !== currentUserId).map((item) => <option key={item.id} value={item.id}>Counter {formatPrice(item.amount, item.currency)}</option>)}
                </select>
                <input
                  className="input"
                  type="number"
                  name="amount"
                  min="1"
                  max="1000000"
                  placeholder="Offer amount (€)"
                  required
                />
                <button disabled={busy} className="btn-secondary">
                  Send offer
                </button>
              </form>
            </details>
            <form onSubmit={sendMessage} className="flex gap-2">
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
                onChange={(event) =>
                  broadcastTyping(Boolean(event.target.value))
                }
              />
              <button
                disabled={busy}
                className="btn-primary px-4"
                aria-label="Send message"
              >
                <Send className="size-5" />
                <span className="sr-only sm:not-sr-only">Send</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
