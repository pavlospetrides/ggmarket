import { ArrowUpRight, BadgeCheck, MapPin, PackageCheck, Users } from "lucide-react";
import type { RefObject } from "react";
import { listingAnchorKey } from "@/lib/listing-navigation";
import { toFavoriteRailItem } from "@/lib/favorite-rail";
import type { Listing } from "@/lib/types";
import { FavoriteButton } from "./favorite-button";
import { ListingNavigationLink } from "./listing-navigation";

export function FavoriteListingDetail({
  listing,
  viewerId,
  onFavoriteChange,
  onFavoriteError,
  headingRef,
}: {
  listing: Listing;
  viewerId: string;
  onFavoriteChange: (listingId: string, active: boolean) => void;
  onFavoriteError: (message: string) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const item = toFavoriteRailItem(listing);
  const delivery = [listing.shipping ? "Ships" : null, listing.meetup ? "Meetup" : null].filter(Boolean);

  return (
    <article
      role="region"
      aria-label={`Details for ${listing.title}`}
      data-listing-id={listing.id}
      data-listing-anchor={listingAnchorKey("favorites", listing.id)}
      className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface)] p-5 sm:p-7"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[var(--primary)]" />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <span className="rounded-full bg-[var(--surface-alt)] px-3 py-1.5">{item.category}</span>
            <span>{item.condition}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{item.status}</span>
          </div>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 max-w-3xl text-balance text-2xl font-black leading-tight text-white outline-none [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)] sm:text-3xl"
          >
            {item.title}
          </h2>
          <p className="price mt-3 text-3xl font-black tabular-nums text-white sm:text-4xl">{item.priceLabel}</p>
          <p className="mt-5 max-w-3xl whitespace-pre-wrap text-base leading-7 text-[var(--text-primary)] [overflow-wrap:anywhere]">
            {item.description || "No description was provided for this listing."}
          </p>
          <div className="mt-5 flex min-w-0 flex-wrap gap-x-5 gap-y-3 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 shrink-0 text-[#aa97ff]" />
              <span className="[overflow-wrap:anywhere]">{item.location}</span>
            </span>
            {delivery.map((label) => (
              <span key={label} className="inline-flex items-center gap-2">
                {label === "Ships" ? <PackageCheck aria-hidden="true" className="size-4 text-[#aa97ff]" /> : <Users aria-hidden="true" className="size-4 text-[#aa97ff]" />}
                {label}
              </span>
            ))}
          </div>
          <div className="mt-5 flex min-w-0 items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="min-w-0 [overflow-wrap:anywhere]">Sold by {item.sellerName}</span>
            {item.sellerVerified ? <BadgeCheck className="size-4 shrink-0 text-[var(--success)]" aria-label="Verified seller" /> : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row lg:flex-col">
          <ListingNavigationLink href={item.href} className="btn-primary min-h-11 min-w-44 justify-center">
            View listing <ArrowUpRight aria-hidden="true" className="size-4" />
          </ListingNavigationLink>
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-full bg-[var(--surface-alt)] pl-4 text-sm font-bold text-[var(--text-primary)]">
            <span>Remove favorite</span>
            <FavoriteButton
              viewerId={viewerId}
              listingId={listing.id}
              initialFavorite
              onFavoriteChange={onFavoriteChange}
              onFavoriteError={onFavoriteError}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
