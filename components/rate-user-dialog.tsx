"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { Review } from "@/lib/types";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useHydrated } from "./use-hydrated";

export function RateUserDialog({ sellerId, sellerName, onSaved }: {
  sellerId: string;
  sellerName: string;
  onSaved: (result: { review: Review; summary: { average: number; count: number } }) => void;
}) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let current = true;
    void fetch(`/api/reviews?sellerId=${encodeURIComponent(sellerId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { rating?: { rating: number; comment: string | null } | null };
        if (current && response.ok && body.rating) {
          setRating(body.rating.rating);
          setComment(body.rating.comment ?? "");
        }
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [open, sellerId]);

  async function submit() {
    if (busy || rating < 1) return;
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sellerId, rating, comment }),
      });
      const body = await response.json() as { error?: string; review?: Review; summary?: { average: number; count: number } };
      if (!response.ok || !body.review || !body.summary) throw new Error(body.error || "The rating could not be saved.");
      onSaved({ review: body.review, summary: body.summary });
      setMessage("Your rating was saved.");
      window.setTimeout(() => setOpen(false), 500);
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "The rating could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      setMessage("");
      setError(false);
    }
  }}>
    <DialogTrigger asChild><button type="button" className="btn-primary min-h-11 w-full md:w-auto" disabled={!hydrated} data-hydrated={hydrated}>Rate this user</button></DialogTrigger>
    <DialogContent>
      <DialogTitle>Rate {sellerName}</DialogTitle>
      <DialogDescription>Community ratings are not proof of a completed purchase. You can update your rating later.</DialogDescription>
      <fieldset className="mt-5" disabled={busy || loading}>
        <legend className="text-sm font-bold">Rating</legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} className="grid min-h-11 min-w-11 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)]" onClick={() => setRating(value)}><Star className={`size-7 ${value <= rating ? "fill-[#f8bf4b] text-[#f8bf4b]" : "text-[var(--muted)]"}`} /></button>)}
        </div>
        <label className="label mt-5" htmlFor="rating-comment">Review (optional)</label>
        <textarea id="rating-comment" className="input min-h-28 resize-y" maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} />
      </fieldset>
      {message && <p className={`mt-3 text-sm ${error ? "text-[#ff9ca6]" : "text-[var(--success)]"}`} role={error ? "alert" : "status"}>{message}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose asChild><button type="button" className="btn-secondary min-h-11" disabled={busy}>Cancel</button></DialogClose>
        <button type="button" className="btn-primary min-h-11" disabled={busy || loading || rating < 1} onClick={submit}>{busy ? "Saving…" : "Submit rating"}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
