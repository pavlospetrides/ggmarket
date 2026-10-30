import Image from "next/image";
import { BadgeCheck, ImageIcon, MapPin, Star } from "lucide-react";
import { formatPrice, labelCondition } from "@/lib/constants";
import type { Listing } from "@/lib/types";
import { FavoriteButton } from "./favorite-button";
import { ListingNavigationLink, listingAnchorKey } from "./listing-navigation";

export function ListingCard({
  listing,
  viewerId,
  initialFavorite = false,
  eager = false,
  onFavoriteChange,
  navigationContext = "listing-grid",
}: {
  listing: Listing;
  viewerId: string | null;
  initialFavorite?: boolean;
  eager?: boolean;
  onFavoriteChange?: (listingId: string, active: boolean) => void;
  navigationContext?: string;
}) {
  const intent =
    typeof listing.attributes.intent === "string"
      ? listing.attributes.intent
      : "sale";
  const budgetMin = Number(listing.attributes.wanted_budget_min || 0);
  const priceLabel =
    intent === "wanted" && budgetMin > 0
      ? `${formatPrice(budgetMin)}–${formatPrice(listing.price)}`
      : formatPrice(listing.price);
  return (
    <article data-listing-id={listing.id} data-listing-anchor={listingAnchorKey(navigationContext, listing.id)} className="card card-interactive group min-w-0 overflow-hidden bg-[var(--surface)]">
      <div className="relative">
        <ListingNavigationLink
          href={`/listing/${listing.id}`}
          className="block focus-visible:rounded-[var(--radius-lg)]"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-alt)]">
            {listing.images[0] ? (
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                loading={eager ? "eager" : "lazy"}
                sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw"
                className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.025] motion-reduce:transform-none"
              />
            ) : (
              <span className="grid size-full place-items-center text-[var(--muted)]">
                <ImageIcon className="size-9" aria-hidden="true" />
                <span className="sr-only">No image available</span>
              </span>
            )}
            {(listing.featured || listing.belowMarket) && (
              <span className="badge absolute bottom-2.5 left-2.5 bg-[#090c13e8] text-[#ded7ff]">
                {listing.featured ? "Featured" : "Below market"}
              </span>
            )}
            {intent !== "sale" && (
              <span
                className={`absolute left-2.5 top-2.5 max-w-[calc(100%-4.5rem)] rounded-full px-2.5 py-1.5 text-xs font-bold [overflow-wrap:anywhere] ${intent === "wanted" ? "bg-[#f0b84b] text-black" : "bg-[#6d50d2] text-white"}`}
              >
                {intent.replaceAll("_", " ")}
              </span>
            )}
          </div>
        </ListingNavigationLink>
        <FavoriteButton
          viewerId={viewerId}
          listingId={listing.id}
          initialFavorite={initialFavorite}
          onFavoriteChange={onFavoriteChange}
          className="absolute right-2.5 top-2.5 z-10"
        />
      </div>
      <ListingNavigationLink
        href={`/listing/${listing.id}`}
        className="block min-w-0 focus-visible:rounded-xl"
      >
        <div className="p-3.5 sm:p-4">
          <div className="min-w-0">
            <span className="mb-2 inline-block rounded-md bg-[var(--surface-alt)] px-2 py-1 text-xs capitalize text-[var(--text-secondary)]">
              {labelCondition(listing.condition)}
            </span>
            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-[var(--text-primary)] [overflow-wrap:anywhere] sm:text-[15px]">
              {listing.title}
            </h3>
            <strong className="price mt-2 block text-lg tabular-nums text-white [overflow-wrap:anywhere] sm:text-xl">
              {priceLabel}
            </strong>
          </div>
          <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{listing.location}</span>
            </span>
            {listing.shipping && <span className="shrink-0">· Ships</span>}
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-1.5 pt-1 text-[13px] text-[var(--text-secondary)]">
            <span className="min-w-0 truncate">{listing.seller.displayName}</span>
            {listing.seller.verified && (
              <BadgeCheck
                className="size-4 shrink-0 text-[var(--success)]"
                aria-label="Verified seller"
              />
            )}
            {listing.seller.reviewCount > 0 && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 tabular-nums" aria-label={`Rated ${listing.seller.rating.toFixed(1)} out of 5`}>
                <Star className="size-3 fill-[#f8bf4b] text-[#f8bf4b]" aria-hidden="true" />
                {listing.seller.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </ListingNavigationLink>
    </article>
  );
}
