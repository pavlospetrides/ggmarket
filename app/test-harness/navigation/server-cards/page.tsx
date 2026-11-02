import { notFound } from "next/navigation";
import { DiscoveryListingCard } from "@/components/discovery-listing-card";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

const listing: Listing = {
  id: "77777777-7777-4777-8777-777777777777",
  slug: "server-rendered-navigation-listing",
  title: "Server-rendered navigation listing",
  description: "Synthetic listing for the React Server Component boundary regression.",
  price: 120,
  currency: "EUR",
  location: "Test City",
  condition: "good",
  status: "active",
  category: { id: "11111111-1111-4111-8111-111111111111", name: "Gaming PCs", slug: "gaming-pcs", icon: "monitor" },
  images: [],
  seller: {
    id: "66666666-6666-4666-8666-666666666666",
    username: "server-fixture",
    displayName: "Server Fixture",
    rating: 0,
    reviewCount: 0,
    verified: false,
    memberSince: "2026-01-01T00:00:00.000Z",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  views: 0,
  shipping: true,
  meetup: false,
  attributes: {},
};

export default function ServerRenderedNavigationCardsPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-bold">Server card boundary harness</h1>
      <section aria-label="Standard listing card" className="mt-8 max-w-sm">
        <ListingCard listing={listing} viewerId={null} navigationContext="server:grid" />
      </section>
      <section aria-label="Discovery listing card" className="mt-8">
        <DiscoveryListingCard listing={listing} navigationContext="server:discovery" />
      </section>
    </main>
  );
}
