import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { TaxonomyAttributeFields } from "../components/taxonomy-attribute-fields";

describe("simplified collectibles seller flow", () => {
  it("keeps collector details optional and collapsed", () => {
    const html = renderToStaticMarkup(createElement(TaxonomyAttributeFields, { categorySlug: "collectibles", selectionAttributes: { family: "cards", item_type: "graded-cards", subcategory: "graded-cards" }, values: { grading_status: "graded" }, onChange: () => undefined, collapsible: true }));
    expect(html).toContain("Additional details (optional)");
    expect(html).toContain("Card Game / Collection");
    expect(html).toContain("Grading Company");
    expect(html).toContain("seller-provided information");
    expect(html).not.toContain("Product type");
  });

  it("does not require a duplicate product/model value and uses city-only location", () => {
    const source = readFileSync(join(process.cwd(), "components/sell-wizard.tsx"), "utf8");
    expect(source).toContain('category?.slug !== "collectibles"');
    expect(source).toContain("productName: data.productName || data.title");
    expect(source).toContain("City");
    expect(source).toContain("Additional collector details are optional");
  });

  it("derives the edit product hint from the listing title for collectibles", () => {
    const source = readFileSync(join(process.cwd(), "components/manage-listing-form.tsx"), "utf8");
    expect(source).toContain('selectedCategory.slug === "collectibles" ? title :');
    expect(source).toContain("collapsible={selectedCategory.slug === \"collectibles\"}");
  });
});
