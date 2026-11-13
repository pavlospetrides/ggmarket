import type { Metadata } from "next";
import Link from "next/link";
import { AdminSellerVerifications } from "@/components/admin-seller-verifications";
import { PageMasthead } from "@/components/page-masthead";
import { requireAdmin } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getAdminVerificationApplications } from "@/lib/seller-growth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seller verification management", robots: { index: false, follow: false } };

export default async function AdminSellerGrowthPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const [params, supabase] = await Promise.all([searchParams, createClient()]);
  const rows = await getAdminVerificationApplications(supabase!, params.status, params.q);
  const enabled = isFeatureEnabled("SELLER_VERIFICATION_ENABLED");
  return <main className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Staff workspace" title="Seller verification" description="Review applications and preserve an immutable decision history." variant="operations" meta={<span>{rows.length} records</span>} />
    <div className="mb-6 flex flex-wrap gap-2"><Link className="btn-secondary" href="/admin">Reports</Link>{["pending","verified","more_info","rejected","revoked"].map((status) => <Link key={status} className="btn-ghost capitalize" href={`/admin/seller-growth?status=${status}`}>{status.replaceAll("_", " ")}</Link>)}</div>
    {!enabled ? <p className="mb-5 rounded-xl bg-[#2a223d] p-4 text-sm">The feature flag is off. History remains visible, but decisions are disabled.</p> : null}
    <AdminSellerVerifications applications={rows} enabled={enabled} />
  </main>;
}

