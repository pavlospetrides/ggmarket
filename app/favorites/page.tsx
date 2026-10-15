import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { ListingGrid } from "@/components/listing-grid";
import { requireUser } from "@/lib/auth";
import { getFavoriteListings } from "@/lib/data";
export const metadata: Metadata = { title: "Favorites", robots: { index: false } };
export default async function FavoritesPage() {
  const user = await requireUser("/favorites");
  const items = await getFavoriteListings(user.id);
  return (
    <div className="container-page min-w-0 py-8 md:py-12">
      <div className="mb-8 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Saved for later</p>
          <h1 className="page-title [overflow-wrap:anywhere]">Favorites</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            {items.length ? `${items.length} saved ${items.length === 1 ? "listing" : "listings"}. Keep your next find close.` : "Your shortlist starts with a heart."}
          </p>
        </div>
        {items.length > 0 && <Link href="/marketplace" className="btn-secondary self-start sm:self-auto">Keep browsing <ArrowUpRight className="size-4" aria-hidden="true" /></Link>}
      </div>
      {items.length ? <ListingGrid listings={items} /> : (
        <div className="grid min-h-80 place-items-center rounded-[var(--radius-xl)] bg-[var(--surface)] p-6 text-center sm:p-10">
          <div className="min-w-0 max-w-md">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--primary-hover)]"><Heart className="size-6" aria-hidden="true" /></span>
            <h2 className="mt-5 text-2xl font-bold">Nothing saved yet</h2>
            <p className="mt-3 leading-7 text-[var(--text-secondary)]">Tap the heart on a listing to save it here. Compare your favorites whenever you are ready.</p>
            <Link className="btn-primary mt-6" href="/marketplace">Explore listings</Link>
          </div>
        </div>
      )}
    </div>
  );
}
