import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";
import { PageMasthead } from "@/components/page-masthead";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("/settings");
  const profile = await getCurrentProfile(user.id);
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Account control" title="Settings" description="Keep your marketplace identity accurate and trustworthy." variant="identity" meta={<span>@{profile.username}</span>} />
    <SettingsForm email={user.email ?? ""} username={profile.username} displayName={profile.display_name} location={profile.location ?? ""} bio={profile.bio ?? ""} logoutError={params.error === "logout_failed"} />
  </div>;
}
