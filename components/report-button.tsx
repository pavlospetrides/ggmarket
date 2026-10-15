"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";

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

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-white"><Flag className="size-4 shrink-0" aria-hidden="true" /> Report listing</button>
    </DialogTrigger>
    <DialogContent closeLabel="Close report dialog" className="bottom-0 left-0 top-auto max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 overscroll-contain rounded-b-none rounded-t-3xl border border-[var(--border)] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(calc(100%-2rem),28rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)]">
      <DialogTitle>Report listing</DialogTitle>
      <DialogDescription>Tell us what is wrong with this listing. Our moderation team will review your report.</DialogDescription>
      {sent ? <div role="status" aria-live="polite" className="py-12 text-center"><strong>Thanks for letting us know.</strong><p className="mt-2 text-sm text-[var(--muted)]">Our moderation team will review this report.</p></div> : <form onSubmit={submit} className="mt-6 space-y-4"><div><label className="label" htmlFor="reason">Reason</label><select className="input" id="reason" name="reason" required><option value="scam">Scam or fraud</option><option value="prohibited">Prohibited item</option><option value="misleading">Misleading information</option><option value="duplicate">Duplicate</option><option value="spam">Spam</option><option value="other">Other</option></select></div><div><label className="label" htmlFor="details">Details (optional)</label><textarea className="input min-h-28" id="details" name="details" maxLength={1000} /></div>{error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}<button disabled={busy} className="btn-primary w-full">{busy ? "Submitting…" : "Submit report"}</button></form>}
    </DialogContent>
  </Dialog>;
}
