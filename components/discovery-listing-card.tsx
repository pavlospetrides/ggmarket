import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, ImageIcon, MapPin } from "lucide-react";
import { formatPrice, labelCondition } from "@/lib/constants";
import type { Listing } from "@/lib/types";

export function DiscoveryListingCard({ listing }: { listing: Listing }) {
  const intent = typeof listing.attributes.intent === "string" ? listing.attributes.intent : "sale";
  const budgetMin = Number(listing.attributes.wanted_budget_min || 0);
  const priceLabel = intent === "wanted" && budgetMin > 0
    ? `${formatPrice(budgetMin, listing.currency)}–${formatPrice(listing.price, listing.currency)}`
    : formatPrice(listing.price, listing.currency);
  return (
    <article data-ui className="group min-w-0 w-[72vw] max-w-[19rem] shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface)] transition-[transform,background-color] duration-300 hover:-translate-y-1 hover:bg-[var(--surface-alt)] motion-reduce:transform-none sm:w-[17.5rem]">
      <Link href={`/listing/${listing.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#151a26]">
          {listing.images[0] ? <Image src={listing.images[0]} alt={listing.title} fill sizes="(max-width: 640px) 72vw, 280px" className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.025] motion-reduce:transform-none" /> : <span className="grid size-full place-items-center text-[var(--muted)]"><ImageIcon className="size-10" aria-hidden="true" /><span className="sr-only">No image available</span></span>}
          {intent !== "sale" && <span className="absolute left-3 top-3 max-w-[calc(100%-4.5rem)] rounded-full bg-black/70 px-2.5 py-1.5 text-xs font-bold capitalize text-white [overflow-wrap:anywhere]">{intent.replaceAll("_", " ")}</span>}
          <span className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/65 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><ArrowUpRight className="size-4" /></span>
        </div>
        <div className="p-4">
          <div className="mb-2 flex min-w-0 flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
            <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-1 capitalize">{labelCondition(listing.condition)}</span>
            <span className="min-w-0 py-1 [overflow-wrap:anywhere]">{listing.category.name}</span>
          </div>
          <h3 className="line-clamp-2 min-h-11 font-bold leading-snug [overflow-wrap:anywhere]">{listing.title}</h3>
          <strong className="price mt-3 block text-xl tabular-nums [overflow-wrap:anywhere]">{priceLabel}</strong>
          <span className="mt-3 flex min-w-0 items-center gap-1 text-xs text-[var(--text-secondary)]"><MapPin className="size-3 shrink-0" aria-hidden="true" /> <span className="min-w-0 truncate">{listing.location}</span>{listing.shipping && <span className="shrink-0">· Ships</span>}</span>
          <span className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-[var(--text-secondary)]"><span className="min-w-0 truncate">{listing.seller.displayName}</span>{listing.seller.verified && <BadgeCheck className="size-4 shrink-0 text-[var(--success)]" aria-label="Verified seller" />}</span>
        </div>
      </Link>
    </article>
  );
}
