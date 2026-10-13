import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Cpu,
  Disc3,
  Gamepad2,
  Ghost,
  Glasses,
  Joystick,
  Monitor,
  Mouse,
  PcCase,
  Repeat2,
  Search,
  Sparkles,
  Trophy,
  Wrench,
} from "lucide-react";
import { BrowseHero, type BrowseHeroSlide } from "@/components/browse-hero";
import { DiscoveryListingCard } from "@/components/discovery-listing-card";
import { ProductRail } from "@/components/product-rail";
import { getUser } from "@/lib/auth";
import { getBrowseData, getCategories } from "@/lib/data";
import type { Category, Listing } from "@/lib/types";

export const metadata: Metadata = {
  title: "Browse gaming gear",
  description: "Discover fresh gaming gear, popular listings, retro finds, trades, and wanted posts on GGMarket.",
};

const icons = { Armchair, Cpu, Disc3, Gamepad2, Ghost, Glasses, Joystick, Monitor, Mouse, PcCase, Trophy, Wrench };

const heroArt: Record<string, Pick<BrowseHeroSlide, "image" | "imageAlt" | "imagePosition">> = {
  "pc-components": {
    image: "/images/browse/browse-pc-performance.webp",
    imageAlt: "Graphics card, motherboard, memory, and liquid cooling arranged in a dark gaming hardware studio",
    imagePosition: "68% center",
  },
  consoles: {
    image: "/images/browse/browse-console-corner.webp",
    imageAlt: "Modern console and controllers in a premium living-room gaming setup",
    imagePosition: "72% center",
  },
  retro: {
    image: "/images/browse/browse-retro-vault.webp",
    imageAlt: "Retro console, controller, handheld, and CRT television in a warmly lit game room",
    imagePosition: "72% center",
  },
};

function uniqueListings(items: Listing[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function editorialFor(category: Category) {
  if (category.slug === "retro") return { eyebrow: "The retro vault", title: "Old school. Still legendary.", description: "Revisit consoles, games, and hardware from generations that defined play.", cta: "Enter the Retro Vault" };
  if (category.slug === "consoles") return { eyebrow: "Console corner", title: "Pick your next platform.", description: "Explore current consoles, handhelds, bundles, and the gear that goes with them.", cta: "Explore consoles" };
  if (["gaming-pcs", "pc-components"].includes(category.slug)) return { eyebrow: "Upgrade your setup", title: "More frames. Better plays.", description: "Discover gaming PCs, graphics cards, processors, and components from real sellers.", cta: "Explore PC gear" };
  return { eyebrow: "Featured collection", title: `Explore ${category.name}.`, description: `See the latest active ${category.name.toLowerCase()} listings from the GGMarket community.`, cta: `Browse ${category.name}` };
}

function SectionHeading({ eyebrow, title, href, linkLabel = "View all" }: { eyebrow: string; title: string; href?: string; linkLabel?: string }) {
  return <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7"><div><p className="eyebrow">{eyebrow}</p><h2 className="section-title mt-2">{title}</h2></div>{href && <Link href={href} className="btn-ghost shrink-0 px-2">{linkLabel} <ArrowRight className="size-4" /></Link>}</div>;
}

export default async function BrowsePage() {
  const user = await getUser();
  const [categories, discovery] = await Promise.all([
    getCategories(),
    getBrowseData(user?.id),
  ]);
  const source = uniqueListings([...discovery.fresh, ...discovery.popular, ...discovery.retro]);
  const imageForCategory = (category: Category) => source.find((item) => item.category.id === category.id)?.images[0];
  const heroCategories = ["pc-components", "consoles", "retro"]
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is Category => Boolean(category));
  const heroSlides: BrowseHeroSlide[] = [
    {
      eyebrow: "Fresh on GGMarket",
      title: "Find your next gaming obsession.",
      description: "Explore newly listed gear, unexpected upgrades, and community finds worth a closer look.",
      href: "/marketplace?sort=newest",
      cta: "See fresh listings",
      image: "/images/browse/browse-fresh-drops.webp",
      imageAlt: "Handheld console, headset, keyboard, controller, and game case displayed in a neon gaming studio",
      imagePosition: "68% center",
    },
    ...heroCategories.map((category) => ({
      ...editorialFor(category),
      href: `/marketplace?category=${category.slug}`,
      ...heroArt[category.slug],
    })),
  ].slice(0, 4);
  const consoleCategory = categories.find((category) => category.slug === "consoles");
  const consoleListings = consoleCategory ? source.filter((item) => item.category.id === consoleCategory.id).slice(0, 3) : [];

  return (
    <main className="overflow-hidden pb-10 sm:pb-16">
      <div className="container-page pt-4 sm:pt-7">
        <BrowseHero slides={heroSlides} />
      </div>

      <section className="container-page py-14 sm:py-20" aria-labelledby="browse-categories">
        <SectionHeading eyebrow="Choose a direction" title="Explore categories" href="/marketplace" linkLabel="Open Marketplace" />
        <h2 id="browse-categories" className="sr-only">Explore categories</h2>
        <div className="browse-category-rail -mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-3 md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-6">
          {categories.map((category, index) => {
            const Icon = icons[category.icon as keyof typeof icons] ?? Gamepad2;
            const image = imageForCategory(category);
            return <Link key={category.id} href={`/marketplace?category=${category.slug}`} className={`group relative min-h-44 w-[42vw] max-w-[12rem] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-white/[.08] bg-[#121824] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#6c59b4] md:w-auto md:max-w-none ${index < 2 ? "md:col-span-2 lg:col-span-1" : ""}`}>
              {image && <Image src={image} alt="" fill sizes="(max-width: 768px) 42vw, 210px" className="object-cover opacity-45 transition duration-700 group-hover:scale-110 group-hover:opacity-60" />}
              <span className="absolute inset-0 bg-gradient-to-t from-[#090d15] via-[#0a0e17b8] to-transparent" />
              <span className="relative grid size-11 place-items-center rounded-xl border border-white/10 bg-black/30 text-[#bcafff] backdrop-blur-md"><Icon className="size-5" /></span>
              <strong className="absolute inset-x-4 bottom-4 text-sm font-black uppercase tracking-wide">{category.name}</strong>
            </Link>;
          })}
        </div>
      </section>

      {discovery.popular.length > 0 && <section className="container-page pb-16 sm:pb-24"><SectionHeading eyebrow="Real listing views" title="Popular right now" href="/marketplace" /><ProductRail label="Popular right now listings">{discovery.popular.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} />)}</ProductRail></section>}

      {consoleCategory && <section className="border-y border-white/[.06] bg-[radial-gradient(circle_at_15%_30%,rgba(76,112,255,.16),transparent_30%),linear-gradient(135deg,#0b101a,#0e1220_55%,#16112a)] py-14 sm:py-20"><div className="container-page grid gap-8 lg:grid-cols-[.9fr_1.4fr] lg:items-center"><div><span className="badge border-[#4b5e9d] bg-[#121a33] text-[#aebdff]">Console Corner</span><h2 className="mt-5 max-w-lg text-4xl font-black uppercase leading-[.94] tracking-[-.05em] sm:text-5xl">Your next generation starts here.</h2><p className="mt-5 max-w-md leading-7 text-[var(--text-secondary)]">From living-room powerhouses to handheld escapes—explore active console listings from the GGMarket community.</p><Link href={`/marketplace?category=${consoleCategory.slug}`} className="btn-primary mt-7">Explore consoles <ArrowRight className="size-4" /></Link></div><div className="grid gap-3 sm:grid-cols-3">{consoleListings.length ? consoleListings.map((listing) => <Link key={listing.id} href={`/listing/${listing.id}`} className="group overflow-hidden rounded-2xl border border-white/[.08] bg-black/20"><div className="relative aspect-[4/3]">{listing.images[0] ? <Image src={listing.images[0]} alt={listing.title} fill sizes="(max-width: 640px) 100vw, 240px" className="object-cover transition duration-500 group-hover:scale-105" /> : <span className="grid size-full place-items-center"><Gamepad2 /></span>}</div><div className="p-3"><strong className="line-clamp-2 text-sm">{listing.title}</strong></div></Link>) : <div className="surface-panel col-span-full grid min-h-56 place-items-center p-8 text-center text-[var(--muted)]"><Gamepad2 className="mb-3 size-8 text-[#9d89ff]" /><p>Console listings will appear here as sellers publish them.</p></div>}</div></div></section>}

      {discovery.fresh.length > 0 && <section className="container-page py-16 sm:py-24"><SectionHeading eyebrow="Just listed" title="Fresh drops" href="/marketplace?sort=newest" /><ProductRail label="Fresh drops listings">{discovery.fresh.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} />)}</ProductRail></section>}

      <section className="container-page pb-16 sm:pb-24"><SectionHeading eyebrow="Shop your budget" title="Great finds" /><div className="grid gap-4 md:grid-cols-3"><Link href="/marketplace?max=100" className="group relative min-h-56 overflow-hidden rounded-[1.5rem] border border-white/[.08] bg-[radial-gradient(circle_at_85%_10%,rgba(97,212,255,.25),transparent_38%),linear-gradient(140deg,#111b25,#0b1017)] p-6 transition hover:-translate-y-1 hover:border-[#43839a]"><span className="eyebrow text-[#76dfff]">Easy wins</span><strong className="mt-3 block text-3xl font-black uppercase tracking-[-.04em]">Under €100</strong><p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">Games, controllers, accessories, and compact upgrades.</p><ArrowRight className="absolute bottom-6 right-6 size-5 transition group-hover:translate-x-1" /></Link><Link href="/marketplace?max=300" className="group relative min-h-56 overflow-hidden rounded-[1.5rem] border border-white/[.08] bg-[radial-gradient(circle_at_85%_10%,rgba(132,104,255,.3),transparent_40%),linear-gradient(140deg,#171429,#0d1019)] p-6 transition hover:-translate-y-1 hover:border-[#6652ad]"><span className="eyebrow">Serious upgrades</span><strong className="mt-3 block text-3xl font-black uppercase tracking-[-.04em]">Under €300</strong><p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">Consoles, components, displays, and more capable gear.</p><ArrowRight className="absolute bottom-6 right-6 size-5 transition group-hover:translate-x-1" /></Link><Link href="/marketplace?min=500" className="group relative min-h-56 overflow-hidden rounded-[1.5rem] border border-white/[.08] bg-[radial-gradient(circle_at_85%_10%,rgba(242,186,92,.22),transparent_38%),linear-gradient(140deg,#201b13,#0e1118)] p-6 transition hover:-translate-y-1 hover:border-[#8c7041]"><span className="eyebrow text-[#f2c879]">Premium territory</span><strong className="mt-3 block text-3xl font-black uppercase tracking-[-.04em]">High-end gear</strong><p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">Complete setups, flagship GPUs, and enthusiast hardware.</p><ArrowRight className="absolute bottom-6 right-6 size-5 transition group-hover:translate-x-1" /></Link></div></section>

      {(discovery.retro.length > 0 || categories.some((category) => category.slug === "retro")) && <section className="relative border-y border-[#5c4267]/40 bg-[radial-gradient(circle_at_80%_30%,rgba(222,99,186,.12),transparent_32%),linear-gradient(180deg,#120e18,#090c13)] py-16 sm:py-24"><div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:100%_4px]" /><div className="container-page relative"><div className="grid gap-8 lg:grid-cols-[.65fr_1.35fr] lg:items-end"><div><span className="inline-flex size-14 items-center justify-center rounded-2xl border border-[#724d7b] bg-[#25152b] text-[#ef9de2]"><Ghost /></span><p className="eyebrow mt-6 text-[#e69cda]">Retro vault</p><h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-.05em]">Yesterday’s icons.<br />Ready to play.</h2><p className="mt-5 max-w-sm leading-7 text-[var(--muted)]">Classic hardware and games, presented with the respect they deserve.</p><Link href="/marketplace?category=retro" className="btn-secondary mt-7 border-[#684c70] bg-[#211725]">Explore Retro <ArrowRight className="size-4" /></Link></div>{discovery.retro.length > 0 && <ProductRail label="Retro Vault listings">{discovery.retro.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} />)}</ProductRail>}</div></div></section>}

      <section className="container-page py-16 sm:py-24"><SectionHeading eyebrow="Beyond buying" title="Make the market yours" /><div className="grid gap-4 lg:grid-cols-2"><Link href="/marketplace?intent=trade" className="group relative min-h-72 overflow-hidden rounded-[1.75rem] border border-[#365d69] bg-[radial-gradient(circle_at_90%_15%,rgba(66,199,222,.2),transparent_40%),linear-gradient(145deg,#10232a,#0a1017)] p-7 sm:p-9"><Repeat2 className="size-9 text-[#71d7e8]" /><p className="eyebrow mt-8 text-[#75d7e8]">Looking to trade?</p><h2 className="mt-3 text-3xl font-black uppercase tracking-[-.04em]">Swap the gear you have for the gear you want.</h2><span className="btn-secondary mt-7 border-[#315c68] bg-[#14252d]">Explore trades <ArrowRight className="size-4" /></span></Link><Link href="/marketplace?intent=wanted" className="group relative min-h-72 overflow-hidden rounded-[1.75rem] border border-[#705c32] bg-[radial-gradient(circle_at_90%_15%,rgba(241,184,75,.2),transparent_40%),linear-gradient(145deg,#28200f,#0e1118)] p-7 sm:p-9"><Search className="size-9 text-[#f0c568]" /><p className="eyebrow mt-8 text-[#f0c568]">Gamers are looking for…</p><h2 className="mt-3 text-3xl font-black uppercase tracking-[-.04em]">See what the community wants next.</h2><span className="btn-secondary mt-7 border-[#68562f] bg-[#2a2212]">See wanted posts <ArrowRight className="size-4" /></span></Link></div></section>

      {discovery.recentlyViewed.length > 0 && <section className="container-page pb-16 sm:pb-24"><SectionHeading eyebrow="Pick up where you left off" title="Recently viewed" /><ProductRail label="Recently viewed listings">{discovery.recentlyViewed.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} />)}</ProductRail></section>}

      {discovery.recommended.length > 0 && <section className="container-page pb-16 sm:pb-24"><SectionHeading eyebrow={discovery.personalizedRecommendations ? "Based on your recent browsing" : "More from GGMarket"} title={discovery.personalizedRecommendations ? "Recommended for you" : "Explore more"} href="/marketplace" /><ProductRail label={discovery.personalizedRecommendations ? "Recommended listings" : "More listings to explore"}>{discovery.recommended.map((listing) => <DiscoveryListingCard key={listing.id} listing={listing} />)}</ProductRail></section>}

      <section className="container-page"><div className="relative overflow-hidden rounded-[2rem] border border-[#5947a0] bg-[radial-gradient(circle_at_80%_20%,rgba(132,104,255,.34),transparent_35%),linear-gradient(135deg,#1b1530,#0c111a)] px-6 py-12 sm:px-12 sm:py-16"><Sparkles className="absolute right-8 top-8 size-24 text-white/[.04] sm:size-36" /><p className="eyebrow">Pass it forward</p><h2 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[.96] tracking-[-.05em] sm:text-6xl">Your old setup could be someone’s next upgrade.</h2><p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)]">List gaming gear in minutes and put it back into play.</p><Link href="/sell" className="btn-primary mt-8">Sell an item <ArrowRight className="size-4" /></Link></div></section>
    </main>
  );
}
