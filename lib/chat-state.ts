export type MessageStatus = "pending" | "sent" | "failed";

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  clientId?: string;
  status: MessageStatus;
};

export type PersistedMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  client_id: string | null;
  created_at: string;
};

export type ChatState = {
  scope: string;
  messages: ChatMessage[];
};

export function createChatScope(viewerId: string, conversationId: string) {
  return `${viewerId}:${conversationId}`;
}

export function createPendingMessage({
  clientId,
  senderId,
  body,
  createdAt,
}: {
  clientId: string;
  senderId: string;
  body: string;
  createdAt: string;
}): ChatMessage {
  return {
    id: clientId,
    clientId,
    senderId,
    body,
    createdAt,
    status: "pending",
  };
}

export function messageFromRow(row: PersistedMessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    ...(row.client_id ? { clientId: row.client_id } : {}),
    createdAt: row.created_at,
    status: "sent",
  };
}

function sameMessage(message: ChatMessage, row: PersistedMessageRow) {
  return message.id === row.id || Boolean(
    row.client_id &&
    message.clientId === row.client_id &&
    message.senderId === row.sender_id,
  );
}

export function mergeChatMessages(
  current: ChatMessage[],
  rows: PersistedMessageRow[],
) {
  const merged = [...current];
  for (const row of rows) {
    const canonical = messageFromRow(row);
    const match = merged.findIndex((message) => sameMessage(message, row));
    if (match === -1) merged.push(canonical);
    else merged[match] = canonical;
  }
  return merged.toSorted((a, b) => {
    const byTime = +new Date(a.createdAt) - +new Date(b.createdAt);
    return byTime || a.id.localeCompare(b.id);
  });
}

export function failPendingMessage(messages: ChatMessage[], clientId: string) {
  return messages.map((message) =>
    message.clientId === clientId && message.status === "pending"
      ? { ...message, status: "failed" as const }
      : message,
  );
}

export function retryFailedMessage(messages: ChatMessage[], clientId: string) {
  return messages.map((message) =>
    message.clientId === clientId && message.status === "failed"
      ? { ...message, status: "pending" as const }
      : message,
  );
}

export function reconcileChatState(
  state: ChatState,
  responseScope: string,
  rows: PersistedMessageRow[],
): ChatState {
  if (state.scope !== responseScope) return state;
  return { ...state, messages: mergeChatMessages(state.messages, rows) };
}

