import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getConversation, getConversations } from "@/lib/phase2-data";
import { ChatInterface } from "@/components/chat-interface";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/messages"); const { id } = await params; const [conversation, conversations] = await Promise.all([getConversation(user.id, id), getConversations(user.id)]); if (!conversation) notFound();
  return <ChatInterface key={`${user.id}:${conversation.id}`} currentUserId={user.id} conversation={conversation} conversations={conversations} initialClientId={randomUUID()} />;
}
