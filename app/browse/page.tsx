import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Repeat2, Search } from "lucide-react";
import { CategoryGrid } from "@/components/category-grid";
import { DiscoveryListingCard } from "@/components/discovery-listing-card";
import { ProductRail } from "@/components/product-rail";
import { BrowsingStateRestorer } from "@/components/listing-navigation";
import { SearchBar } from "@/components/search-bar";
import { TaxonomyNavigation } from "@/components/taxonomy-navigation";
import { getUser } from "@/lib/auth";
import { getBrowseData, getCategories } from "@/lib/data";
import { PUBLIC_PAGE_SOCIAL_METADATA } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Browse gaming gear",
  description: "Discover fresh gaming gear, popular listings, retro finds, trades, and wanted posts on GGMarket.",
  ...PUBLIC_PAGE_SOCIAL_METADATA.browse,
};

function Heading({ title, href }: { title: string; href?: string }) {
  return <div className="mb-7 flex items-end justify-between gap-4"><h2 className="section-title">{title}</h2>{href && <Link href={href} className="btn-ghost shrink-0">View all <ArrowRight className="size-4" /></Link>}</div>;
}

export default async function BrowsePage() {
  const user = await getUser();
  const [categories, discovery] = await Promise.all([getCategories(), getBrowseData(user?.id)]);
  const features = [
    { slug: "pc-components", title: "Build the next frame", image: "/images/browse/browse-pc-performance.webp", alt: "Gaming PC components arranged in a hardware studio" },
    { slug: "consoles", title: "Choose your platform", image: "/images/browse/browse-console-corner.webp", alt: "Console and controllers in a gaming setup" },
    { slug: "retro", title: "Play the classics", image: "/images/browse/browse-retro-vault.webp", alt: "Retro consoles and games in a game room" },
  ];

  return <div className="overflow-hidden pb-16">
    <BrowsingStateRestorer />
    <section className="browse-mobile-search container-page pt-5 lg:hidden" aria-label="Browse marketplace">
      <div className="rounded-[var(--radius-lg)] border border-white/8 bg-[#171529] p-4">
        <p className="mb-3 text-lg font-bold tracking-tight text-white">Find your next upgrade</p>
        <SearchBar action="/marketplace" id="browse-mobile-query" large placeholder="Search gaming gear" />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
          <Link href="/marketplace" className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-white/10 bg-white/[.04] px-3">{"Filter & sort"}</Link>
          <Link prefetch={false} href="/marketplace?sort=newest" className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-white/10 bg-white/[.04] px-3">Newest drops</Link>
        </div>
      </div>
    </section>

    <section className="container-page pt-4 md:pt-8">
      <div className="relative min-h-[28rem] overflow-hidden rounded-[var(--radius-xl)] bg-[#121821] sm:min-h-[38rem]">
        <Image src="/images/browse/browse-fresh-drops.webp" alt="Gaming handheld, headset, keyboard, controller, and games" fill preload sizes="calc(100vw - 2rem)" className="object-cover" />
        <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,10,.92),rgba(5,7,10,.18))]" aria-hidden="true" /> {/* taste-skill-ignore: neutral image scrim keeps hero copy readable */}
        <div className="relative flex min-h-[28rem] max-w-2xl flex-col justify-end p-6 sm:min-h-[38rem] sm:p-10 lg:p-14">
          <h1 className="max-w-[10ch] text-[clamp(3.25rem,8vw,8rem)] font-[790] leading-[.86] tracking-[-.07em]">Find what plays next</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/85 sm:text-lg">Explore fresh listings, specialist hardware, retro finds, trades, and wanted posts from the GGMarket community.</p>
          <Link href="/marketplace" className="btn-primary mt-7 w-fit">Open Marketplace <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </section>

    <section className="container-page py-20 md:py-28">
      <Heading title="Choose your lane" href="/marketplace" />
      <div className="grid gap-3 lg:grid-cols-3">
        {features.map((feature) => <Link prefetch={false} key={feature.slug} href={`/marketplace?category=${feature.slug}`} className="group relative min-h-72 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface)]">
          <Image src={feature.image} alt={feature.alt} fill sizes="(max-width:1023px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(5,7,10,.9),transparent)]" aria-hidden="true" /> {/* taste-skill-ignore: neutral image scrim keeps label readable */}
          <strong className="absolute inset-x-5 bottom-5 text-2xl tracking-[-.04em]">{feature.title}</strong>
        </Link>)}
      </div>
      <div className="mt-4"><CategoryGrid categories={categories} /></div>
      <section className="mt-10 rounded-[var(--radius-xl)] bg-[var(--surface)] p-5 sm:p-7" aria-label="Gaming category directory">
        <div className="mb-5 max-w-2xl"><p className="eyebrow">Loadout tree</p><h3 className="mt-2 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">Browse by system & product</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Start with the gear type, then narrow by platform, generation, model, or compatibility.</p></div>
        <TaxonomyNavigation directory />
      </section>
    </section>

    {discovery.popular.length > 0 && <section className="container-page pb-20 md:pb-28"><Heading title="Popular now" href="/marketplace" /><ProductRail label="Popular listings" restorationKey="browse:popular">{discovery.popular.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} navigationContext="browse:popular" />)}</ProductRail></section>}
    {discovery.fresh.length > 0 && <section className="container-page pb-20 md:pb-28"><Heading title="Just listed" href="/marketplace?sort=newest" /><ProductRail label="Fresh listings" restorationKey="browse:fresh">{discovery.fresh.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} navigationContext="browse:fresh" />)}</ProductRail></section>}

    <section className="bg-[#121821] py-20 md:py-28">
      <div className="container-page grid gap-3 lg:grid-cols-2">
        <Link prefetch={false} href="/marketplace?intent=trade" className="group min-h-72 rounded-[var(--radius-xl)] bg-[#163039] p-7 sm:p-10">
          <Repeat2 className="size-8 text-[var(--accent)]" />
          <h2 className="mt-16 max-w-[14ch] text-3xl font-bold tracking-[-.05em] sm:text-4xl">Trade what you have for what you want</h2>
          <span className="mt-7 inline-flex items-center gap-2 font-bold">Explore trades <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>
        <Link prefetch={false} href="/marketplace?intent=wanted" className="group min-h-72 rounded-[var(--radius-xl)] bg-[#322819] p-7 sm:p-10">
          <Search className="size-8 text-[var(--warning)]" />
          <h2 className="mt-16 max-w-[14ch] text-3xl font-bold tracking-[-.05em] sm:text-4xl">See what other gamers are looking for</h2>
          <span className="mt-7 inline-flex items-center gap-2 font-bold">View wanted posts <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>
      </div>
    </section>

    {discovery.retro.length > 0 && <section className="container-page py-20 md:py-28"><Heading title="Retro vault" href="/marketplace?category=retro" /><ProductRail label="Retro listings" restorationKey="browse:retro">{discovery.retro.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} navigationContext="browse:retro" />)}</ProductRail></section>}
    {discovery.recentlyViewed.length > 0 && <section className="container-page pb-20 md:pb-28"><Heading title="Recently viewed" /><ProductRail label="Recently viewed listings" restorationKey="browse:recently-viewed">{discovery.recentlyViewed.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} navigationContext="browse:recently-viewed" />)}</ProductRail></section>}
    {discovery.recommended.length > 0 && <section className="container-page pb-20 md:pb-28"><Heading title={discovery.personalizedRecommendations ? "Picked for you" : "Explore more"} href="/marketplace" /><ProductRail label="Recommended listings" restorationKey="browse:recommended">{discovery.recommended.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} navigationContext="browse:recommended" />)}</ProductRail></section>}

    <section className="container-page">
      <div className="grid min-h-80 rounded-[var(--radius-xl)] bg-[var(--primary)] p-8 text-white sm:p-12 lg:grid-cols-[1fr_.55fr] lg:items-end">
        <h2 className="max-w-[12ch] text-[clamp(2.8rem,6vw,6rem)] font-[790] leading-[.88] tracking-[-.07em]">Pass your setup forward</h2>
        <div className="mt-9 lg:mt-0"><p className="text-base leading-7 text-white">Create a clear listing and put unused gaming gear back into play.</p><Link prefetch={false} href="/sell" className="mt-6 inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-white px-5 font-bold !text-[#171221]">Sell an item</Link></div>
      </div>
    </section>
  </div>;
}
