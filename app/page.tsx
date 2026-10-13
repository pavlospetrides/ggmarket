import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gamepad2,
  MonitorUp,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { CategoryGrid } from "@/components/category-grid";
import { ListingGrid } from "@/components/listing-grid";
import { Logo } from "@/components/logo";
import { SearchBar } from "@/components/search-bar";
import { getUser } from "@/lib/auth";
import { getCategories, getFavoriteIds, getListings } from "@/lib/data";
import { getRecentlyViewed } from "@/lib/phase2-data";

export default async function HomePage() {
  const [categories, recent, user] = await Promise.all([
    getCategories(),
    getListings({}, 4),
    getUser(),
  ]);
  const favoriteIds = user ? await getFavoriteIds(user.id) : new Set<string>();
  const viewed = user ? await getRecentlyViewed(user.id) : [];

  return <>
    <section className="relative overflow-hidden border-b border-white/[.06]">
      <div className="container-page py-5 md:hidden"><Logo /></div>
      <div className="container-page grid min-h-[500px] items-center gap-10 py-12 md:grid-cols-[1.08fr_.92fr] md:py-16 lg:min-h-[560px]">
        <div className="relative z-10">
          <div className="badge mb-5 border-[#4d407a] bg-[#171329] text-[#cfc5ff]"><Sparkles className="size-3.5" /> The player-to-player marketplace</div>
          <h1 className="max-w-3xl text-[clamp(3.15rem,7vw,5.2rem)] font-[880] leading-[.94] tracking-[-.065em]">Great gear.<br /><span className="bg-gradient-to-r from-[#a994ff] via-[#8f8eff] to-[#62d5ff] bg-clip-text text-transparent">Better upgrades.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">Buy, sell, and trade gaming hardware with real players and specialist sellers—without the marketplace clutter.</p>
          <div className="mt-7 max-w-2xl"><SearchBar large /></div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-[var(--success)]" /> Account-based sellers</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="size-4 text-[#aa99ff]" /> Fresh local listings</span>
          </div>
        </div>
        <div className="relative hidden md:block" aria-hidden="true">
          <div className="absolute -inset-8 rounded-full bg-[#7658ff]/10 blur-3xl" />
          <div className="surface-panel relative rotate-[1.5deg] overflow-hidden p-5 lg:p-6">
            <div className="mb-5 flex items-center justify-between"><span className="text-xs font-bold text-[var(--text-muted)]">LIVE MARKET</span><span className="badge border-[#24573f] bg-[#10271d] text-[#65dda1]"><span className="size-1.5 rounded-full bg-[#45d78e]" /> Updated now</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[.07] bg-[#0b0f17] p-4"><span className="grid size-11 place-items-center rounded-xl bg-[#211a3b] text-[#ab99ff]"><Gamepad2 /></span><p className="mt-5 text-xs text-[var(--text-muted)]">Consoles</p><p className="mt-1 text-lg font-extrabold">Ready to play</p></div>
              <div className="rounded-2xl border border-white/[.07] bg-[#0b0f17] p-4"><span className="grid size-11 place-items-center rounded-xl bg-[#142736] text-[#6bd9ff]"><MonitorUp /></span><p className="mt-5 text-xs text-[var(--text-muted)]">PC hardware</p><p className="mt-1 text-lg font-extrabold">Built to upgrade</p></div>
            </div>
            <div className="mt-3 rounded-2xl border border-white/[.07] bg-gradient-to-r from-[#121725] to-[#17132a] p-4">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#1a3528] text-[var(--success)]"><BadgeCheck className="size-5" /></span><div><p className="text-sm font-bold">Trade with confidence</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">Seller profiles, item checks, and direct messaging.</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="container-page py-12 md:py-16">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="eyebrow">Find your next upgrade</p><h2 className="section-title mt-2">Browse categories</h2></div><Link href="/marketplace" className="btn-ghost hidden sm:inline-flex">All categories <ArrowRight className="size-4" /></Link></div>
      <CategoryGrid categories={categories} limit={8} />
    </section>

    <section className="container-page py-7 md:py-10">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="eyebrow">Fresh drops</p><h2 className="section-title mt-2">Recently listed</h2></div><Link href="/marketplace?sort=newest" className="btn-ghost px-2">View all <ArrowRight className="size-4" /></Link></div>
      {recent.length ? <ListingGrid listings={recent} favoriteIds={favoriteIds} /> : <div className="card empty-state"><div><span className="empty-state-icon"><PackageCheck /></span><h3 className="mt-4 text-lg font-bold">The market is warming up</h3><p className="mt-2 text-sm text-[var(--muted)]">Be the first to list gaming gear in your area.</p><Link href="/sell" className="btn-primary mt-5">Create a listing</Link></div></div>}
    </section>

    {viewed.length > 0 && <section className="container-page py-8"><div className="mb-6"><p className="eyebrow">Pick up where you left off</p><h2 className="section-title mt-2">Recently viewed</h2></div><ListingGrid listings={viewed} favoriteIds={favoriteIds} /></section>}

    <section className="container-page py-14 md:py-20">
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[#463a72] bg-[linear-gradient(120deg,#211937,#121724_62%,#10151d)] p-7 shadow-[var(--shadow-md)] sm:p-10">
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-[#7658ff]/15 blur-3xl" />
        <div className="relative max-w-2xl"><p className="eyebrow">Make room for what&apos;s next</p><h2 className="mt-3 text-3xl font-[850] tracking-[-.04em] sm:text-4xl">Your old gear is someone&apos;s next upgrade.</h2><p className="mt-4 max-w-xl leading-7 text-[var(--text-muted)]">Create a polished listing in minutes, choose delivery options, and connect directly with interested gamers.</p><Link href="/sell" className="btn-primary mt-7">Sell your gaming gear <ArrowRight className="size-4" /></Link></div>
      </div>
    </section>
  </>;
}
