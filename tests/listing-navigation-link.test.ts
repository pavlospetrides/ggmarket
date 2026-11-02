import { describe, expect, it } from "vitest";
import {
  applyBrowsingSnapshot,
  captureListingDeparture,
  chooseListingBackAction,
  listingBackDestination,
} from "../components/listing-navigation";
import { listingAnchorKey } from "../lib/listing-navigation";
import type { ListingBrowsingSnapshot } from "../lib/listing-navigation-state";

function fakeTarget({ withAnchor = true, withRail = true } = {}) {
  const rail = {
    getAttribute: (name: string) => name === "data-listing-scroll-container" ? "browse:recommended" : null,
    scrollLeft: 420,
  };
  const anchor = {
    closest: (selector: string) => selector === "[data-listing-scroll-container]" && withRail ? rail : null,
    getAttribute: (name: string) => {
      if (name === "data-listing-anchor") return withAnchor ? "browse:recommended:listing-42" : null;
      if (name === "data-listing-id") return withAnchor ? "listing-42" : null;
      return null;
    },
    getBoundingClientRect: () => ({ top: 172, left: 288 }),
  };
  return {
    closest: (selector: string) => selector === "[data-listing-anchor]" ? anchor : null,
  } as unknown as HTMLElement;
}

describe("listing navigation link capture", () => {
  it("captures the clicked card viewport position and horizontal rail offset", () => {
    expect(captureListingDeparture({
      target: fakeTarget(),
      sourceEntryId: "browse-entry",
      sourceUrl: "/browse",
      destinationUrl: "/listing/listing-42",
      viewport: { scrollX: 0, scrollY: 3853 },
    })).toEqual({
      sourceEntryId: "browse-entry",
      sourceUrl: "/browse",
      destinationUrl: "/listing/listing-42",
      listingId: "listing-42",
      anchorKey: "browse:recommended:listing-42",
      scrollX: 0,
      scrollY: 3853,
      anchorTop: 172,
      anchorLeft: 288,
      railKey: "browse:recommended",
      railScrollLeft: 420,
    });
  });

  it("captures a vertical grid without inventing a rail state", () => {
    expect(captureListingDeparture({
      target: fakeTarget({ withRail: false }),
      sourceEntryId: "market-entry",
      sourceUrl: "/marketplace?page=2",
      destinationUrl: "/listing/listing-42",
      viewport: { scrollX: 0, scrollY: 4180 },
    })).toMatchObject({ railKey: null, railScrollLeft: null });
  });

  it("fails closed when a listing link is missing its stable card anchor", () => {
    expect(captureListingDeparture({
      target: fakeTarget({ withAnchor: false }),
      sourceEntryId: "market-entry",
      sourceUrl: "/marketplace",
      destinationUrl: "/listing/listing-42",
      viewport: { scrollX: 0, scrollY: 0 },
    })).toBeNull();
  });

  it("qualifies repeated listing IDs by their source collection", () => {
    expect(listingAnchorKey("browse:popular", "listing-42")).toBe("browse:popular:listing-42");
    expect(listingAnchorKey("browse:recommended", "listing-42")).toBe("browse:recommended:listing-42");
  });
});

const browsingSnapshot: ListingBrowsingSnapshot = {
  sourceEntryId: "browse-entry",
  sourceUrl: "/browse",
  listingId: "listing-42",
  anchorKey: "browse:recommended:listing-42",
  scrollX: 0,
  scrollY: 3853,
  anchorTop: 172,
  anchorLeft: 288,
  railKey: "browse:recommended",
  railScrollLeft: 420,
  createdAt: 1_000,
};

describe("listing browsing restoration", () => {
  it("returns the clicked anchor and horizontal rail to their saved viewport offsets", () => {
    const scrollByCalls: Array<[number, number]> = [];
    const rail = { scrollLeft: 0 };
    const result = applyBrowsingSnapshot(browsingSnapshot, {
      findAnchor: () => ({ getBoundingClientRect: () => ({ top: 552, left: 288 }) }),
      findRail: () => rail,
      scrollTo: () => { throw new Error("anchor restoration should not jump to a guessed document offset"); },
      scrollBy: (x, y) => scrollByCalls.push([x, y]),
    });

    expect(result).toEqual({ anchorFound: true, stable: false, verticalDelta: 380 });
    expect(scrollByCalls).toEqual([[0, 380]]);
    expect(rail.scrollLeft).toBe(420);
  });

  it("uses the saved document offset until asynchronously rendered listing content exists", () => {
    const scrollToCalls: Array<[number, number]> = [];
    const result = applyBrowsingSnapshot(browsingSnapshot, {
      findAnchor: () => null,
      findRail: () => null,
      scrollTo: (x, y) => scrollToCalls.push([x, y]),
      scrollBy: () => { throw new Error("missing anchors cannot be corrected relatively"); },
    });

    expect(result).toEqual({ anchorFound: false, stable: false, verticalDelta: null });
    expect(scrollToCalls).toEqual([[0, 3853]]);
  });

  it("stops correcting once the anchor is within one pixel of its saved position", () => {
    const result = applyBrowsingSnapshot(browsingSnapshot, {
      findAnchor: () => ({ getBoundingClientRect: () => ({ top: 172.5, left: 288 }) }),
      findRail: () => ({ scrollLeft: 420 }),
      scrollTo: () => undefined,
      scrollBy: () => { throw new Error("stable anchors should not move"); },
    });

    expect(result).toEqual({ anchorFound: true, stable: true, verticalDelta: 0.5 });
  });

  it("uses native Back only for a validated internal listing context", () => {
    expect(chooseListingBackAction({ sourceUrl: "/favorites", sourceEntryId: "favorites-entry" })).toBe("back");
    expect(chooseListingBackAction(null)).toBe("marketplace");
  });

  it("names the actual originating collection in the visible Back control", () => {
    expect(listingBackDestination("/marketplace?category=gaming-pcs&page=4")).toBe("Gaming PCs");
    expect(listingBackDestination("/search?q=RTX+4060")).toBe("Search Results");
    expect(listingBackDestination("/favorites")).toBe("Favorites");
    expect(listingBackDestination("/profile/pavlos")).toBe("Seller Profile");
    expect(listingBackDestination("/listing/related-id")).toBe("Previous Listing");
    expect(listingBackDestination("//untrusted.example/marketplace")).toBe("Marketplace");
  });
});
