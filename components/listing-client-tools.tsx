"use client";
import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ListingViewTracker({ listingId }: { listingId: string }) { useEffect(() => { void fetch("/api/recently-viewed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId }) }); }, [listingId]); return null; }
export function ListingClientTools({ title }: { title: string }) { const [copied, setCopied] = useState(false); async function share() { if (navigator.share) await navigator.share({ title, url: location.href }); else { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } } return <button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-white">{copied ? <Check className="size-4 shrink-0 text-[var(--success)]" aria-hidden="true" /> : <Share2 className="size-4 shrink-0" aria-hidden="true" />} <span aria-live="polite">{copied ? "Link copied" : "Share"}</span></button>; }
