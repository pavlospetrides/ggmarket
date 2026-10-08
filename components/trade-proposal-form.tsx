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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
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
        : result.error,
    );
    if (response.ok) form.reset();
  }
  return (
    <details className="container-page mt-3 rounded-xl border border-[#315c68] bg-[#111f27] p-3 md:mt-0">
      <summary className="cursor-pointer text-sm font-bold text-[#75d7e8]">
        <ArrowLeftRight className="mr-2 inline size-4" /> Propose a trade
      </summary>
      {listings.length ? <form
        onSubmit={submit}
        className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_1fr_auto]"
      >
        <select required className="input" name="listing" aria-label="Your listing">
          <option value="">Choose your item</option>
          {listings.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <input
          className="input"
          name="cash"
          type="number"
          min="0"
          max="1000000"
          placeholder="Cash add €"
          aria-label="Cash adjustment"
        />
        <input
          className="input"
          name="note"
          maxLength={1000}
          placeholder="Trade details"
          aria-label="Trade details"
        />
        <button className="btn-secondary">Propose</button>
      </form> : <p className="mt-2 text-xs text-[var(--muted)]">Publish an active listing before proposing an item trade.</p>}
      {status && (
        <p role="status" className="mt-2 text-xs text-[var(--muted)]">
          {status}
        </p>
      )}
    </details>
  );
}
