import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategorySwitchboard } from "@/components/category-switchboard";
import { TaxonomyNavigation } from "@/components/taxonomy-navigation";
import { TaxonomyBreadcrumbs } from "@/components/taxonomy-breadcrumbs";
import { isCollectiblesMarketplaceFilterKey } from "@/lib/collectibles-taxonomy";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("collectibles marketplace integration", () => {
  it("promotes collectibles as a first-class homepage route", () => {
    const html = renderToStaticMarkup(createElement(CategorySwitchboard));

    expect(html).toContain("Collectibles &amp; Cards");
    expect(html).toContain("/marketplace?category=collectibles");
    expect(html).toContain("Trading cards, figures and collector editions");
    expect(html).toContain("Five routes");
  });

  it("limits collectible marketplace controls to useful structured filters", () => {
    expect([
      "card_game", "grading_status", "grading_company",
    ].every(isCollectiblesMarketplaceFilterKey)).toBe(true);
    expect(isCollectiblesMarketplaceFilterKey("grading_certification_number")).toBe(false);
    expect(isCollectiblesMarketplaceFilterKey("card_number")).toBe(false);
    expect(isCollectiblesMarketplaceFilterKey("character")).toBe(false);

    const marketplace = read("components/marketplace-browser.tsx");
    expect(marketplace).toContain('selectedCategorySlug === "collectibles" ? "Collectibles or Cards"');
    expect(marketplace).toContain('isCollectiblesMarketplaceFilterKey(field.key)');
    expect(marketplace).toContain("e.g. Nicosia");
  });

  it("offers all, group, and item-type routes from one taxonomy on both result pages", () => {
    const params = { category: "collectibles", family: "cards" };
    const nav = renderToStaticMarkup(createElement(TaxonomyNavigation, { categorySlug: "collectibles", params }));
    expect(nav).toContain("All Collectibles &amp; Cards");
    expect(nav).toContain("/marketplace?category=collectibles&amp;family=collectibles");
    expect(nav).toContain("/marketplace?category=collectibles&amp;family=cards");
    expect(nav).toContain("/marketplace?category=collectibles&amp;family=cards&amp;item_type=pokemon-cards");
    const searchNav = renderToStaticMarkup(createElement(TaxonomyNavigation, { actionPath: "/search", categorySlug: "collectibles", params: { ...params, q: "pikachu" } }));
    expect(searchNav).toContain("/search?q=pikachu&amp;category=collectibles&amp;family=cards&amp;item_type=pokemon-cards");
    const crumbs = renderToStaticMarkup(createElement(TaxonomyBreadcrumbs, { actionPath: "/marketplace", categorySlug: "collectibles", params: { ...params, item_type: "pokemon-cards" } }));
    expect(crumbs).toContain("Pokémon Cards");
  });

  it("discloses that collectible grading and authenticity claims are seller-provided", () => {
    const listing = read("app/listing/[id]/page.tsx");

    expect(listing).toContain('item.category.slug === "collectibles"');
    expect(listing).toContain("provided by the seller");
    expect(listing).toContain("Lootriva has not verified them");
    expect(listing).toContain("Seller badges do not prove item authenticity");
  });
});
