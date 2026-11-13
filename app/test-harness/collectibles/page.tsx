import { notFound } from "next/navigation";
import { CategorySwitchboard } from "@/components/category-switchboard";
import { MobileHomeHero } from "@/components/mobile-home-hero";
import { TaxonomyNavigation } from "@/components/taxonomy-navigation";
import { CategoryGrid } from "@/components/category-grid";

export const dynamic = "force-dynamic";

export default function CollectiblesHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return <main className="container-page min-w-0 py-8">
    <h1 className="section-title">Collectibles integration harness</h1>
    <section className="home-category-section mt-8" aria-label="Desktop category switchboard"><CategorySwitchboard /></section>
    <MobileHomeHero />
    <section className="mt-8" aria-label="Browse category directory">
      <CategoryGrid categories={[{ id: "55555555-5555-4555-8555-555555555555", name: "Collectibles & Cards", slug: "collectibles", icon: "Trophy" }]} />
      <div className="mt-4"><TaxonomyNavigation categorySlug="collectibles" /></div>
      <div className="mt-4"><TaxonomyNavigation categorySlug="collectibles" params={{ category: "collectibles", family: "collectibles" }} /></div>
      <div className="mt-4"><TaxonomyNavigation categorySlug="collectibles" params={{ category: "collectibles", family: "cards" }} /></div>
    </section>
    <section className="mt-8 rounded-[var(--radius-xl)] bg-[var(--surface)] p-5" aria-label="Collectible trust notice">
      <h2 className="text-xl font-bold">Specifications</h2>
      <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
        Grading, certification, and authenticity details are provided by the seller. Lootriva has not verified them. Seller badges do not prove item authenticity.
      </p>
    </section>
  </main>;
}
