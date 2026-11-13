import { notFound } from "next/navigation";
import { SellerVerificationEntry } from "@/components/seller-verification-entry";
import { SellerVerificationPanel } from "@/components/seller-verification-panel";
import { SellerTrustBadges } from "@/components/seller-trust-badges";
import type { SellerVerificationApplication, SellerVerificationStatus } from "@/lib/seller-growth-domain";

const statuses = new Set<SellerVerificationStatus>(["pending", "verified", "more_info", "rejected", "revoked", "expired"]);

export default async function SellerVerificationHarnessPage({ searchParams }: { searchParams: Promise<{ status?: string; paused?: string }> }) {
  if (process.env.E2E_UI_HARNESS !== "1") notFound();
  const query = await searchParams;
  const enabled = query.paused !== "1";
  const status = query.status && statuses.has(query.status as SellerVerificationStatus) ? query.status as SellerVerificationApplication["status"] : null;
  const application: SellerVerificationApplication | null = status ? {
    id: "application-a", seller_id: "seller-a", status,
    application_note: "I source and describe my items accurately.",
    decision_reason: status === "rejected" || status === "revoked" ? "Please review your listing information." : null,
    reviewed_at: status === "rejected" ? "2026-11-13T10:00:00Z" : null,
    resubmission_eligible_at: status === "rejected" ? "2999-11-20T10:00:00Z" : null,
    created_at: "2026-11-13T10:00:00Z", updated_at: "2026-11-13T10:00:00Z",
  } : null;
  return <main className="container-page grid max-w-3xl gap-6 py-8 pb-24 sm:py-12">
    <SellerVerificationEntry application={application} enabled={enabled} />
    <SellerVerificationPanel initialApplication={application} enabled={enabled} />
    <div aria-label="Public seller badge preview"><SellerTrustBadges verified={status === "verified"} /></div>
  </main>;
}
