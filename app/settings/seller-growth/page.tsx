import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Medal } from "lucide-react";
import { SellerVerificationPanel } from "@/components/seller-verification-panel";
import { FeaturedListingControl } from "@/components/featured-listing-control";
import { ReferralDashboard } from "@/components/referral-dashboard";
import { requireUser } from "@/lib/auth";
import { sellerGrowthFlags } from "@/lib/feature-flags";
import { getLatestSellerVerification, getReferralDashboard, getSellerPromotionState } from "@/lib/seller-growth";
import { getOwnListings } from "@/lib/data";

export const metadata: Metadata = { title: "Seller growth", robots: { index: false } };

export default async function SellerGrowthSettingsPage() {
  const user = await requireUser("/settings/seller-growth");
  const flags = sellerGrowthFlags();
  const [application, promotion, listings, referral] = await Promise.all([getLatestSellerVerification(user.id), getSellerPromotionState(user.id), getOwnListings(user.id), flags.referralRewards ? getReferralDashboard(user.id) : Promise.resolve({ code: null, referrals: [], rewards: [] })]);
  return <main className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <Link href="/settings" className="btn-ghost mb-6"><ArrowLeft className="size-4" /> Settings</Link>
    <div className="max-w-3xl"><h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">Build trust. Earn reach.</h1><p className="mt-4 text-lg leading-8 text-[var(--text-secondary)]">Manage seller review, founding benefits, and referral boosts without mixing them with ratings or identity claims.</p></div>
    <div className="mt-8 grid gap-5">
      <SellerVerificationPanel initialApplication={application} enabled={flags.sellerVerification} />
      <section className="card p-5 sm:p-7"><div className="flex items-center gap-3"><Medal className="text-[#cbbcff]" /><h2 className="text-xl font-bold">Founding seller</h2></div><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">The first 100 seller-reviewed accounts that publish an eligible active listing are allocated automatically and fairly. Founder status cannot be bought or self-assigned.</p>{promotion.founder ? <p className="mt-4 font-bold">Your founder slot: #{promotion.founder.slot_number}</p> : <p className="mt-4 text-sm text-[var(--muted)]">No founder slot has been allocated to this account.</p>}</section>
      <FeaturedListingControl entitlements={promotion.entitlements} campaigns={promotion.campaigns} listings={listings.filter((listing) => listing.status === "active").map(({ id, title }) => ({ id, title }))} enabled={flags.featuredListings} />
      <ReferralDashboard code={referral.code} referrals={referral.referrals} rewards={referral.rewards} listings={listings.filter((listing) => listing.status === "active").map(({ id, title }) => ({ id, title }))} enabled={flags.referralRewards} />
    </div>
  </main>;
}

