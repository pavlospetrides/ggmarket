import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getConversation, getConversations } from "@/lib/phase2-data";
import { ChatInterface } from "@/components/chat-interface";
import { TradeProposalForm } from "@/components/trade-proposal-form";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/messages"); const { id } = await params; const [conversation, conversations] = await Promise.all([getConversation(user.id, id), getConversations(user.id)]); if (!conversation) notFound();
  return <><TradeProposalForm conversationId={conversation.id} listings={conversation.ownListings} /><ChatInterface currentUserId={user.id} conversation={conversation} conversations={conversations} /></>;
}
