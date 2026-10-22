export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationState = {
  userId: string | null;
  items: NotificationItem[];
};

export function mergeNotificationItems(
  current: NotificationItem[],
  incoming: NotificationItem[],
) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()]
    .toSorted((left, right) => +new Date(right.created_at) - +new Date(left.created_at))
    .slice(0, 80);
}

export function createNotificationState(
  userId: string | null,
  items: NotificationItem[],
): NotificationState {
  return { userId, items: mergeNotificationItems([], items) };
}

export function switchNotificationAccount(
  state: NotificationState,
  userId: string | null,
): NotificationState {
  return state.userId === userId ? state : createNotificationState(userId, []);
}

export function reconcileNotificationState(
  state: NotificationState,
  requestUserId: string,
  items: NotificationItem[],
): NotificationState {
  if (state.userId !== requestUserId) return state;
  return { ...state, items: mergeNotificationItems(state.items, items) };
}

export function applyRealtimeNotification(
  state: NotificationState,
  eventUserId: string,
  item: NotificationItem,
): { state: NotificationState; isNew: boolean } {
  if (state.userId !== eventUserId) return { state, isNew: false };
  const isNew = !state.items.some((current) => current.id === item.id);
  return {
    state: { ...state, items: mergeNotificationItems(state.items, [item]) },
    isNew,
  };
}

export function countUnreadMessages(items: NotificationItem[]) {
  return items.filter((item) => item.type === "message" && !item.read_at).length;
}

export function formatUnreadBadge(count: number) {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

export function markNotificationItemsRead(
  items: NotificationItem[],
  ids: string[],
  readAt: string,
) {
  const viewed = new Set(ids);
  return items.map((item) => viewed.has(item.id) && !item.read_at ? { ...item, read_at: readAt } : item);
}
