import { notFound } from "next/navigation";
import { ChatInterface } from "@/components/chat-interface";

const conversationId = "11111111-1111-4111-8111-111111111111";

export default async function ChatHarnessPage({
  searchParams,
}: {
  searchParams: Promise<{ viewer?: string; actions?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();

  const { viewer = "account-a", actions } = await searchParams;
  const other = viewer === "account-a" ? "account-b" : "account-a";
  const initialClientId = viewer === "account-a"
    ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    : "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const conversation = {
    id: conversationId,
    listingId: "22222222-2222-4222-8222-222222222222",
    listingTitle: "Test graphics card",
    listingPrice: 500,
    currency: "EUR",
    other: { id: other, username: other, display_name: other === "account-a" ? "Buyer A" : "Seller B", verified: false, founding: false },
    messages: [],
    offers: actions === "1" ? [{
      id: "offer-1",
      createdBy: other,
      buyerId: "account-a",
      sellerId: "account-b",
      amount: 450,
      currency: "EUR",
      status: "pending",
      createdAt: "2026-10-20T08:01:00.000Z",
    }] : [],
    trades: [],
    ownListings: [],
  };
  const conversations = [{
    id: conversationId,
    listingId: conversation.listingId,
    listingTitle: conversation.listingTitle,
    listingPrice: conversation.listingPrice,
    otherUserId: other,
    otherName: conversation.other.display_name,
    otherUsername: conversation.other.username,
    lastMessageAt: "2026-10-20T08:00:00.000Z",
    unread: 0,
  }];

  return (
    <ChatInterface
      key={`${viewer}:${conversationId}`}
      currentUserId={viewer}
      conversation={conversation}
      conversations={conversations}
      initialClientId={initialClientId}
    />
  );
}

