import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessageCircle, PackageCheck, SearchCheck, ShieldCheck } from "lucide-react";
import { CategorySwitchboard } from "@/components/category-switchboard";
import { ListingGrid } from "@/components/listing-grid";
import { SearchBar } from "@/components/search-bar";
import { MobileHomeHero } from "@/components/mobile-home-hero";
import { JellyfishHeroBackground } from "@/components/ui/jellyfish-hero-background";
import { getUser } from "@/lib/auth";
import { getFavoriteIds, getListings } from "@/lib/data";
import { getRecentlyViewed } from "@/lib/phase2-data";

export default async function HomePage() {
  const [recent, user] = await Promise.all([getListings({}, 8), getUser()]);
  const favoriteIds = user ? await getFavoriteIds(user.id) : new Set<string>();
  const viewed = user ? await getRecentlyViewed(user.id) : [];

  return <>
    <section className="campaign-hero" aria-labelledby="home-heading">
      <JellyfishHeroBackground />
      <span className="campaign-hero-scrim" aria-hidden="true" />
      <div className="container-page campaign-hero-inner">
        <div className="campaign-hero-copy">
          <h1 id="home-heading">Find your next setup</h1>
          <p className="campaign-lede">The player-to-player market for consoles, PC hardware, games, and accessories.</p>
          <div className="campaign-actions">
            <Link href="/marketplace" className="btn-primary">Browse marketplace <ArrowRight className="size-4" /></Link>
            <Link href="/sell" className="btn-on-dark">Sell your gear</Link>
          </div>
          <div className="campaign-search"><SearchBar large /></div>
        </div>
        <MobileHomeHero />
        <p className="campaign-index" aria-hidden="true">GG / LOADOUT ATLAS</p>
      </div>
    </section>

    <section className="home-category-section container-page py-16 md:py-24" aria-labelledby="atlas-heading">
      <div className="section-heading-row"><div><h2 id="atlas-heading" className="section-title">Pick a system. Find the gear.</h2></div><Link href="/marketplace" className="btn-ghost shrink-0">All categories <ArrowRight className="size-4" /></Link></div>
      <CategorySwitchboard />
    </section>

    <section className="market-band" aria-labelledby="fresh-heading"><div className="container-page py-16 md:py-24">
      <div className="section-heading-row"><div><h2 id="fresh-heading" className="section-title">Just listed</h2><p className="mt-3 text-[var(--text-secondary)]">Real gear from real sellers, shown exactly as listed.</p></div><Link href="/marketplace?sort=newest" className="btn-ghost shrink-0">View marketplace <ArrowRight className="size-4" /></Link></div>
      {recent.length ? <ListingGrid listings={recent} viewerId={user?.id ?? null} favoriteIds={favoriteIds} sparseEditorial /> : <div className="empty-state-editorial"><span className="empty-state-icon"><PackageCheck /></span><div><h3>The market is warming up</h3><p>Be the first to put gaming gear back in play.</p></div><Link href="/sell" className="btn-primary">Create a listing</Link></div>}
    </div></section>

    {viewed.length > 0 && <section className="container-page py-16 md:py-24"><div className="section-heading-row"><div><h2 className="section-title">Recently viewed</h2></div></div><ListingGrid listings={viewed} viewerId={user?.id ?? null} favoriteIds={favoriteIds} /></section>}

    <section className="container-page py-16 md:py-24" aria-labelledby="direct-heading">
      <div className="direct-intro"><h2 id="direct-heading" className="section-title">A clearer way to deal</h2><p>GGMarket keeps the useful signals close and the conversation between players.</p></div>
      <div className="direct-steps">
        <article className="direct-step direct-step-small"><SearchCheck /><h3>Find the right gear</h3><p>Search real listings by category, condition, location, and price.</p></article>
        <article className="direct-step direct-step-medium"><BadgeCheck /><h3>Know the seller</h3><p>Review profiles, item details, delivery options, and available verification.</p></article>
        <article className="direct-step direct-step-large"><MessageCircle /><h3>Make the deal</h3><p>Message, offer, or propose a trade through the marketplace tools already built in.</p></article>
      </div>
      <div className="trust-line"><ShieldCheck /><span>Always verify the item and terms before you pay.</span></div>
    </section>

    <section className="sell-campaign">
      <Image src="/images/brand/ggmarket-hero-desktop.webp" alt="" fill sizes="100vw" className="sell-campaign-image" />
      <span className="sell-campaign-shade" aria-hidden="true" />
      <div className="container-page sell-campaign-inner"><h2>Ready for its next setup</h2><p>The next player is looking. Create a clear listing, choose your delivery options, and connect with interested gamers.</p><Link href="/sell" className="btn-primary">Sell your gear <ArrowRight className="size-4" /></Link></div>
    </section>

  </>;
}
