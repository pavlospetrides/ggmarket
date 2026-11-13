import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategorySwitchboard } from "@/components/category-switchboard";
import { isCollectiblesMarketplaceFilterKey } from "@/lib/collectibles-taxonomy";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("collectibles marketplace integration", () => {
  it("promotes collectibles as a first-class homepage route", () => {
    const html = renderToStaticMarkup(createElement(CategorySwitchboard));

    expect(html).toContain("Collectibles &amp; Trading Cards");
    expect(html).toContain("/marketplace?category=collectibles");
    expect(html).toContain("Trading cards, figures and collector editions");
    expect(html).toContain("Five routes");
  });

  it("limits collectible marketplace controls to useful structured filters", () => {
    expect([
      "product_type", "card_game", "grading_status", "grading_company",
      "grading_score", "sealed_condition", "language",
    ].every(isCollectiblesMarketplaceFilterKey)).toBe(true);
    expect(isCollectiblesMarketplaceFilterKey("grading_certification_number")).toBe(false);
    expect(isCollectiblesMarketplaceFilterKey("card_number")).toBe(false);
    expect(isCollectiblesMarketplaceFilterKey("character")).toBe(false);

    const marketplace = read("components/marketplace-browser.tsx");
    expect(marketplace).toContain('selectedCategorySlug === "collectibles" ? "Collectible category"');
    expect(marketplace).toContain('isCollectiblesMarketplaceFilterKey(field.key)');
    expect(marketplace).toContain("e.g. Nicosia");
  });

  it("discloses that collectible grading and authenticity claims are seller-provided", () => {
    const listing = read("app/listing/[id]/page.tsx");

    expect(listing).toContain('item.category.slug === "collectibles"');
    expect(listing).toContain("provided by the seller");
    expect(listing).toContain("Lootriva has not verified them");
    expect(listing).toContain("Seller badges do not prove item authenticity");
  });
});
