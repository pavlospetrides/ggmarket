"use client";
import { ArrowLeftRight } from "lucide-react";
import { useState, type FormEvent } from "react";

export function TradeProposalForm({
  conversationId,
  listings,
}: {
  conversationId: string;
  listings: { id: string; title: string }[];
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setStatus("Sending proposal…");
    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId,
          offeredListingId: data.get("listing"),
          cashAdjustment: Number(data.get("cash") || 0),
          note: data.get("note"),
        }),
      });
      const result = await response.json();
      setStatus(
        response.ok
          ? "Trade proposal sent. It will appear in the conversation."
          : result.error || "The proposal could not be sent. Try again.",
      );
      if (response.ok) form.reset();
    } catch {
      setStatus("The proposal could not be sent. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="container-page mt-3 rounded-xl border border-[#315c68] bg-[#111f27] p-3 md:mt-0">
      <summary className="cursor-pointer text-sm font-bold text-[#75d7e8]">
        <ArrowLeftRight className="mr-2 inline size-4" aria-hidden="true" /> Propose a trade
      </summary>
      {listings.length ? <form
        onSubmit={submit}
        className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_1fr_auto]"
      >
        <label className="sr-only" htmlFor="trade-listing">Your listing</label>
        <select required className="input min-w-0" id="trade-listing" name="listing">
          <option value="">Choose your item</option>
          {listings.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="trade-cash">Cash adjustment</label>
        <input
          className="input min-w-0"
          id="trade-cash"
          name="cash"
          type="number"
          min="0"
          max="1000000"
          placeholder="Cash add €"
        />
        <label className="sr-only" htmlFor="trade-note">Trade details</label>
        <input
          className="input min-w-0"
          id="trade-note"
          name="note"
          maxLength={1000}
          placeholder="Trade details"
        />
        <button className="btn-secondary" disabled={busy}>{busy ? "Sending…" : "Propose"}</button>
      </form> : <p className="mt-2 text-xs text-[var(--muted)]">Publish an active listing before proposing an item trade.</p>}
      {status && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-[var(--muted)] [overflow-wrap:anywhere]">
          {status}
        </p>
      )}
    </details>
  );
}
