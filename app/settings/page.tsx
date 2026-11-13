import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";
import { PageMasthead } from "@/components/page-masthead";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/data";
import { signAuthorizedProfileMedia } from "@/lib/profile-media-delivery";
import { profileMediaBucket } from "@/lib/profile-media-storage";
import Link from "next/link";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("/settings");
  const profile = await getCurrentProfile(user.id);
  const [avatarUrl, coverUrl] = profile.avatar_path || profile.cover_path
    ? await signAuthorizedProfileMedia([
      { ownerId: user.id, kind: "avatar", path: profile.avatar_path },
      { ownerId: user.id, kind: "cover", path: profile.cover_path },
    ], profileMediaBucket()) : [undefined, undefined];
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Account control" title="Settings" description="Keep your marketplace identity accurate and trustworthy." variant="identity" meta={<span>@{profile.username}</span>} />
    <Link href="/settings/seller-growth" className="btn-primary mb-6">Seller growth program</Link>
    <SettingsForm email={user.email ?? ""} username={profile.username} displayName={profile.display_name} location={profile.location ?? ""} bio={profile.bio ?? ""} avatarUrl={avatarUrl} coverUrl={coverUrl} logoutError={params.error === "logout_failed"} />
  </div>;
}
