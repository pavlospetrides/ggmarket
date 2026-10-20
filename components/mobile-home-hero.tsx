import { CategorySwitchboard } from "@/components/category-switchboard";

export function MobileHomeHero() {
  return (
    <div className="mobile-hero-composition" data-testid="mobile-hero-composition">
      <span className="mobile-hero-ambient mobile-hero-ambient-primary" aria-hidden="true" />
      <span className="mobile-hero-ambient mobile-hero-ambient-secondary" aria-hidden="true" />
      <CategorySwitchboard compact />
    </div>
  );
}
