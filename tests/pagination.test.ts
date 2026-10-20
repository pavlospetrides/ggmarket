import { describe, expect, it } from "vitest";
import { normalizeListingPage, pageHref } from "../lib/pagination";
import { readFileSync } from "node:fs";

describe("marketplace pagination", () => {
  it("clamps invalid pages against the truthful total", () => {
    expect(normalizeListingPage(undefined, 0, 24)).toBe(1);
    expect(normalizeListingPage("-4", 49, 24)).toBe(1);
    expect(normalizeListingPage("99", 49, 24)).toBe(3);
    expect(normalizeListingPage("2", 49, 24)).toBe(2);
  });

  it("preserves active URL parameters while changing page", () => {
    expect(pageHref("/search", { q: "deck", condition: "good", page: "1" }, 2))
      .toBe("/search?q=deck&condition=good&page=2");
  });

  it("embeds the seller relationship before filtering relevance results", () => {
    const source = readFileSync(new URL("../lib/data.ts", import.meta.url), "utf8");
    expect(source).toContain('select("id, profiles!listings_seller_id_fkey!inner(seller_type)")');
    expect(source).toContain("category:categories!listings_category_id_fkey!inner");
    expect(source).toContain("seller:profiles!listings_seller_id_fkey!inner");
  });
});
