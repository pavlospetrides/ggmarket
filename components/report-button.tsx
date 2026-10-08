"use client";

import { Flag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ReportButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, reason: formData.get("reason"), details: formData.get("details") }),
      });
      const result = await response.json();
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Report failed");
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }

  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--muted)] hover:text-white"><Flag className="size-4" /> Report listing</button>{open && <div className="fixed inset-0 z-[70] grid place-items-end bg-black/70 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={() => setOpen(false)}><div className="w-full max-w-md rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:rounded-3xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="report-title" className="text-xl font-bold">Report listing</h2><button type="button" className="grid size-10 place-items-center" onClick={() => setOpen(false)} aria-label="Close"><X /></button></div>{sent ? <div className="py-12 text-center"><strong>Thanks for letting us know.</strong><p className="mt-2 text-sm text-[var(--muted)]">Our moderation team will review this report.</p></div> : <form onSubmit={submit} className="mt-6 space-y-4"><div><label className="label" htmlFor="reason">Reason</label><select className="input" id="reason" name="reason" required><option value="scam">Scam or fraud</option><option value="prohibited">Prohibited item</option><option value="misleading">Misleading information</option><option value="duplicate">Duplicate</option><option value="spam">Spam</option><option value="other">Other</option></select></div><div><label className="label" htmlFor="details">Details (optional)</label><textarea className="input min-h-28" id="details" name="details" maxLength={1000} /></div>{error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}<button disabled={busy} className="btn-primary w-full">{busy ? "Submitting…" : "Submit report"}</button></form>}</div></div>}</>;
}
