import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import type { Review, Seller } from "@/lib/types";

const seller: Seller = {
  id: "22222222-2222-4222-8222-222222222222",
  username: "sample_seller",
  displayName: "Sample Seller",
  rating: 4.5,
  reviewCount: 2,
  verified: false,
  memberSince: "2025-01-01T00:00:00Z",
  location: "Athens",
};
const reviews: Review[] = [
  { id: "review-1", rating: 5, comment: "Helpful and quick to respond.", createdAt: "2026-10-20T00:00:00Z", reviewerName: "Public Reviewer" },
  { id: "review-2", rating: 4, createdAt: "2026-10-21T00:00:00Z", reviewerName: "Another Reviewer" },
];

export default async function ProfileReviewsHarness({ searchParams }: { searchParams: Promise<{ empty?: string; view?: string; reviewsPage?: string }> }) {
  if (process.env.E2E_UI_HARNESS !== "1") notFound();
  const query = await searchParams;
  const empty = query.empty === "1";
  const own = query.view === "own";
  const page = query.reviewsPage === "2" ? 2 : 1;
  return <ProfileView
    seller={empty ? { ...seller, rating: 0, reviewCount: 0 } : seller}
    items={[]}
    reviews={empty ? [] : [reviews[page - 1]]}
    stats={{ activeListings: 0, soldListings: 0, totalViews: 0 }}
    pagination={{ listings: { page: 1, total: 0, pageSize: 12 }, reviews: { page, total: empty ? 0 : 2, pageSize: 1 } }}
    viewerId={own ? seller.id : null}
    favoriteIds={new Set<string>()}
    own={own}
    ggCard={null}
    sellerVerificationEnabled={own}
  />;
}
