"use client";

import { useState } from "react";
import { Copy, Gift } from "lucide-react";
import type { ReferralReward } from "@/lib/seller-growth";

type Referral = { id: string; status: string; risk_status: string; attributed_at: string; qualified_at: string | null };

export function ReferralDashboard({ code, referrals, rewards, listings, enabled }: { code: string | null; referrals: Referral[]; rewards: ReferralReward[]; listings: Array<{ id: string; title: string }>; enabled: boolean }) {
  const [message, setMessage] = useState("");
  const link = code ? `https://lootriva.com/join?ref=${code}` : "";

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setMessage("Referral link copied.");
  }

  async function redeem(event: React.FormEvent<HTMLFormElement>, rewardId: string) {
    event.preventDefault();
    const listingId = String(new FormData(event.currentTarget).get("listingId") ?? "");
    const response = await fetch("/api/seller-growth/referrals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rewardId, listingId }) });
    const body = await response.json();
    setMessage(response.ok ? "Referral boost activated." : body.error || "Boost could not be activated.");
  }

  return <section className="card p-5 sm:p-7" aria-labelledby="referral-heading">
    <div className="flex items-center gap-3"><Gift className="text-[#78d8e8]" /><h2 id="referral-heading" className="text-xl font-bold">Invite friends, earn boosts</h2></div>
    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">A genuinely new member must confirm email and keep an eligible listing active for seven days. Rewards are non-cash, non-transferable, and limited to five per calendar month.</p>
    {enabled && code ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input className="input min-w-0 flex-1" readOnly value={link} aria-label="Referral link" /><button className="btn-secondary" type="button" onClick={copyLink}><Copy className="size-4" /> Copy link</button></div> : <p className="mt-4 text-sm text-[var(--muted)]">Referral rewards are not currently open.</p>}
    {enabled ? <div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-[var(--surface-alt)] p-4"><strong className="text-2xl">{referrals.filter((item) => item.status === "pending").length}</strong><p className="text-sm text-[var(--muted)]">Pending</p></div><div className="rounded-xl bg-[var(--surface-alt)] p-4"><strong className="text-2xl">{referrals.filter((item) => item.status === "rewarded").length}</strong><p className="text-sm text-[var(--muted)]">Qualified</p></div><div className="rounded-xl bg-[var(--surface-alt)] p-4"><strong className="text-2xl">{rewards.filter((item) => item.status === "earned").length}</strong><p className="text-sm text-[var(--muted)]">Available boosts</p></div></div> : null}
    {enabled ? rewards.filter((reward) => reward.status === "earned").map((reward) => <form key={reward.id} className="mt-4 rounded-xl bg-[var(--surface-alt)] p-4" onSubmit={(event) => redeem(event, reward.id)}><strong>3-day Featured boost</strong><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select className="input min-w-0 flex-1" name="listingId" aria-label="Listing to feature">{listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select><button className="btn-primary" disabled={!listings.length}>Activate boost</button></div></form>) : null}
    {message ? <p className="mt-4 text-sm" role="status">{message}</p> : null}
  </section>;
}
