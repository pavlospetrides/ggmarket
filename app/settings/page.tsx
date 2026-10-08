import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/data";
export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export default async function SettingsPage() { const user = await requireUser("/settings"); const profile = await getCurrentProfile(user.id); return <div className="container-page py-10"><p className="eyebrow">Account</p><h1 className="mt-2 text-3xl font-black">Settings</h1><div className="mt-8"><SettingsForm email={user.email ?? ""} username={profile.username} displayName={profile.display_name} location={profile.location ?? ""} bio={profile.bio ?? ""} /></div></div>; }
