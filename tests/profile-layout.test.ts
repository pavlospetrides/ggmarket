import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("responsive profile layout contract", () => {
  it("keeps identity and actions in separate ordered regions", () => {
    const profile = read("components/profile-view.tsx");
    const identity = profile.indexOf('data-profile-region="identity"');
    const actions = profile.indexOf('data-profile-region="actions"');

    expect(identity).toBeGreaterThan(-1);
    expect(actions).toBeGreaterThan(identity);
    expect(profile).toContain('data-profile-region="banner"');
    expect(profile).toContain('data-profile-region="avatar"');
    expect(profile).toContain('data-profile-region="metadata"');
    expect(profile).toContain('data-profile-region="stats"');
  });

  it("contains unbroken profile and review content at phone widths", () => {
    const profile = read("components/profile-view.tsx");

    expect(profile).toContain("[overflow-wrap:anywhere]");
    expect(profile).toContain("min-w-0");
    expect(profile).toContain("overflow-hidden");
    expect(profile).toContain("grid-cols-2");
    expect(profile).toContain("pb-8");
    expect(profile).toContain("md:pb-12");
  });

  it("gives listing management headings and actions independent mobile rows", () => {
    const listings = read("app/profile/listings/page.tsx");

    expect(listings).toContain("flex-col");
    expect(listings).toContain("min-w-0");
    expect(listings).toContain("[overflow-wrap:anywhere]");
    expect(listings).toContain("grid-cols-2");
  });

  it("uses exact profile totals and exposes older listings and reviews", () => {
    const data = read("lib/data.ts");
    const profile = read("components/profile-view.tsx");
    expect(data).toContain('select(listingSelect, { count: "exact" })');
    expect(data).toContain('{ count: "exact" }');
    expect(profile).toContain("pagination.listings.total");
    expect(profile).toContain("pagination.reviews.total");
    expect(profile).toContain('aria-label="Listing pages"');
    expect(profile).toContain('aria-label="Review pages"');
  });
});
