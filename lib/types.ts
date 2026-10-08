export type ListingCondition = "new" | "like_new" | "good" | "fair" | "parts";
export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "removed";

export type Category = { id: string; name: string; slug: string; icon: string };
export type Seller = {
  id: string; username: string; displayName: string; avatarUrl?: string;
  rating: number; reviewCount: number; verified: boolean; memberSince: string;
  location?: string; bio?: string;
};
export type Listing = {
  id: string; slug: string; title: string; description: string; price: number;
  currency: string; location: string; condition: ListingCondition; status: ListingStatus;
  category: Category; images: string[]; seller: Seller; createdAt: string;
  views: number; shipping: boolean; meetup: boolean; featured?: boolean;
  belowMarket?: boolean; attributes: Record<string, string | number | boolean>;
  favoriteCount?: number; isFavorite?: boolean;
  imageRecords?: { id: string; path: string; url: string }[];
};

export type Review = { id: string; rating: number; comment?: string; createdAt: string; reviewerName: string };
export type ListingQuery = Record<string, string | string[] | undefined>;
