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
    <article className="group min-w-0">
      <div className="relative">
        <Link
          href={`/listing/${listing.id}`}
          className="block focus-visible:rounded-2xl"
          aria-label={`View ${listing.title}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {listing.images[0] ? (
              <Image
                src={listing.images[0]}
                alt={listing.title}
                fill
                sizes="(max-width: 768px) 50vw, 300px"
                className="object-cover transition duration-300 group-hover:scale-[1.035]"
              />
            ) : (
              <span className="grid size-full place-items-center text-[var(--muted)]">
                <ImageIcon className="size-9" />
                <span className="sr-only">No image available</span>
              </span>
            )}
            {(listing.featured || listing.belowMarket) && (
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[#11141de6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#d9d1ff]">
                {listing.featured ? "Featured" : "Below market"}
              </span>
            )}
            {intent !== "sale" && (
              <span
                className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${intent === "wanted" ? "bg-[#f0b84b] text-black" : "bg-[#4c3a86] text-white"}`}
              >
                {intent.replaceAll("_", " ")}
              </span>
            )}
          </div>
        </Link>
        <FavoriteButton
          listingId={listing.id}
          initialFavorite={initialFavorite}
          className="absolute right-2.5 top-2.5 z-10"
        />
      </div>
      <Link
        href={`/listing/${listing.id}`}
        className="block focus-visible:rounded-xl"
      >
        <div className="pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
              {listing.title}
            </h3>
            <strong className="shrink-0 text-base sm:text-lg">
              {priceLabel}
            </strong>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
            <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 capitalize">
              {labelCondition(listing.condition)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {listing.location}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#b8becb]">
            <span>{listing.seller.displayName}</span>
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
