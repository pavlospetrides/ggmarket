import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ImageIcon, MapPin, Star } from "lucide-react";
import { formatPrice, labelCondition } from "@/lib/constants";
import type { Listing } from "@/lib/types";
import { FavoriteButton } from "./favorite-button";

export function ListingCard({
  listing,
  initialFavorite = false,
}: {
  listing: Listing;
  initialFavorite?: boolean;
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
    <article className="card card-interactive group min-w-0 overflow-hidden">
      <div className="relative">
        <Link
          href={`/listing/${listing.id}`}
          className="block focus-visible:rounded-[var(--radius-lg)]"
          aria-label={`View ${listing.title}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden border-b border-[var(--border)] bg-[var(--surface-alt)]">
            {listing.images[0] ? (
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                sizes="(max-width: 768px) 50vw, 300px"
                className="object-cover transition duration-500 ease-out group-hover:scale-[1.045]"
              />
            ) : (
              <span className="grid size-full place-items-center text-[var(--muted)]">
                <ImageIcon className="size-9" />
                <span className="sr-only">No image available</span>
              </span>
            )}
            {(listing.featured || listing.belowMarket) && (
              <span className="badge absolute bottom-2.5 left-2.5 border-white/10 bg-[#090c13d9] text-[#ded7ff] backdrop-blur-md">
                {listing.featured ? "Featured" : "Below market"}
              </span>
            )}
            {intent !== "sale" && (
              <span
                className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow-lg ${intent === "wanted" ? "bg-[#f0b84b] text-black" : "bg-[#6d50d2] text-white"}`}
              >
                {intent.replaceAll("_", " ")}
              </span>
            )}
          </div>
        </Link>
        <FavoriteButton
          listingId={listing.id}
          initialFavorite={initialFavorite}
          className="absolute right-2.5 top-2.5 z-10 shadow-lg"
        />
      </div>
      <Link
        href={`/listing/${listing.id}`}
        className="block h-full focus-visible:rounded-xl"
      >
        <div className="p-3 sm:p-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-[var(--text-primary)] sm:text-[15px]">
              {listing.title}
            </h3>
            <strong className="price mt-2 block text-lg text-white sm:text-xl">
              {priceLabel}
            </strong>
          </div>
          <div className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--muted)] sm:text-xs">
            <span className="shrink-0 rounded-md border border-white/[.04] bg-[var(--surface-alt)] px-1.5 py-1 capitalize">
              {labelCondition(listing.condition)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin className="size-3" />
              <span className="truncate">{listing.location}</span>
            </span>
          </div>
          <div className="mt-3 flex min-w-0 items-center gap-1.5 border-t border-white/[.055] pt-3 text-[11px] text-[var(--text-secondary)] sm:text-xs">
            <span className="truncate">{listing.seller.displayName}</span>
            {listing.seller.verified && (
              <BadgeCheck
                className="size-4 text-[var(--success)]"
                aria-label="Verified seller"
              />
            )}
            {listing.seller.reviewCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1">
                <Star className="size-3 fill-[#f8bf4b] text-[#f8bf4b]" />
                {listing.seller.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
