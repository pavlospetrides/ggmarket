import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { getProfileByUsername } from "@/lib/data";

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ listingsPage?: string; reviewsPage?: string }>;
}) {
  const { username } = await params;
  const query = await searchParams;
  const profile = await getProfileByUsername(username, query.listingsPage, query.reviewsPage);

  if (!profile) notFound();

  return (
    <ProfileView
      seller={profile.seller}
      items={profile.listings}
      reviews={profile.reviews}
      stats={profile.stats}
      pagination={profile.pagination}
    />
  );
}
