import { BadgeCheck, CalendarDays, MapPin, PackageOpen, Star } from "lucide-react";
import { ListingGrid } from "./listing-grid";
import type { Listing, Review, Seller } from "@/lib/types";

export function ProfileView({
  seller,
  items,
  reviews,
  stats,
  own = false,
}: {
  seller: Seller;
  items: Listing[];
  reviews: Review[];
  stats: { activeListings: number; soldListings: number | null; totalViews: number };
  own?: boolean;
}) {
  return (
    <div className="container-page py-8 md:py-12">
      <section className="card overflow-hidden shadow-[var(--shadow-md)]">
        <div className="relative h-28 overflow-hidden bg-[radial-gradient(circle_at_78%_20%,rgba(97,212,255,.18),transparent_30%),radial-gradient(circle_at_22%_0%,rgba(132,104,255,.35),transparent_36%),linear-gradient(120deg,#1c1737,#102335_58%,#0c1a20)] sm:h-40"><div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:40px_40px]" /></div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <div className="grid size-24 place-items-center rounded-full border-4 border-[#0f141d] bg-gradient-to-br from-[#866aff] to-[#287d98] text-3xl font-black shadow-xl">
              {seller.displayName[0]}
            </div>
            <div className="mb-1 min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-2xl font-[850] tracking-tight">
                {seller.displayName}
                {seller.verified && (
                  <BadgeCheck
                    className="text-[var(--success)]"
                    aria-label="Verified seller"
                  />
                )}
              </h1>
              <p className="text-sm text-[var(--muted)]">@{seller.username}</p>
            </div>
            {own && (
              <a href="/settings" className="btn-secondary">
                Edit profile
              </a>
            )}
          </div>
          {seller.bio && (
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#c4c9d3]">
              {seller.bio}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
            {seller.reviewCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 fill-[#f8bf4b] text-[#f8bf4b]" />{" "}
                <strong className="text-white">
                  {seller.rating.toFixed(1)}
                </strong>{" "}
                ({seller.reviewCount} reviews)
              </span>
            )}
            {seller.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" /> {seller.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" /> Member since{" "}
              {new Date(seller.memberSince).getFullYear()}
            </span>
          </div>
          {seller.verified && (
            <div className="badge mt-5 border-[#28563e] bg-[#123021] text-[#75e5aa]">
              <BadgeCheck className="size-4" /> Verified Seller
            </div>
          )}
        </div>
      </section>
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4 sm:p-5">
          <strong className="price text-2xl">{stats.activeListings}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Active listings
          </span>
        </div>
        <div className="card p-4 sm:p-5">
          <strong className="price text-2xl">{stats.soldListings ?? "—"}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Marked sold
          </span>
        </div>
        <div className="card p-4 sm:p-5">
          <strong className="price text-2xl">{seller.reviewCount}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Reviews
          </span>
        </div>
        <div className="card p-4 sm:p-5">
          <strong className="price text-2xl">{stats.totalViews}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Listing views
          </span>
        </div>
      </section>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="section-title">Active listings</h2>
        <span className="text-sm text-[var(--muted)]">
          {items.length} items
        </span>
      </div>
      <div className="mt-6">
        {items.length ? (
          <ListingGrid listings={items} />
        ) : (
          <div className="card empty-state"><div><span className="empty-state-icon"><PackageOpen /></span><h3 className="mt-4 font-bold">No active listings</h3><p className="mt-2 text-sm text-[var(--muted)]">New items from this seller will appear here.</p></div></div>
        )}
      </div>
      <section className="mt-14">
        <h2 className="section-title">Reviews</h2>
        <div className="mt-5 space-y-3">
          {reviews.length ? (
            reviews.map((review) => (
              <article key={review.id} className="card p-5 sm:p-6">
                <div className="flex items-center gap-1 text-[#f8bf4b]">
                  {Array.from({ length: review.rating }, (_, index) => (
                    <Star key={index} className="size-4 fill-current" />
                  ))}
                </div>
                {review.comment && (
                  <p className="mt-3 text-[#c4c9d3]">{review.comment}</p>
                )}
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {review.reviewerName} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </article>
            ))
          ) : (
            <div className="card p-8 text-center text-sm text-[var(--muted)]">No reviews yet. Completed-transaction reviews will appear here.</div>
          )}
        </div>
      </section>
    </div>
  );
}
