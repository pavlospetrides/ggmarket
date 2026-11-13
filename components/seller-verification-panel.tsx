"use client";

import { useState } from "react";
import { BadgeCheck, Clock3, Send, ShieldCheck } from "lucide-react";
import type { SellerVerificationApplication, SellerVerificationStatus } from "@/lib/seller-growth";
import { verificationStatusContent } from "@/lib/seller-growth";

export function SellerVerificationPanel({
  initialApplication,
  enabled,
}: {
  initialApplication: SellerVerificationApplication | null;
  enabled: boolean;
}) {
  const [application, setApplication] = useState(initialApplication);
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const status = (application?.status ?? "not_applied") as SellerVerificationStatus;
  const content = verificationStatusContent(status);
  const canApply = enabled && ["not_applied", "more_info", "rejected", "expired"].includes(status);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/seller-growth/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statement }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Application could not be submitted.");
      setApplication(body.application);
      setStatement("");
      setMessage("Application submitted. Lootriva will notify you after review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Application could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-ui className="card min-w-0 overflow-hidden p-5 sm:p-7" aria-labelledby="seller-review-heading">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#211a3d] text-[#cbbcff]"><ShieldCheck aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 id="seller-review-heading" className="text-xl font-bold">Become a Seller Reviewed account — Free</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Lootriva staff review your marketplace profile, listing quality, and account activity. This is not identity verification and does not guarantee transactions or item authenticity.</p>
        </div>
      </div>
      <div className="mt-6 rounded-xl bg-[var(--surface-alt)] p-4" role="status" aria-live="polite">
        <div className="flex items-center gap-2 font-bold">{status === "verified" ? <BadgeCheck className="size-5 text-[var(--success)]" /> : <Clock3 className="size-5 text-[#cbbcff]" />} {content.label}</div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{content.nextStep}</p>
        {application?.decision_reason ? <p className="mt-3 text-sm"><strong>Decision note:</strong> {application.decision_reason}</p> : null}
        {application?.resubmission_eligible_at ? <p className="mt-2 text-xs text-[var(--muted)]">Eligible to reapply: <time dateTime={application.resubmission_eligible_at}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/Athens" }).format(new Date(application.resubmission_eligible_at))}</time></p> : null}
      </div>
      {canApply ? (
        <form className="mt-6 grid gap-3" onSubmit={submit}>
          <label htmlFor="seller-review-statement" className="font-bold">How do you source and describe the items you sell?</label>
          <textarea id="seller-review-statement" className="input min-h-32 resize-y" minLength={20} maxLength={2000} required value={statement} onChange={(event) => setStatement(event.target.value)} aria-describedby="seller-review-help" />
          <p id="seller-review-help" className="text-xs leading-5 text-[var(--muted)]">Do not upload or include ID documents, payment details, or other sensitive personal information.</p>
          <button className="btn-primary w-full sm:w-fit" disabled={busy}><Send className="size-4" aria-hidden="true" /> {busy ? "Submitting…" : "Submit free application"}</button>
        </form>
      ) : !enabled ? <p className="mt-5 text-sm text-[var(--muted)]">New applications are not currently open. Existing decisions and history are preserved.</p> : null}
      {message ? <p className="mt-4 text-sm" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}

