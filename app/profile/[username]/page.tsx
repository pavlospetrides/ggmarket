import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { getUser } from "@/lib/auth";
import { getFavoriteIds, getProfileByUsername } from "@/lib/data";

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
