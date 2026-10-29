import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { getUser } from "@/lib/auth";
import { getFavoriteIds, getProfileByUsername } from "@/lib/data";
import { buildSocialMetadata } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Seller unavailable", robots: { index: false } };
  const title = `${profile.seller.displayName} (@${profile.seller.username})`;
  const description = profile.seller.bio?.slice(0, 155)
    ?? `View ${profile.seller.displayName}'s listings and seller profile on GGMarket.`;
  return {
    title,
    description,
    ...buildSocialMetadata({
      title,
      description,
      path: `/profile/${username}`,
      type: "profile",
      image: profile.seller.avatarUrl,
      twitterCard: profile.seller.avatarUrl ? "summary_large_image" : "summary",
    }),
  };
}

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ listingsPage?: string; reviewsPage?: string }>;
}) {
  const { username } = await params;
  const query = await searchParams;
  const [profile, user] = await Promise.all([
    getProfileByUsername(username, query.listingsPage, query.reviewsPage),
    getUser(),
  ]);

  if (!profile) notFound();
  const favoriteIds = user ? await getFavoriteIds(user.id) : new Set<string>();

  return (
    <ProfileView
      seller={profile.seller}
      items={profile.listings}
      reviews={profile.reviews}
      stats={profile.stats}
      pagination={profile.pagination}
      viewerId={user?.id ?? null}
      favoriteIds={favoriteIds}
    />
  );
}
