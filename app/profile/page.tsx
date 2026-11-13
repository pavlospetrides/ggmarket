import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile, getFavoriteIds, getOwnGGCard, getProfileByUsername } from "@/lib/data";
import { getLatestSellerVerification } from "@/lib/seller-growth";
import { sellerGrowthFlags } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false },
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ listingsPage?: string; reviewsPage?: string }> }) {
  const user = await requireUser();
  const current = await getCurrentProfile(user.id);
  const query = await searchParams;
  const [profile, favoriteIds, ggCard, verificationApplication] = await Promise.all([
    getProfileByUsername(current.username, query.listingsPage, query.reviewsPage),
    getFavoriteIds(user.id),
    getOwnGGCard(user.id),
    getLatestSellerVerification(user.id),
  ]);

  if (!profile) throw new Error("Profile could not be loaded");

  return (
    <ProfileView
      key={`${profile.seller.id}:${profile.pagination.reviews.page}`}
      seller={profile.seller}
      items={profile.listings}
      reviews={profile.reviews}
      stats={profile.stats}
      pagination={profile.pagination}
      viewerId={user.id}
      favoriteIds={favoriteIds}
      own
      ggCard={ggCard}
      verificationApplication={verificationApplication}
      sellerVerificationEnabled={sellerGrowthFlags().sellerVerification}
    />
  );
}
