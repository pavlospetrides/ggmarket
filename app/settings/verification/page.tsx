import { ItemVerification } from "@/components/item-verification";
import { EmailVerificationCard } from "@/components/email-verification-card";
import { PageMasthead } from "@/components/page-masthead";
import { SignupWelcome } from "@/components/signup-welcome";
import { requireUser } from "@/lib/auth";
import { getOwnListings } from "@/lib/data";

export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ status?: string; welcome?: string }> }) {
  const user = await requireUser("/settings/verification");
  const query = await searchParams;
  const { status } = query;
  const listings = (await getOwnListings(user.id))
    .filter((item) => item.status === "active")
    .map((item) => ({ id: item.id, title: item.title }));
  const showWelcome = status === "verified" && query.welcome === "1" && Boolean(user.email_confirmed_at);
  return <div className="container-page min-w-0 max-w-3xl pb-28 pt-8 md:pb-12 md:pt-12">
    {showWelcome ? <SignupWelcome userId={user.id} /> : null}
    <PageMasthead eyebrow="Trust and safety" title="Verification" description="Build buyer confidence without exposing sensitive identity documents." variant="trust" meta={<span>{listings.length} eligible listings</span>} />
    <div className="grid min-w-0 gap-5">
      <section className="card min-w-0 p-6"><h2 className="font-bold">Account email</h2><EmailVerificationCard email={user.email ?? "No email address"} confirmed={Boolean(user.email_confirmed_at)} initialStatus={status} /><dl className="mt-5 grid min-w-0 gap-3 border-t border-[var(--border)] pt-5 text-sm"><div className="grid min-w-0 gap-1 sm:grid-cols-2"><dt>Phone</dt><dd className="min-w-0 text-[var(--muted)] [overflow-wrap:anywhere] sm:text-right">Not configured</dd></div><div className="grid min-w-0 gap-1 sm:grid-cols-2"><dt>Identity</dt><dd className="min-w-0 text-[var(--muted)] [overflow-wrap:anywhere] sm:text-right">Requires an approved external provider</dd></div><div className="grid min-w-0 gap-1 sm:grid-cols-2"><dt>Seller verification</dt><dd className="min-w-0 text-[var(--muted)] [overflow-wrap:anywhere] sm:text-right">Manual approval required</dd></div></dl><p className="mt-4 text-xs leading-5 text-[var(--muted)]">Email confirmation does not grant a seller badge. GGMarket never approves seller verification merely because a button was tapped.</p></section>
      <ItemVerification listings={listings} />
    </div>
  </div>;
}
