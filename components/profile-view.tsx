import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  MapPin,
  PackageOpen,
  Settings,
  Star,
  Store,
} from "lucide-react";
import { ListingGrid } from "./listing-grid";
import type { Listing, Review, Seller } from "@/lib/types";

type ProfileStats = {
  activeListings: number;
  soldListings: number | null;
  totalViews: number;
};
type ProfilePagination = {
  listings: { page: number; total: number; pageSize: number };
  reviews: { page: number; total: number; pageSize: number };
};

export function ProfileView({
  seller,
  items,
  reviews,
  stats,
  pagination,
  own = false,
}: {
  seller: Seller;
  items: Listing[];
  reviews: Review[];
  stats: ProfileStats;
  pagination: ProfilePagination;
  own?: boolean;
}) {
  const avatarFallback = seller.displayName.trim().charAt(0).toUpperCase() || "G";
  const basePath = own ? "/profile" : `/profile/${encodeURIComponent(seller.username)}`;
  function pageHref(kind: "listingsPage" | "reviewsPage", page: number) {
    const params = new URLSearchParams();
    if (pagination.listings.page > 1) params.set("listingsPage", String(pagination.listings.page));
    if (pagination.reviews.page > 1) params.set("reviewsPage", String(pagination.reviews.page));
    if (page > 1) params.set(kind, String(page)); else params.delete(kind);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="container-page py-6 pb-8 md:py-12 md:pb-12">
      <section className="card overflow-hidden" aria-labelledby="profile-name">
        <div
          className="relative h-24 overflow-hidden bg-[#1b2030] sm:h-36"
          data-profile-region="banner"
          aria-hidden="true"
        >
          <div className="absolute inset-y-0 left-0 w-2/3 bg-[#28234a] opacity-70" />
          <div className="absolute bottom-0 left-0 h-1 w-32 bg-[var(--primary)]" />
        </div>

        <div className="px-4 pb-6 sm:px-7 sm:pb-8">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 gap-y-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-6">
            <div
              className="relative -mt-9 grid size-[4.75rem] shrink-0 place-items-center rounded-full border-4 border-[#131924] bg-[var(--primary)] text-2xl font-black text-white sm:-mt-12 sm:size-24 sm:text-3xl"
              data-profile-region="avatar"
              role="img"
              aria-label={`${seller.displayName} avatar`}
            >
              <span aria-hidden="true">{avatarFallback}</span>
            </div>

            <div className="min-w-0 pb-0.5" data-profile-region="identity">
              <div className="flex min-w-0 items-start gap-2">
                <h1
                  id="profile-name"
                  className="min-w-0 text-balance text-2xl font-[850] leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-3xl"
                >
                  {seller.displayName}
                </h1>
                {seller.verified ? (
                  <BadgeCheck
                    className="mt-1 size-5 shrink-0 text-[var(--success)] sm:size-6"
                    aria-label="Verified seller"
                  />
                ) : null}
              </div>
              <p className="mt-1 min-w-0 text-sm text-[var(--muted)] [overflow-wrap:anywhere]" translate="no">
                @{seller.username}
              </p>
            </div>

            <nav
              className="col-span-2 flex w-full min-w-0 flex-col gap-2 md:col-span-1 md:col-start-3 md:row-start-1 md:w-auto md:flex-row"
              data-profile-region="actions"
              aria-label={own ? "Your profile actions" : "Seller profile actions"}
            >
              {own ? (
                <>
                  <Link href="/settings" className="btn-primary w-full min-w-0 md:w-auto">
                    <Settings className="size-4" aria-hidden="true" />
                    Edit profile
                  </Link>
                  <Link href="/profile/listings" className="btn-secondary w-full min-w-0 md:w-auto">
                    <Store className="size-4" aria-hidden="true" />
                    Manage listings
                  </Link>
                  <Link href="/notifications" className="btn-secondary w-full min-w-0 md:hidden">
                    <Bell className="size-4" aria-hidden="true" />
                    Notifications
                  </Link>
                </>
              ) : (
                <a href="#active-listings" className="btn-secondary w-full md:w-auto">
                  <Store className="size-4" aria-hidden="true" />
                  View listings
                </a>
              )}
            </nav>
          </div>

          {seller.bio ? (
            <p className="mt-6 max-w-2xl min-w-0 text-sm leading-6 text-[#c4c9d3] [overflow-wrap:anywhere] sm:text-base sm:leading-7">
              {seller.bio}
            </p>
          ) : null}

          <div
            className="mt-5 flex min-w-0 flex-col gap-3 text-sm text-[var(--muted)] sm:flex-row sm:flex-wrap sm:gap-x-5"
            data-profile-region="metadata"
          >
            {seller.reviewCount > 0 ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Star className="size-4 shrink-0 fill-[#f8bf4b] text-[#f8bf4b]" aria-hidden="true" />
                <strong className="text-white">{seller.rating.toFixed(1)}</strong>
                <span className="[overflow-wrap:anywhere]">({seller.reviewCount} reviews)</span>
              </span>
            ) : null}
            {seller.location ? (
              <span className="inline-flex min-w-0 items-start gap-1.5">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="[overflow-wrap:anywhere]">{seller.location}</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              Member since {new Date(seller.memberSince).getFullYear()}
            </span>
          </div>

          {seller.verified ? (
            <div className="badge mt-5 border-[#28563e] bg-[#123021] text-[#75e5aa]">
              <BadgeCheck className="size-4" aria-hidden="true" />
              Verified seller
            </div>
          ) : null}
        </div>
      </section>

      <dl
        className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4"
        data-profile-region="stats"
        aria-label="Seller statistics"
      >
        <div className="card min-w-0 p-4 sm:p-5"><dt className="text-xs leading-5 text-[var(--muted)]">Active listings</dt><dd className="price mt-1 text-2xl tabular-nums">{stats.activeListings}</dd></div>
        <div className="card min-w-0 p-4 sm:p-5"><dt className="text-xs leading-5 text-[var(--muted)]">Marked sold</dt><dd className="price mt-1 text-2xl tabular-nums">{stats.soldListings ?? "—"}</dd></div>
        <div className="card min-w-0 p-4 sm:p-5"><dt className="text-xs leading-5 text-[var(--muted)]">Reviews</dt><dd className="price mt-1 text-2xl tabular-nums">{seller.reviewCount}</dd></div>
        <div className="card min-w-0 p-4 sm:p-5"><dt className="text-xs leading-5 text-[var(--muted)]">Listing views</dt><dd className="price mt-1 text-2xl tabular-nums">{stats.totalViews}</dd></div>
      </dl>

      <section className="mt-10 min-w-0 sm:mt-12" aria-labelledby="active-listings">
        <div className="flex min-w-0 items-end justify-between gap-4">
          <div className="min-w-0"><p className="eyebrow">Available now</p><h2 id="active-listings" className="mt-1 scroll-mt-24 text-balance text-2xl font-[800] tracking-tight sm:text-3xl">Active listings</h2></div>
          <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{pagination.listings.total} {pagination.listings.total === 1 ? "item" : "items"}</span>
        </div>
        <div className="mt-5 sm:mt-6">
          {items.length ? (
            <ListingGrid listings={items} eagerFirst />
          ) : (
            <div className="card empty-state overflow-hidden"><div className="min-w-0">
              <span className="empty-state-icon" aria-hidden="true"><PackageOpen /></span>
              <h3 className="mt-4 font-bold">{own ? "You have no active listings" : "No active listings"}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{own ? "Create a listing when you are ready to sell your next piece of gear." : "New items from this seller will appear here."}</p>
              {own ? <Link href="/sell" className="btn-primary mt-5">Create a listing</Link> : null}
            </div></div>
          )}
        </div>
        {pagination.listings.total > pagination.listings.pageSize ? <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Listing pages">
          {pagination.listings.page > 1 ? <Link className="btn-secondary" href={pageHref("listingsPage", pagination.listings.page - 1)}>Previous</Link> : <span />}
          <span className="text-sm text-[var(--muted)]">Page {pagination.listings.page} of {Math.ceil(pagination.listings.total / pagination.listings.pageSize)}</span>
          {pagination.listings.page < Math.ceil(pagination.listings.total / pagination.listings.pageSize) ? <Link className="btn-secondary" href={pageHref("listingsPage", pagination.listings.page + 1)}>Next</Link> : <span />}
        </nav> : null}
      </section>

      <section className="mt-12 min-w-0 sm:mt-14" aria-labelledby="reviews-heading">
        <div className="flex items-end justify-between gap-4">
          <div><p className="eyebrow">Seller history</p><h2 id="reviews-heading" className="mt-1 text-balance text-2xl font-[800] tracking-tight sm:text-3xl">Reviews</h2></div>
          <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{pagination.reviews.total}</span>
        </div>
        <div className="mt-5 space-y-3">
          {reviews.length ? reviews.map((review) => (
            <article key={review.id} className="card min-w-0 overflow-hidden p-5 sm:p-6">
              <div className="flex items-center gap-1 text-[#f8bf4b]" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: review.rating }, (_, index) => <Star key={index} className="size-4 fill-current" aria-hidden="true" />)}
              </div>
              {review.comment ? <p className="mt-3 min-w-0 leading-7 text-[#c4c9d3] [overflow-wrap:anywhere]">{review.comment}</p> : null}
              <p className="mt-4 min-w-0 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{review.reviewerName} ·{" "}<time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time></p>
            </article>
          )) : (
            <div className="card overflow-hidden p-7 text-center text-sm leading-6 text-[var(--muted)] sm:p-8">No reviews yet. Completed-transaction reviews will appear here.</div>
          )}
        </div>
        {pagination.reviews.total > pagination.reviews.pageSize ? <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Review pages">
          {pagination.reviews.page > 1 ? <Link className="btn-secondary" href={pageHref("reviewsPage", pagination.reviews.page - 1)}>Previous</Link> : <span />}
          <span className="text-sm text-[var(--muted)]">Page {pagination.reviews.page} of {Math.ceil(pagination.reviews.total / pagination.reviews.pageSize)}</span>
          {pagination.reviews.page < Math.ceil(pagination.reviews.total / pagination.reviews.pageSize) ? <Link className="btn-secondary" href={pageHref("reviewsPage", pagination.reviews.page + 1)}>Next</Link> : <span />}
        </nav> : null}
      </section>
    </div>
  );
}
