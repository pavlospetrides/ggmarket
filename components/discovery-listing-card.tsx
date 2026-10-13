import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ImageIcon, MapPin } from "lucide-react";
import { formatPrice, labelCondition } from "@/lib/constants";
import type { Listing } from "@/lib/types";

export function DiscoveryListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="group w-[72vw] max-w-[19rem] shrink-0 snap-start overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-[linear-gradient(150deg,#151b29,#0c1018)] shadow-[0_16px_44px_rgba(0,0,0,.24)] transition duration-300 hover:-translate-y-1 hover:border-[#6353a0] hover:shadow-[0_24px_60px_rgba(0,0,0,.34)] sm:w-[17.5rem]">
      <Link href={`/listing/${listing.id}`} aria-label={`View ${listing.title}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#151a26]">
          {listing.images[0] ? <Image src={listing.images[0]} alt={listing.title} fill sizes="(max-width: 640px) 72vw, 280px" className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]" /> : <span className="grid size-full place-items-center text-[var(--muted)]"><ImageIcon className="size-10" /></span>}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d111a] to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">{listing.category.name}</span>
          <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-white/10 bg-black/45 opacity-0 backdrop-blur-md transition group-hover:opacity-100"><ArrowUpRight className="size-4" /></span>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 min-h-11 font-bold leading-snug">{listing.title}</h3>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="price text-xl">{formatPrice(listing.price, listing.currency)}</strong>
            <span className="rounded-md border border-white/[.06] bg-white/[.035] px-2 py-1 text-[10px] capitalize text-[var(--muted)]">{labelCondition(listing.condition)}</span>
          </div>
          <span className="mt-3 flex items-center gap-1 text-xs text-[var(--muted)]"><MapPin className="size-3" /> <span className="truncate">{listing.location}</span></span>
        </div>
      </Link>
    </article>
  );
}
