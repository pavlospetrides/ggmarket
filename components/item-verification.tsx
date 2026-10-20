"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";

export function ItemVerification({ listings }: { listings: { id: string; title: string }[] }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function create(listingId: string) {
    setCode("");
    setError("");
    setBusyId(listingId);
    try {
      const response = await fetch("/api/verification/item", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "A verification code could not be generated.");
      setCode(result.code);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A verification code could not be generated.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="card p-6" aria-busy={busyId !== ""}>
    <div className="flex items-start gap-3">
      <ShieldCheck aria-hidden="true" className="size-6 shrink-0 text-[#aa98ff]" />
      <div className="min-w-0">
        <h2 className="text-xl font-bold">Item ownership verification</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Generate a one-time code and include it in a new photo of the item. Codes expire after 24 hours. Submission review is a separate moderation step.</p>
      </div>
    </div>

    {listings.length === 0 ? (
      <div className="mt-5 rounded-xl bg-[var(--surface-alt)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
        You do not have an active listing to verify. Publish a listing first, then return here to generate its code.
      </div>
    ) : (
      <div className="mt-5 space-y-2">
        {listings.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] p-3 sm:flex-row sm:items-center">
          <span className="min-w-0 flex-1 break-words text-sm font-bold">{item.title}</span>
          <button type="button" disabled={busyId !== ""} onClick={() => create(item.id)} className="btn-secondary w-full sm:w-auto">
            {busyId === item.id ? "Generating…" : "Generate code"}
          </button>
        </div>)}
      </div>
    )}

    <div aria-live="polite">
      {code && <div className="mt-5 rounded-xl border border-[#4c426f] bg-[#1d1930] p-5 text-center"><span className="text-xs uppercase tracking-wide text-[var(--muted)]">Your one-time code</span><strong className="mt-2 block break-all text-3xl tracking-[.2em]">{code}</strong><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">This code is shown once. Do not include serial numbers or identity documents.</p></div>}
      {error && <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  </section>;
}
