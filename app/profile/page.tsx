import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile, getProfileByUsername } from "@/lib/data";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false },
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ listingsPage?: string; reviewsPage?: string }> }) {
  const user = await requireUser();
  const current = await getCurrentProfile(user.id);
  const query = await searchParams;
  const profile = await getProfileByUsername(current.username, query.listingsPage, query.reviewsPage);

  if (!profile) throw new Error("Profile could not be loaded");

  return (
    <ProfileView
      seller={profile.seller}
      items={profile.listings}
      reviews={profile.reviews}
      stats={profile.stats}
      pagination={profile.pagination}
      own
    />
  );
}
