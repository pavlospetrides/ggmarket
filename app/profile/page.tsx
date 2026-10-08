import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile, getProfileByUsername } from "@/lib/data";
export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false },
};
export default async function ProfilePage() {
  const user = await requireUser();
  const current = await getCurrentProfile(user.id);
  const profile = await getProfileByUsername(current.username);
  if (!profile) throw new Error("Profile could not be loaded");
  return (
    <>
      <div className="container-page flex justify-end gap-2 pt-6">
        <Link href="/notifications" className="btn-secondary md:hidden">
          <Bell className="size-4" /> Notifications
        </Link>
        <Link href="/profile/listings" className="btn-secondary">
          Manage listings
        </Link>
      </div>
      <ProfileView
        seller={profile.seller}
        items={profile.listings}
        reviews={profile.reviews}
        stats={profile.stats}
        own
      />
    </>
  );
}
