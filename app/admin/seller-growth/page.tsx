import type { Metadata } from "next";
import Link from "next/link";
import { AdminSellerVerifications } from "@/components/admin-seller-verifications";
import { AdminReferralQualification, AdminSellerGrowthActions } from "@/components/admin-seller-growth-actions";
import { PageMasthead } from "@/components/page-masthead";
import { requireAdmin } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getAdminVerificationApplications } from "@/lib/seller-growth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seller verification management", robots: { index: false, follow: false } };

export default async function AdminSellerGrowthPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const [params, supabase] = await Promise.all([searchParams, createClient()]);
  const [rows, foundersResult, entitlementsResult, referralsResult, rewardsResult] = await Promise.all([
    getAdminVerificationApplications(supabase!, params.status, params.q),
    supabase!.from("founding_sellers").select("id,slot_number,badge_active,assigned_at,revoked_at,seller:profiles!founding_sellers_seller_id_fkey(username,display_name)").order("slot_number").limit(100),
    supabase!.from("promotion_entitlements").select("id,source,state,duration_days,starts_at,expires_at,seller:profiles!promotion_entitlements_seller_id_fkey(username,display_name)").order("created_at", { ascending: false }).limit(100),
    supabase!.from("referrals").select("id,status,risk_status,attributed_at,referrer:profiles!referrals_referrer_id_fkey(username),referred:profiles!referrals_referred_id_fkey(username)").order("attributed_at", { ascending: false }).limit(100),
    supabase!.from("promotion_reward_ledger").select("id,status,earned_at,referrer:profiles!promotion_reward_ledger_referrer_id_fkey(username)").order("earned_at", { ascending: false }).limit(100),
  ]);
  const enabled = isFeatureEnabled("SELLER_VERIFICATION_ENABLED");
  return <main className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Staff workspace" title="Seller verification" description="Review applications and preserve an immutable decision history." variant="operations" meta={<span>{rows.length} records</span>} />
    <div className="mb-6 flex flex-wrap gap-2"><Link className="btn-secondary" href="/admin">Reports</Link>{["pending","verified","more_info","rejected","revoked"].map((status) => <Link key={status} className="btn-ghost capitalize" href={`/admin/seller-growth?status=${status}`}>{status.replaceAll("_", " ")}</Link>)}</div>
    {!enabled ? <p className="mb-5 rounded-xl bg-[#2a223d] p-4 text-sm">The feature flag is off. History remains visible, but decisions are disabled.</p> : null}
    <AdminSellerVerifications applications={rows} enabled={enabled} />
    <section className="mt-10 card p-5" aria-labelledby="referrals-admin-heading"><h2 id="referrals-admin-heading" className="text-2xl font-bold">Referral risk & rewards</h2><p className="mt-2 text-sm text-[var(--muted)]">{(referralsResult.data ?? []).length} recent attributions · {(referralsResult.data ?? []).filter((item) => item.risk_status !== "clear").length} flagged · {(rewardsResult.data ?? []).length} ledger rewards</p><AdminReferralQualification /><div className="mt-4 grid gap-2">{(referralsResult.data ?? []).slice(0, 20).map((item) => <div key={item.id} className="flex flex-wrap justify-between rounded-lg bg-[var(--surface-alt)] p-3 text-sm"><span>{item.status}</span><span className="badge">risk: {item.risk_status}</span></div>)}</div></section>
    <section className="mt-10" aria-labelledby="founders-admin-heading"><h2 id="founders-admin-heading" className="text-2xl font-bold">Founding sellers</h2><div className="mt-4 grid gap-3">{(foundersResult.data ?? []).map((founder) => { const seller = Array.isArray(founder.seller) ? founder.seller[0] : founder.seller; const state = founder.badge_active && !founder.revoked_at ? "active" : "revoked"; return <article className="card p-4" key={founder.id}><div className="flex flex-wrap justify-between gap-2"><strong>#{founder.slot_number} · {seller?.display_name ?? "Unknown seller"}</strong><span className="badge">{state}</span></div><p className="mt-1 text-sm text-[var(--muted)]">@{seller?.username ?? "unknown"}</p><AdminSellerGrowthActions entityType="founder" entityId={founder.id} state={state} /></article>; })}</div></section>
    <section className="mt-10" aria-labelledby="promotions-admin-heading"><h2 id="promotions-admin-heading" className="text-2xl font-bold">Promotion entitlements</h2><div className="mt-4 grid gap-3">{(entitlementsResult.data ?? []).map((entitlement) => { const seller = Array.isArray(entitlement.seller) ? entitlement.seller[0] : entitlement.seller; return <article className="card p-4" key={entitlement.id}><div className="flex flex-wrap justify-between gap-2"><strong>{seller?.display_name ?? "Unknown seller"} · {entitlement.source}</strong><span className="badge">{entitlement.state}</span></div><p className="mt-1 text-sm text-[var(--muted)]">{entitlement.duration_days} days{entitlement.expires_at ? ` · ends ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/Athens" }).format(new Date(entitlement.expires_at))}` : ""}</p><AdminSellerGrowthActions entityType="entitlement" entityId={entitlement.id} state={entitlement.state} /></article>; })}</div></section>
  </main>;
}

