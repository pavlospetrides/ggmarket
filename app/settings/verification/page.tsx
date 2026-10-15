import { ItemVerification } from "@/components/item-verification";
import { requireUser } from "@/lib/auth";
import { getOwnListings } from "@/lib/data";

export default async function VerificationPage() {
  const user = await requireUser("/settings/verification");
  const listings = (await getOwnListings(user.id))
    .filter((item) => item.status === "active")
    .map((item) => ({ id: item.id, title: item.title }));
  return <div className="container-page min-w-0 max-w-3xl pb-28 pt-8 md:pb-12 md:pt-12">
    <div className="page-header min-w-0"><p className="eyebrow">Trust and safety</p><h1 className="page-title">Verification</h1><p className="page-description">Build buyer confidence without exposing sensitive identity documents.</p></div>
    <div className="grid min-w-0 gap-5">
      <section className="card min-w-0 p-6"><h2 className="font-bold">Account verification</h2><dl className="mt-4 grid min-w-0 gap-3 text-sm"><div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><dt>Email</dt><dd className="min-w-0 text-[var(--success)] [overflow-wrap:anywhere] sm:text-right">Managed by Supabase Auth</dd></div><div className="grid min-w-0 gap-1 sm:grid-cols-2"><dt>Phone</dt><dd className="min-w-0 text-[var(--muted)] [overflow-wrap:anywhere] sm:text-right">Not configured</dd></div><div className="grid min-w-0 gap-1 sm:grid-cols-2"><dt>Identity</dt><dd className="min-w-0 text-[var(--muted)] [overflow-wrap:anywhere] sm:text-right">Requires an approved external provider</dd></div><div className="grid min-w-0 gap-1 sm:grid-cols-2"><dt>Business</dt><dd className="min-w-0 text-[var(--muted)] [overflow-wrap:anywhere] sm:text-right">Manual review required</dd></div></dl><p className="mt-4 text-xs leading-5 text-[var(--muted)]">GGMarket does not store identity documents in this application.</p></section>
      <ItemVerification listings={listings} />
    </div>
  </div>;
}
