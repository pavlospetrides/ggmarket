import { notFound } from "next/navigation";
import { FavoriteListings } from "@/components/favorite-listings";
import type { Listing } from "@/lib/types";
import { FavoriteAccountHarness } from "./favorite-account-harness";

export const dynamic = "force-dynamic";

const listing: Listing = {
  id: "77777777-7777-4777-8777-777777777777",
  slug: "test-favorite-listing",
  title: "Test favorite listing",
  description: "A safe browser-only listing used to verify dynamic favorite removal.",
  price: 100,
  currency: "EUR",
  location: "Test City",
  condition: "good",
  status: "active",
  category: { id: "11111111-1111-4111-8111-111111111111", name: "Games", slug: "games", icon: "gamepad" },
  images: ["/icon.svg"],
  seller: { id: "66666666-6666-4666-8666-666666666666", username: "test", displayName: "Test Seller", rating: 0, reviewCount: 0, verified: false, memberSince: "2026-01-01T00:00:00.000Z" },
  createdAt: "2026-01-01T00:00:00.000Z",
  views: 0,
  shipping: true,
  meetup: false,
  attributes: {},
  isFavorite: true,
};

export default async function FavoritesInteractionHarnessPage({ searchParams }: { searchParams: Promise<{ accounts?: string; long?: string; many?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const query = await searchParams;
  if (query.accounts === "1") return <FavoriteAccountHarness />;
  const fixture = query.long === "1" ? {
    ...listing,
    title: "Collector edition console bundle with an exceptionally long unbroken accessory reference ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    description: "A deliberately long synthetic description for responsive verification. It contains enough detail to prove that product copy wraps without forcing the page beyond the viewport.",
    location: "A very long public marketplace location that must wrap safely on narrow phones",
    images: [],
  } : listing;
  const fixtures = query.many === "1"
    ? Array.from({ length: 9 }, (_, index) => ({
      ...listing,
      id: `77777777-7777-4777-8777-${String(index).padStart(12, "0")}`,
      title: ["Test console", "Mechanical keyboard", "Collector game", "Gaming headset", "Graphics card", "Arcade stick", "Handheld console", "Racing wheel", "Retro monitor"][index] ?? `Test listing ${index + 1}`,
      price: 100 + index * 35,
      images: ["/icon.svg"],
    }))
    : [fixture];
  return <main className="container-page py-8"><FavoriteListings listings={fixtures} viewerId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" /></main>;
}
