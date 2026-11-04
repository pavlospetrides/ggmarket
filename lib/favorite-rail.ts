import { formatPrice, labelCondition } from "./constants";
import type { Listing } from "./types";

export const FAVORITE_RAIL_BATCH_SIZE = 8;

const RAIL_PITCH_MIN = 1.11;
const RAIL_PITCH_MAX = 1.62;
const CAROUSEL_PITCH = 1.2;
const RAIL_CARD_GAP = 0.07;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundQuarter(value: number) {
  return Math.round(value * 4) / 4;
}

export function favoriteRailResponsiveSize(width: number, count: number) {
  if (width < 640) {
    return {
      cardWidth: roundQuarter(clamp(width * 0.43, 138, 168)),
      carousel: true,
      compact: true,
    };
  }

  const largeDesktop = width >= 1376;
  const desktop = width >= 960;
  const maxCardWidth = largeDesktop
    ? roundQuarter(clamp((width + 32) * 0.16, 230, 260))
    : desktop
      ? roundQuarter(clamp((width + 32) * 0.18, 210, 240))
      : roundQuarter(clamp((width + 48) * 0.2, 176, 204));
  const minCardWidth = largeDesktop ? 230 : desktop ? 210 : 168;
  const safeCount = Math.max(1, count);
  const fitWidth = (width - 40) / (safeCount * RAIL_PITCH_MIN + 0.6);
  const carousel = count > 1 && fitWidth < minCardWidth;

  return {
    cardWidth: carousel ? maxCardWidth : roundQuarter(Math.min(maxCardWidth, fitWidth)),
    carousel,
    compact: false,
  };
}

export type FavoriteRailGestureMode = "pending" | "none" | "pull" | "drag" | "swipe";

export function classifyFavoriteRailGesture({
  deltaX,
  deltaY,
  elapsedMs,
  pointerType,
  index,
  carousel,
  reduced,
}: {
  deltaX: number;
  deltaY: number;
  elapsedMs: number;
  pointerType: string;
  index: number;
  carousel: boolean;
  reduced: boolean;
}): FavoriteRailGestureMode {
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= 8) return "pending";

  const horizontal = Math.abs(deltaX);
  const vertical = Math.abs(deltaY);
  if (vertical >= horizontal * 1.2) {
    if (deltaY <= 0 || index < 0) return "none";
    if (pointerType === "touch" && elapsedMs < 180) return "none";
    return "pull";
  }
  if (horizontal >= vertical * 1.2) {
    if (carousel) return "swipe";
    return index >= 0 && !reduced ? "drag" : "none";
  }
  return distance >= 18 ? "none" : "pending";
}

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

export function favoriteRailLayoutTargets(
  width: number,
  cardWidth: number,
  carousel: boolean,
  center: number | null,
  count: number,
) {
  if (!carousel) {
    const pitch = clamp(
      (width - 40 - cardWidth * 0.6) / Math.max(1, count),
      cardWidth * RAIL_PITCH_MIN,
      cardWidth * RAIL_PITCH_MAX,
    );
    const start = width / 2 - (pitch * (count - 1)) / 2;
    return {
      xs: Array.from({ length: count }, (_, index) => Number((start + index * pitch).toFixed(2))),
      total: 0,
    };
  }

  const pitch = cardWidth * CAROUSEL_PITCH;
  const total = pitch * count;
  const cyclic = count > 2 && total >= width + cardWidth * 2;
  const selected = center ?? 0;
  const xs = Array.from({ length: count }, (_, index) => {
    let offset = index - selected;
    if (cyclic) {
      offset = ((offset % count) + count) % count;
      if (offset >= count / 2) offset -= count;
    }
    return Number((width / 2 + offset * pitch).toFixed(2));
  });
  return { xs, total: cyclic ? total : 0 };
}

export function softenFavoriteRailPull(distance: number, max: number) {
  const knee = max * 0.75;
  if (distance <= knee) return distance;
  return knee + (max - knee) * (1 - Math.exp(-(distance - knee) / (max - knee)));
}

export function favoriteRailMinGap(cardWidth: number, firstPop: number, secondPop: number) {
  const firstWidth = cardWidth * (1 + 0.08 * firstPop);
  const secondWidth = cardWidth * (1 + 0.08 * secondPop);
  return (firstWidth + secondWidth) / 2 + cardWidth * RAIL_CARD_GAP;
}

export function favoriteRailIdentityChanged(previousIds: string[], nextIds: string[]) {
  return previousIds.length !== nextIds.length || previousIds.some((id, index) => id !== nextIds[index]);
}

export function favoriteRailCarouselIndex({
  current,
  deltaX,
  velocity,
  count,
  cyclic,
}: {
  current: number;
  deltaX: number;
  velocity: number;
  count: number;
  cyclic: boolean;
}) {
  if (count <= 0) return 0;
  const movement = Math.abs(deltaX) > 40 || Math.abs(velocity) > 0.45
    ? deltaX < 0 || velocity < -0.45 ? 1 : -1
    : 0;
  if (cyclic) return ((current + movement) % count + count) % count;
  return clamp(current + movement, 0, count - 1);
}
