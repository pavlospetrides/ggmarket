import { notFound } from "next/navigation";
import { MarketplaceBrowser } from "@/components/marketplace-browser";
import type { Category, Listing, PaginatedListings } from "@/lib/types";

export const dynamic = "force-dynamic";

const categories: Category[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Games", slug: "games", icon: "gamepad" },
];

const listing: Listing = {
  id: "77777777-7777-4777-8777-777777777777",
  slug: "test-marketplace-listing",
  title: "Test marketplace listing",
  description: "A safe browser-only listing used to verify marketplace controls.",
  price: 100,
  currency: "EUR",
  location: "Test City",
  condition: "good",
  status: "active",
  category: categories[0],
  images: ["/icon.svg"],
  seller: { id: "66666666-6666-4666-8666-666666666666", username: "test", displayName: "Test Seller", rating: 0, reviewCount: 0, verified: false, memberSince: "2026-01-01T00:00:00.000Z" },
  createdAt: "2026-01-01T00:00:00.000Z",
  views: 0,
  shipping: true,
  meetup: false,
  attributes: {},
};

const result: PaginatedListings = { items: [listing], total: 1, page: 1, pageSize: 24 };

export default function MarketplaceInteractionHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return <MarketplaceBrowser result={result} params={{}} categories={categories} favoriteIds={[]} viewerId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" actionPath="/marketplace" />;
}
