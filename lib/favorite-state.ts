export type FavoriteSnapshot = {
  active: boolean;
  busy: boolean;
  error: string;
};

type FavoriteOperation = {
  previous: boolean;
  next: boolean;
};

type FavoriteStore = {
  getSnapshot(viewerId: string | null, listingId: string, initialFavorite: boolean): FavoriteSnapshot;
  subscribe(viewerId: string | null, listingId: string, listener: () => void): () => void;
  syncFromServer(viewerId: string | null, listingId: string, active: boolean): void;
  beginToggle(viewerId: string | null, listingId: string, initialFavorite: boolean): FavoriteOperation | null;
  confirm(viewerId: string | null, listingId: string, active: boolean): FavoriteOperation | null;
  rollback(viewerId: string | null, listingId: string, active: boolean, error: string): void;
};

export function createFavoriteStore(): FavoriteStore {
  const snapshots = new Map<string, FavoriteSnapshot>();
  const listeners = new Map<string, Set<() => void>>();

  function key(viewerId: string | null, listingId: string) {
    return `${viewerId ?? "anonymous"}\u0000${listingId}`;
  }

  function ensure(stateKey: string, initialFavorite: boolean) {
    const existing = snapshots.get(stateKey);
    if (existing) return existing;
    const initial = { active: initialFavorite, busy: false, error: "" };
    snapshots.set(stateKey, initial);
    return initial;
  }

  function publish(stateKey: string, snapshot: FavoriteSnapshot) {
    snapshots.set(stateKey, snapshot);
    listeners.get(stateKey)?.forEach((listener) => listener());
  }

  return {
    getSnapshot(viewerId, listingId, initialFavorite) {
      return ensure(key(viewerId, listingId), initialFavorite);
    },
    subscribe(viewerId, listingId, listener) {
      const stateKey = key(viewerId, listingId);
      const listingListeners = listeners.get(stateKey) ?? new Set();
      listingListeners.add(listener);
      listeners.set(stateKey, listingListeners);
      return () => {
        listingListeners.delete(listener);
        if (listingListeners.size === 0) {
          listeners.delete(stateKey);
          snapshots.delete(stateKey);
        }
      };
    },
    syncFromServer(viewerId, listingId, active) {
      const stateKey = key(viewerId, listingId);
      const current = ensure(stateKey, active);
      if (current.busy) return;
      if (current.active === active && current.error === "") return;
      publish(stateKey, { active, busy: false, error: "" });
    },
    beginToggle(viewerId, listingId, initialFavorite) {
      const stateKey = key(viewerId, listingId);
      const current = ensure(stateKey, initialFavorite);
      if (current.busy) {
        publish(stateKey, { ...current, active: !current.active, error: "" });
        return null;
      }
      const operation = { previous: current.active, next: !current.active };
      publish(stateKey, { active: operation.next, busy: true, error: "" });
      return operation;
    },
    confirm(viewerId, listingId, active) {
      const stateKey = key(viewerId, listingId);
      const current = ensure(stateKey, active);
      if (current.active !== active) {
        const operation = { previous: active, next: current.active };
        publish(stateKey, { active: operation.next, busy: true, error: "" });
        return operation;
      }
      publish(stateKey, { active, busy: false, error: "" });
      return null;
    },
    rollback(viewerId, listingId, active, error) {
      publish(key(viewerId, listingId), { active, busy: false, error });
    },
  };
}

export const favoriteStore = createFavoriteStore();
