export type OfferStatus = "pending" | "accepted" | "declined" | "countered" | "withdrawn" | "expired";
export type TradeStatus = OfferStatus;
export type ListingIntent = "sale" | "wanted" | "trade" | "sale_or_trade";

export type SearchCandidate = {
  title: string;
  price: number;
  categoryId: string;
  condition: string;
  intent: ListingIntent;
  location: string;
};

export type SavedSearchRule = {
  searchTerm?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  categoryId?: string | null;
  condition?: string | null;
  intent?: ListingIntent | null;
  location?: string | null;
};

export function savedSearchMatches(rule: SavedSearchRule, item: SearchCandidate) {
  const term = rule.searchTerm?.trim().toLocaleLowerCase();
  return (!term || item.title.toLocaleLowerCase().includes(term))
    && (!rule.categoryId || rule.categoryId === item.categoryId)
    && (!rule.condition || rule.condition === item.condition)
    && (!rule.intent || rule.intent === item.intent)
    && (rule.minPrice == null || item.price >= rule.minPrice)
    && (rule.maxPrice == null || item.price <= rule.maxPrice)
    && (!rule.location || item.location.toLocaleLowerCase().includes(rule.location.toLocaleLowerCase()));
}

export function canRespondToOffer(input: { actorId: string; createdBy: string; buyerId: string; sellerId: string; status: OfferStatus }, action: OfferStatus) {
  if (input.status !== "pending" || ![input.buyerId, input.sellerId].includes(input.actorId)) return false;
  if (action === "withdrawn") return input.actorId === input.createdBy;
  if (action === "accepted" || action === "declined") return input.actorId !== input.createdBy;
  return false;
}

export function validTradeProposal(input: { proposerId: string; recipientId: string; ownsOfferedListing: boolean; cashAdjustment: number }) {
  return input.proposerId !== input.recipientId && input.ownsOfferedListing && Number.isFinite(input.cashAdjustment) && input.cashAdjustment >= 0 && input.cashAdjustment <= 1_000_000;
}
