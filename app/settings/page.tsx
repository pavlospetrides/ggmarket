import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const profile = await getCurrentProfile(user.id);
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <div className="page-header min-w-0"><p className="eyebrow">Account</p><h1 className="page-title">Settings</h1><p className="page-description">Keep your marketplace identity accurate and trustworthy.</p></div>
    <SettingsForm email={user.email ?? ""} username={profile.username} displayName={profile.display_name} location={profile.location ?? ""} bio={profile.bio ?? ""} />
  </div>;
}
