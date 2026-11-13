"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { PromotionEntitlement } from "@/lib/seller-growth";

type ListingOption = { id: string; title: string };
type Campaign = { id: string; entitlement_id: string; listing_id: string; state: string; starts_at: string; expires_at: string };

export function FeaturedListingControl({
  entitlements,
  campaigns,
  listings,
  enabled,
}: {
  entitlements: PromotionEntitlement[];
  campaigns: Campaign[];
  listings: ListingOption[];
  enabled: boolean;
}) {
  const [activeCampaigns, setActiveCampaigns] = useState(campaigns);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function activate(event: React.FormEvent<HTMLFormElement>, entitlementId: string) {
    event.preventDefault();
    const listingId = String(new FormData(event.currentTarget).get("listingId") ?? "");
    setBusyId(entitlementId);
    setMessage("");
    try {
      const response = await fetch("/api/seller-growth/featured", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId, entitlementId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Promotion could not be activated.");
      setActiveCampaigns((current) => [...current.filter((campaign) => campaign.entitlement_id !== entitlementId), body.campaign]);
      setMessage("Featured placement activated. Rotation and eligibility checks apply.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promotion could not be activated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section data-ui className="card p-5 sm:p-7" aria-labelledby="featured-benefits-heading">
      <div className="flex items-center gap-3"><Sparkles className="text-[#cbbcff]" aria-hidden="true" /><h2 id="featured-benefits-heading" className="text-xl font-bold">Featured eligibility</h2></div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Complimentary launch promotions and referral boosts are non-cash benefits. Only one owned active listing can be featured at a time, and featured placement rotates fairly.</p>
      <div className="mt-5 grid gap-4">
        {entitlements.length ? entitlements.map((entitlement) => {
          const campaign = activeCampaigns.find((item) => item.entitlement_id === entitlement.id);
          const available = enabled && entitlement.source !== "referral" && ["available", "active"].includes(entitlement.state) && listings.length > 0;
          return <div key={entitlement.id} className="rounded-xl bg-[var(--surface-alt)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{entitlement.source === "founder" ? "Complimentary founder promotion" : entitlement.source === "referral" ? "Referral Featured boost" : "Promotional entitlement"}</strong><span className="badge capitalize">{campaign?.state ?? entitlement.state}</span></div>
            <p className="mt-2 text-sm text-[var(--muted)]">{entitlement.duration_days} days · begins on first activation · does not stack with another active campaign</p>
            {campaign ? <p className="mt-2 text-sm">Ends <time dateTime={campaign.expires_at}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Athens" }).format(new Date(campaign.expires_at))}</time></p> : null}
            {available ? <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => activate(event, entitlement.id)}><label className="sr-only" htmlFor={`listing-${entitlement.id}`}>Listing to feature</label><select id={`listing-${entitlement.id}`} className="input min-w-0 flex-1" name="listingId" defaultValue={campaign?.listing_id ?? listings[0]?.id}>{listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select><button className="btn-primary shrink-0" disabled={busyId === entitlement.id}>{busyId === entitlement.id ? "Activating…" : campaign ? "Switch listing" : "Feature listing"}</button></form> : null}
          </div>;
        }) : <p className="text-sm text-[var(--muted)]">No Featured benefits are available yet.</p>}
      </div>
      {message ? <p className="mt-4 text-sm" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}

