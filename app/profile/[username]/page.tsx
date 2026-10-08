import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { getProfileByUsername } from "@/lib/data";
export default async function SellerPage({ params }: { params: Promise<{ username: string }> }) { const { username } = await params; const profile = await getProfileByUsername(username); if (!profile) notFound(); return <ProfileView seller={profile.seller} items={profile.listings} reviews={profile.reviews} stats={profile.stats} />; }
