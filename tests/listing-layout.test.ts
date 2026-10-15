import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = () => read("app/listing/[id]/page.tsx");

// These source contracts cover the CSS/overlay boundary. Actual geometry and
// focus trapping still require browser verification; these are not E2E claims.
describe("listing presentation contracts", () => {
  it("lets unbroken specification keys and values wrap inside shrinkable cells", () => {
    const source = page();
    expect(source).toMatch(/<dt className="[^"]*\[overflow-wrap:anywhere\]/);
    expect(source).toMatch(/<dd className="[^"]*\[overflow-wrap:anywhere\]/);
    expect(source).toMatch(/key=\{key\}\s+className="[^"]*min-w-0/);
    expect(source).toContain("grid-cols-1 sm:grid-cols-2");
  });

  it("contains the title, seller identity and description without hiding their text", () => {
    const source = page();
    expect(source).toMatch(/<h1 className="[^"]*\[overflow-wrap:anywhere\]/);
    expect(source).toMatch(/className="[^"]*\[overflow-wrap:anywhere\][^"]*">\s*\{item\.seller\.displayName\}/);
    expect(source).toMatch(/<p className="[^"]*\[overflow-wrap:anywhere\][^"]*">\s*\{item\.description\}/);
    expect(source).toMatch(/<span className="[^"]*shrink-0[^"]*"[^>]*>\s*\{item\.seller\.displayName\[0\]/);
  });

  it("reserves content space for a reflowing mobile action row above navigation", () => {
    const source = page();
    expect(source).toContain("pb-40");
    expect(source).toContain("md:pb-12");
    expect(source).toContain("bottom-[calc(78px+env(safe-area-inset-bottom))]");
    expect(source).toMatch(/data-listing-actions="mobile"\s+className="[^"]*flex-wrap/);
    expect(source).toMatch(/data-listing-actions="mobile"[\s\S]*?<strong className="[^"]*min-w-0[^"]*\[overflow-wrap:anywhere\]/);
  });

  it("releases the page animation containing block so fixed contact actions stay attached to the viewport", () => {
    const css = read("app/globals.css");
    const entrance = css.match(/\.page-enter\s*\{([^}]*)\}/)?.[1];

    expect(entrance).toBeDefined();
    expect(entrance).toContain("animation: page-enter");
    // Forward fill retains the animation's transform containing block even
    // when its final transform is `none`, trapping fixed listing actions.
    expect(entrance).not.toMatch(/\b(?:both|forwards)\b/);
  });

  it("gives favorites a 44px touch target without changing optimistic action semantics", () => {
    const source = read("components/favorite-button.tsx");
    expect(source).toContain("size-11");
    expect(source).toContain("aria-pressed={active}");
    expect(source).toContain('method: next ? "POST" : "DELETE"');
  });

  it("orders card condition before title and keeps wanted budgets shrinkable", () => {
    for (const file of ["components/listing-card.tsx", "components/discovery-listing-card.tsx"]) {
      const source = read(file);
      expect(source.indexOf("{labelCondition(listing.condition)}")).toBeLessThan(source.indexOf("<h3 "));
      expect(source).toMatch(/<h3 className="[^"]*\[overflow-wrap:anywhere\]/);
      expect(source).toMatch(/<strong className="[^"]*\[overflow-wrap:anywhere\]/);
      expect(source).toContain("wanted_budget_min");
    }
  });

  it("keeps one saved listing at card scale instead of stretching across the page", () => {
    expect(read("components/listing-grid.tsx")).toContain('listings.length === 1 ? "max-w-sm"');
  });

  it("preserves full product imagery and exposes gallery selection to keyboard users", () => {
    const source = read("components/listing-gallery.tsx");
    expect(source).toMatch(/sizes="\(max-width: 1023px\)[^"]*" className="object-contain/);
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("focus-visible:ring-2");
    expect(source).toContain("onKeyDown={navigateExpandedGallery}");
  });

  it("keeps gallery and report focus containment owned by the shared dialog", () => {
    for (const file of ["components/listing-gallery.tsx", "components/report-button.tsx"]) {
      const source = read(file);
      expect(source).toContain("<DialogTrigger asChild>");
      expect(source).toContain("<DialogContent");
      expect(source).not.toContain('role="dialog"');
      expect(source).not.toContain("document.body.style.overflow");
    }
    expect(read("components/report-button.tsx")).toContain("overscroll-contain");
  });

  it("announces a successful report after the submit control is replaced", () => {
    const source = read("components/report-button.tsx");
    expect(source).toMatch(/sent \? <div[^>]*role="status"[^>]*aria-live="polite"/);
  });

  it("uses a direct section heading for price context instead of a decorative kicker", () => {
    const source = page();
    expect(source).toContain("Price intelligence & asking-price context");
    expect(source).not.toContain('<p className="eyebrow">Price intelligence</p>');
  });
});
