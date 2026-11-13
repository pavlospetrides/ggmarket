import { notFound } from "next/navigation";
import { ListingGrid } from "@/components/listing-grid";
import { FeaturedListingControl } from "@/components/featured-listing-control";
import { SellerVerificationPanel } from "@/components/seller-verification-panel";
import { ReferralDashboard } from "@/components/referral-dashboard";
import type { Listing } from "@/lib/types";

const sellers = ["Arcade Pilot", "Pixel Foundry", "Cyprus Co-op", "Frame Hunter"];
const listings: Listing[] = sellers.map((displayName, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  slug: `featured-${index}`,
  title: ["OLED handheld console", "Custom mechanical keyboard", "Retro console collection", "High-refresh gaming monitor"][index],
  description: "Detailed test listing for the seller growth responsive harness.",
  price: [420, 165, 290, 310][index], currency: "EUR", location: "Nicosia", condition: "good", status: "active",
  category: { id: "category", name: "Gaming gear", slug: "gaming", icon: "gamepad" },
  images: ["/images/brand/lootriva-hero-desktop.webp"],
  seller: { id: `seller-${index}`, username: `seller${index}`, displayName, rating: 4.8, reviewCount: 12, verified: true, founding: index < 2, memberSince: "2026-01-01T00:00:00Z" },
  createdAt: "2026-11-13T08:00:00Z", views: 24, shipping: true, meetup: true, featured: true, attributes: {},
}));

export default function SellerGrowthHarnessPage() {
  if (process.env.E2E_UI_HARNESS !== "1") notFound();
  return <main className="pb-24">
    <section className="seller-growth-reveal bg-[#211a3d] py-16 md:py-24"><div className="container-page grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-3xl"><h1 className="section-title">Become one of the first 100 Lootriva sellers</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-[#d8ceff]">Complete Lootriva’s free seller review and publish a legitimate active listing. Eligible accounts are allocated by the time they meet both requirements.</p><p className="mt-5 font-bold tabular-nums">73 of 100 slots remaining</p></div><a href="#account" className="btn-primary">View seller program</a></div></section>
    <section className="seller-growth-reveal container-page py-16 md:py-24"><div className="section-heading-row"><div><h2 className="section-title">Featured listings</h2><p className="mt-3 text-[var(--text-secondary)]">Complimentary launch promotions, labelled and rotated fairly.</p></div><span className="badge">Promotional placement</span></div><ListingGrid listings={listings} viewerId="seller-0" navigationContext="harness:featured" /></section>
    <section id="account" className="seller-growth-reveal container-page grid gap-5"><SellerVerificationPanel enabled initialApplication={null} /><FeaturedListingControl enabled listings={listings.map(({ id, title }) => ({ id, title }))} campaigns={[]} entitlements={[{ id: "11111111-1111-4111-8111-111111111111", source: "founder", duration_days: 30, state: "available", starts_at: null, expires_at: null, created_at: "2026-11-13T08:00:00Z" }]} /><ReferralDashboard enabled code="FOUNDERS2026" referrals={[{ id: "referral-1", status: "pending", risk_status: "clear", attributed_at: "2026-11-13T08:00:00Z", qualified_at: null }]} rewards={[]} listings={listings.map(({ id, title }) => ({ id, title }))} /></section>
  </main>;
}
