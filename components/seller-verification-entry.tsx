import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck } from "lucide-react";
import type { SellerVerificationApplication } from "@/lib/seller-growth-domain";
import { canSubmitSellerVerification, verificationEntryLabel } from "@/lib/seller-growth-domain";

export function SellerVerificationEntry({ application, enabled, compact = false }: { application: SellerVerificationApplication | null; enabled: boolean; compact?: boolean }) {
  const label = verificationEntryLabel(application);
  const canApply = canSubmitSellerVerification(application, enabled);
  const showApplicationLink = canApply || (!enabled && !application);
  const href = "/settings/seller-growth#seller-review-heading";
  if (compact) {
    if (application?.status === "verified") return <span className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--success)]"><BadgeCheck className="size-4" aria-hidden="true" />{label}</span>;
    if (application?.status === "pending") return <span className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#cbbcff]"><Clock3 className="size-4" aria-hidden="true" />{label}</span>;
    if (!showApplicationLink) return <span className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--muted)]"><Clock3 className="size-4" aria-hidden="true" />{enabled ? "Reapplication opens after the review cooldown" : "Verification applications paused"}</span>;
    return <Link href={href} className="btn-primary w-full min-w-0 md:w-auto"><ShieldCheck className="size-4" aria-hidden="true" />{label}</Link>;
  }
  return <section className="card min-w-0 p-5 sm:p-7" aria-labelledby="seller-verification-entry-heading">
    <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#211a3d] text-[#cbbcff]"><ShieldCheck aria-hidden="true" /></span><div className="min-w-0"><h2 id="seller-verification-entry-heading" className="text-xl font-bold">Free seller verification</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">GGMarket staff review your marketplace profile, listing quality, and account activity. No ID documents are requested. Approval is a staff decision, never automatic.</p></div></div>
    <div className="mt-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
      {application?.status === "verified" ? <span className="badge border-[#28563e] bg-[#123021] text-[#75e5aa]"><BadgeCheck className="size-4" aria-hidden="true" />{label}</span>
        : application?.status === "pending" ? <span className="badge border-[#59459a] bg-[#211a3d] text-[#d8ceff]"><Clock3 className="size-4" aria-hidden="true" />{label}</span>
          : showApplicationLink ? <Link href={href} className="btn-primary w-full sm:w-auto">{label}<ArrowRight className="size-4" aria-hidden="true" /></Link>
            : <span className="badge border-white/10 bg-white/[.05] text-[var(--text-secondary)]">{enabled ? "Reapplication opens after the review cooldown" : "Applications paused"}</span>}
      {!enabled && application?.status !== "verified" ? <span className="text-xs text-[var(--muted)]">Applications are currently paused.</span> : null}
      {enabled && !canApply && application?.status === "rejected" ? <span className="text-xs text-[var(--muted)]">You can apply again on the date shown in your verification status.</span> : null}
    </div>
  </section>;
}
