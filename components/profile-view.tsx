import { BadgeCheck, CalendarDays, MapPin, Star } from "lucide-react";
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
      <section className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-[#251d49] via-[#17304b] to-[#13242a] sm:h-40" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <div className="grid size-24 place-items-center rounded-full border-4 border-[var(--surface)] bg-gradient-to-br from-[#7a5cf0] to-[#2e8ca7] text-3xl font-black">
              {seller.displayName[0]}
            </div>
            <div className="mb-1 min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-2xl font-black">
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
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#133424] px-3 py-1.5 text-xs font-bold text-[#69e7a4]">
              <BadgeCheck className="size-4" /> Verified Seller
            </div>
          )}
        </div>
      </section>
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <strong className="text-2xl">{stats.activeListings}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Active listings
          </span>
        </div>
        <div className="card p-4">
          <strong className="text-2xl">{stats.soldListings ?? "—"}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Marked sold
          </span>
        </div>
        <div className="card p-4">
          <strong className="text-2xl">{seller.reviewCount}</strong>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Reviews
          </span>
        </div>
        <div className="card p-4">
          <strong className="text-2xl">{stats.totalViews}</strong>
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
          <div className="card p-10 text-center text-[var(--muted)]">
            No active listings.
          </div>
        )}
      </div>
      <section className="mt-14">
        <h2 className="section-title">Reviews</h2>
        <div className="mt-5 space-y-3">
          {reviews.length ? (
            reviews.map((review) => (
              <article key={review.id} className="card p-6">
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
            <div className="card p-8 text-center text-sm text-[var(--muted)]">
              No reviews yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
