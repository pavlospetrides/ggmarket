const STORAGE_KEY = "ggmarket:listing-navigation:v1";
const STORAGE_VERSION = 1;
const ENTRY_TTL_MS = 30 * 60 * 1_000;
const MAX_HISTORY_ENTRIES = 32;

export type ListingNavigationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ListingNavigationContext = {
  sourceEntryId: string;
  sourceUrl: string;
  destinationUrl: string;
  listingId: string;
  createdAt: number;
};

export type ListingBrowsingSnapshot = {
  sourceEntryId: string;
  sourceUrl: string;
  listingId: string;
  anchorKey: string;
  scrollX: number;
  scrollY: number;
  anchorTop: number;
  anchorLeft: number;
  railKey: string | null;
  railScrollLeft: number | null;
  createdAt: number;
};

type StoredState = {
  version: 1;
  pending: ListingNavigationContext | null;
  entries: Record<string, ListingNavigationContext>;
  snapshots: Record<string, ListingBrowsingSnapshot>;
};

type RecordDepartureInput = Omit<ListingBrowsingSnapshot, "createdAt"> & {
  storage: ListingNavigationStorage;
  destinationUrl: string;
  now?: number;
};

const emptyState = (): StoredState => ({
  version: STORAGE_VERSION,
  pending: null,
  entries: {},
  snapshots: {},
});

function internalUrl(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const parsed = new URL(value, "https://ggmarket.local");
    if (parsed.origin !== "https://ggmarket.local") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

const validText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 2_048;

const validNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function isContext(value: unknown): value is ListingNavigationContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ListingNavigationContext>;
  return validText(candidate.sourceEntryId)
    && validText(candidate.sourceUrl)
    && internalUrl(candidate.sourceUrl) === candidate.sourceUrl
    && validText(candidate.destinationUrl)
    && internalUrl(candidate.destinationUrl) === candidate.destinationUrl
    && validText(candidate.listingId)
    && validNumber(candidate.createdAt);
}

function isSnapshot(value: unknown): value is ListingBrowsingSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ListingBrowsingSnapshot>;
  return validText(candidate.sourceEntryId)
    && validText(candidate.sourceUrl)
    && internalUrl(candidate.sourceUrl) === candidate.sourceUrl
    && validText(candidate.listingId)
    && validText(candidate.anchorKey)
    && validNumber(candidate.scrollX)
    && validNumber(candidate.scrollY)
    && validNumber(candidate.anchorTop)
    && validNumber(candidate.anchorLeft)
    && (candidate.railKey === null || validText(candidate.railKey))
    && (candidate.railScrollLeft === null || validNumber(candidate.railScrollLeft))
    && validNumber(candidate.createdAt);
}

function readState(storage: ListingNavigationStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (parsed.version !== STORAGE_VERSION || !parsed.entries || !parsed.snapshots) return emptyState();
    const entries = Object.fromEntries(Object.entries(parsed.entries).filter(([, value]) => isContext(value)));
    const snapshots = Object.fromEntries(Object.entries(parsed.snapshots).filter(([, value]) => isSnapshot(value)));
    return {
      version: STORAGE_VERSION,
      pending: isContext(parsed.pending) ? parsed.pending : null,
      entries,
      snapshots,
    } satisfies StoredState;
  } catch {
    return null;
  }
}

function writeState(storage: ListingNavigationStorage, state: StoredState) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function trimRecord<T extends { createdAt: number }>(record: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([, left], [, right]) => right.createdAt - left.createdAt)
      .slice(0, MAX_HISTORY_ENTRIES),
  );
}

function removeExpired(state: StoredState, now: number) {
  const fresh = (createdAt: number) => now - createdAt <= ENTRY_TTL_MS && createdAt <= now + 60_000;
  state.entries = trimRecord(Object.fromEntries(Object.entries(state.entries).filter(([, value]) => fresh(value.createdAt))));
  state.snapshots = trimRecord(Object.fromEntries(Object.entries(state.snapshots).filter(([, value]) => fresh(value.createdAt))));
  if (state.pending && !fresh(state.pending.createdAt)) state.pending = null;
  return state;
}

const snapshotKey = (entryId: string, url: string) => `${entryId}\n${url}`;

export function recordListingDeparture(input: RecordDepartureInput) {
  const sourceUrl = internalUrl(input.sourceUrl);
  const destinationUrl = internalUrl(input.destinationUrl);
  if (!validText(input.sourceEntryId)
    || !sourceUrl
    || !destinationUrl
    || !validText(input.listingId)
    || !validText(input.anchorKey)
    || !validNumber(input.scrollX)
    || !validNumber(input.scrollY)
    || !validNumber(input.anchorTop)
    || !validNumber(input.anchorLeft)
    || (input.railKey !== null && !validText(input.railKey))
    || (input.railScrollLeft !== null && !validNumber(input.railScrollLeft))) return false;

  const now = input.now ?? Date.now();
  const state = readState(input.storage);
  if (!state) return false;
  removeExpired(state, now);
  state.pending = {
    sourceEntryId: input.sourceEntryId,
    sourceUrl,
    destinationUrl,
    listingId: input.listingId,
    createdAt: now,
  };
  state.snapshots[snapshotKey(input.sourceEntryId, sourceUrl)] = {
    sourceEntryId: input.sourceEntryId,
    sourceUrl,
    listingId: input.listingId,
    anchorKey: input.anchorKey,
    scrollX: input.scrollX,
    scrollY: input.scrollY,
    anchorTop: input.anchorTop,
    anchorLeft: input.anchorLeft,
    railKey: input.railKey,
    railScrollLeft: input.railScrollLeft,
    createdAt: now,
  };
  state.snapshots = trimRecord(state.snapshots);
  return writeState(input.storage, state);
}

export function activateListingEntry({
  storage,
  destinationEntryId,
  destinationUrl,
  now = Date.now(),
}: {
  storage: ListingNavigationStorage;
  destinationEntryId: string;
  destinationUrl: string;
  now?: number;
}) {
  const normalizedDestination = internalUrl(destinationUrl);
  if (!validText(destinationEntryId) || !normalizedDestination) return null;
  const state = readState(storage);
  if (!state) return null;
  removeExpired(state, now);
  const pending = state.pending;
  state.pending = null;
  if (!pending || pending.destinationUrl !== normalizedDestination) {
    writeState(storage, state);
    return null;
  }
  state.entries[destinationEntryId] = pending;
  state.entries = trimRecord(state.entries);
  writeState(storage, state);
  return pending;
}

export function readListingEntry({
  storage,
  destinationEntryId,
  destinationUrl,
  now = Date.now(),
}: {
  storage: ListingNavigationStorage;
  destinationEntryId: string;
  destinationUrl: string;
  now?: number;
}) {
  const normalizedDestination = internalUrl(destinationUrl);
  if (!validText(destinationEntryId) || !normalizedDestination) return null;
  const state = readState(storage);
  if (!state) return null;
  removeExpired(state, now);
  const entry = state.entries[destinationEntryId];
  writeState(storage, state);
  return entry?.destinationUrl === normalizedDestination ? entry : null;
}

export function readBrowsingSnapshot({
  storage,
  entryId,
  currentUrl,
  now = Date.now(),
}: {
  storage: ListingNavigationStorage;
  entryId: string;
  currentUrl: string;
  now?: number;
}) {
  const normalizedCurrentUrl = internalUrl(currentUrl);
  if (!validText(entryId) || !normalizedCurrentUrl) return null;
  const state = readState(storage);
  if (!state) return null;
  removeExpired(state, now);
  const snapshot = state.snapshots[snapshotKey(entryId, normalizedCurrentUrl)];
  writeState(storage, state);
  return snapshot?.sourceUrl === normalizedCurrentUrl ? snapshot : null;
}

export function calculateAnchorScrollDelta({ currentTop, savedTop }: { currentTop: number; savedTop: number }) {
  return currentTop - savedTop;
}
