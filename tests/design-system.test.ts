import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("premium marketplace visual foundation", () => {
  it("defines the premium minimal and neo-brutalist identity as one shared system", () => {
    const design = read("DESIGN.md");
    const css = read("app/globals.css");

    expect(design).toContain("70% premium minimal gaming");
    expect(design).toContain("30% neo-brutalist");
    expect(css).toContain("--brutalist-stroke:");
    expect(css).toContain("--motion-emphasized:");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("html { scroll-behavior: auto; }");
  });

  it("uses one accessible category switchboard with canonical marketplace routes", () => {
    const switchboard = read("components/category-switchboard.tsx");
    const mobileHero = read("components/mobile-home-hero.tsx");
    const home = read("app/page.tsx");

    expect(switchboard).toContain('aria-label="Explore gaming categories"');
    expect(switchboard).toContain('/marketplace?category=consoles');
    expect(switchboard).toContain('/marketplace?category=pc-components');
    expect(switchboard).toContain('/marketplace?category=games');
    expect(switchboard).toContain('/marketplace?category=peripherals');
    expect(switchboard).not.toContain("BrandMark");
    expect(switchboard).not.toContain('"use client"');
    expect(switchboard).not.toContain("onPointerMove");
    expect(switchboard).toContain("category-switchboard-spotlight");
    expect(mobileHero).toContain("<CategorySwitchboard");
    expect(home).toContain("<CategorySwitchboard");
  });

  it("uses accessible shared overlay primitives and preserves field focus", () => {
    const css = read("app/globals.css");
    const marketplace = read("components/marketplace-browser.tsx");
    const sheet = read("components/ui/sheet.tsx");
    const dialog = read("components/ui/dialog.tsx");

    expect(sheet).toContain("DialogPrimitive.Root");
    expect(dialog).toContain("DialogPrimitive.Root");
    expect(marketplace).toContain("<Sheet");
    expect(marketplace).toContain("{hydrated ? <Sheet");
    expect(marketplace).toContain('<details className="relative md:hidden">');
    expect(marketplace).toContain("useTransition");
    expect(marketplace).toContain("startFilterNavigation(() => router.push(href, { scroll: false }))");
    expect(marketplace).toContain('htmlFor={`${prefix}-min-price`}');
    expect(marketplace).toContain('htmlFor={`${prefix}-max-price`}');
    expect(marketplace).toContain('id="marketplace-results-heading"');
    expect(css).not.toMatch(/\.input:focus\s*\{[^}]*outline:\s*0/s);
    expect(css).toContain(".input:focus-visible");
  });

  it("uses the optimized brand font and flat token-driven surfaces", () => {
    const layout = read("app/layout.tsx");
    const css = read("app/globals.css");

    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("variable: \"--font-sans\"");
    expect(css).toContain("font-family: var(--font-sans)");
    expect(css).toContain(".btn-primary { border: 0; background: var(--primary);");
    expect(css).not.toMatch(/body\s*\{[^}]*radial-gradient/s);
  });

  it("keeps the primary navigation contracts while removing decorative chrome", () => {
    const header = read("components/header.tsx");
    const mobile = read("components/mobile-nav.tsx");

    expect(header).toContain('aria-label="Main navigation"');
    expect(header).toContain(">Marketplace<");
    expect(header).toContain(">Browse<");
    expect(header).toContain('event.key === "/"');
    expect(header).toContain("searchRef.current?.focus()");
    expect(mobile).toContain('aria-label="Mobile navigation"');
    expect(mobile).toContain('["Favorites", "/favorites", Heart]');
    expect(mobile).not.toContain('["Messages", "/messages", MessageCircle]');
    expect(read("components/profile-view.tsx")).toContain('href="/messages"');
    expect(mobile).not.toContain("bg-gradient-to-br");
    expect(mobile).not.toContain("backdrop-blur-2xl");
  });

  it("keeps Browse search-first on mobile with valid landmarks", () => {
    const browse = read("app/browse/page.tsx");
    const loading = read("app/browse/loading.tsx");
    const search = read("components/search-bar.tsx");

    expect(browse).not.toContain("<main");
    expect(loading).not.toContain("<main");
    expect(browse).toContain('className="browse-mobile-search');
    expect(browse).toContain("lg:hidden");
    expect(browse).toContain('<SearchBar action="/marketplace"');
    expect(browse).toContain("Filter & sort");
    expect(browse).not.toContain("shadow-[0_24px_70px");
    expect(browse).not.toContain("bg-[linear-gradient(145deg");
    expect(search).toContain("action = \"/search\"");
  });

  it("uses original campaign artwork while keeping real listings in discovery", () => {
    const home = read("app/page.tsx");
    const artDirection = read("components/art-directed-hero-image.tsx");
    const card = read("components/listing-card.tsx");
    const css = read("app/globals.css");

    expect(home).toContain("Find your next setup");
    expect(home).toContain("<ArtDirectedHeroImage");
    expect(artDirection).toContain("getImageProps");
    expect(artDirection).toContain("ggmarket-hero-desktop.webp");
    expect(artDirection).not.toContain("ggmarket-hero-mobile-v2.webp");
    expect(artDirection).not.toContain("priority");
    expect(home).toContain("Browse marketplace");
    expect(home).toContain("Sell your gear");
    expect(home).toContain("Just listed");
    expect(home).not.toContain("recent[0]?.images[0]");
    expect(home).not.toContain("const heroListing");
    expect(home).not.toContain("LIVE MARKET");
    expect(css).not.toContain("animation-timeline: view()");
    expect(card).toContain('sizes="(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw"');
    expect(card).not.toContain("border-b border-[var(--border)]");
  });

  it("gives every product route family a visible exchange masthead composition", () => {
    const masthead = read("components/page-masthead.tsx");
    const routes = [
      "app/notifications/page.tsx",
      "app/saved-searches/page.tsx",
      "app/settings/page.tsx",
      "app/settings/verification/page.tsx",
      "app/sell/page.tsx",
      "app/listing/[id]/edit/page.tsx",
      "app/messages/page.tsx",
      "app/profile/listings/page.tsx",
      "app/admin/page.tsx",
    ].map(read);

    expect(masthead).toContain("exchange-masthead");
    expect(masthead).toContain('aria-hidden="true"');
    expect(masthead).toContain("variant");
    for (const route of routes) expect(route).toContain("<PageMasthead");
    expect(read("components/favorite-listings.tsx")).toContain("<PageMasthead");
  });

  it("uses dedicated route compositions for auth, marketplace, listing, and profiles", () => {
    expect(read("components/auth-shell.tsx")).toContain("auth-exchange-rail");
    expect(read("components/marketplace-browser.tsx")).toContain("marketplace-command-deck");
    expect(read("app/listing/[id]/page.tsx")).toContain("listing-product-stage");
    expect(read("components/profile-view.tsx")).toContain("profile-identity-stage");
  });
});
