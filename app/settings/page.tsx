import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";
import { PageMasthead } from "@/components/page-masthead";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/data";
import { signAuthorizedProfileMedia } from "@/lib/profile-media-delivery";
import { profileMediaBucket } from "@/lib/profile-media-storage";
import Link from "next/link";
import { SellerVerificationEntry } from "@/components/seller-verification-entry";
import { getLatestSellerVerification } from "@/lib/seller-growth";
import { sellerGrowthFlags } from "@/lib/feature-flags";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("/settings");
  const [profile, verificationApplication] = await Promise.all([getCurrentProfile(user.id), getLatestSellerVerification(user.id)]);
  const [avatarUrl, coverUrl] = profile.avatar_path || profile.cover_path
    ? await signAuthorizedProfileMedia([
      { ownerId: user.id, kind: "avatar", path: profile.avatar_path },
      { ownerId: user.id, kind: "cover", path: profile.cover_path },
    ], profileMediaBucket()) : [undefined, undefined];
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Account control" title="Settings" description="Keep your marketplace identity accurate and trustworthy." variant="identity" meta={<span>@{profile.username}</span>} />
    <div className="mb-6"><SellerVerificationEntry application={verificationApplication} enabled={sellerGrowthFlags().sellerVerification} /></div>
    <Link href="/settings/seller-growth" className="btn-ghost mb-6">Explore the seller growth program</Link>
    <SettingsForm email={user.email ?? ""} username={profile.username} displayName={profile.display_name} location={profile.location ?? ""} bio={profile.bio ?? ""} avatarUrl={avatarUrl} coverUrl={coverUrl} logoutError={params.error === "logout_failed"} />
  </div>;
}
