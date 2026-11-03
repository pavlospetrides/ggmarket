import { formatPrice, labelCondition } from "./constants";
import type { Listing } from "./types";

export const FAVORITE_RAIL_BATCH_SIZE = 8;

export type FavoriteRailItem = {
  id: string;
  href: string;
  title: string;
  description: string;
  priceLabel: string;
  image: string | null;
  category: string;
  condition: string;
  sellerName: string;
  sellerVerified: boolean;
  location: string;
  shipping: boolean;
  meetup: boolean;
  status: Listing["status"];
};

export type FavoriteRailState = {
  batch: number;
  activeId: string | null;
  flippedId: string | null;
};

export type FavoriteRailBatch = {
  items: FavoriteRailItem[];
  batch: number;
  batchCount: number;
  start: number;
  end: number;
  total: number;
};

export function toFavoriteRailItem(listing: Listing): FavoriteRailItem {
  const intent = typeof listing.attributes.intent === "string" ? listing.attributes.intent : "sale";
  const budgetMin = Number(listing.attributes.wanted_budget_min || 0);
  const priceLabel = intent === "wanted" && budgetMin > 0
    ? `${formatPrice(budgetMin, listing.currency)}–${formatPrice(listing.price, listing.currency)}`
    : formatPrice(listing.price, listing.currency);

  return {
    id: listing.id,
    href: `/listing/${listing.id}`,
    title: listing.title,
    description: listing.description,
    priceLabel,
    image: listing.images[0] ?? null,
    category: listing.category.name,
    condition: labelCondition(listing.condition),
    sellerName: listing.seller.displayName,
    sellerVerified: listing.seller.verified,
    location: listing.location,
    shipping: listing.shipping,
    meetup: listing.meetup,
    status: listing.status,
  };
}

export function getFavoriteRailBatch(items: FavoriteRailItem[], requestedBatch: number): FavoriteRailBatch {
  const batchCount = Math.max(1, Math.ceil(items.length / FAVORITE_RAIL_BATCH_SIZE));
  const batch = Math.max(0, Math.min(Math.trunc(requestedBatch), batchCount - 1));
  const offset = batch * FAVORITE_RAIL_BATCH_SIZE;
  const visible = items.slice(offset, offset + FAVORITE_RAIL_BATCH_SIZE);

  return {
    items: visible,
    batch,
    batchCount,
    start: visible.length > 0 ? offset + 1 : 0,
    end: offset + visible.length,
    total: items.length,
  };
}

export function reconcileFavoriteRailState(state: FavoriteRailState, items: FavoriteRailItem[]): FavoriteRailState {
  if (items.length === 0) return { batch: 0, activeId: null, flippedId: null };

  const visible = getFavoriteRailBatch(items, state.batch);
  const visibleIds = new Set(visible.items.map((item) => item.id));
  const activeId = state.activeId && visibleIds.has(state.activeId)
    ? state.activeId
    : visible.items[0]?.id ?? null;
  const flippedId = state.flippedId && state.flippedId === activeId && visibleIds.has(state.flippedId)
    ? state.flippedId
    : null;

  return { batch: visible.batch, activeId, flippedId };
}

export function shouldRunFavoriteRailAnimation({
  busy,
  reduced,
  documentVisible,
  intersecting,
}: {
  busy: boolean;
  reduced: boolean;
  documentVisible: boolean;
  intersecting: boolean;
}) {
  return busy && !reduced && documentVisible && intersecting;
}
