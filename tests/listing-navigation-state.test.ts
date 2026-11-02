import { describe, expect, it } from "vitest";
import {
  activateListingEntry,
  calculateAnchorScrollDelta,
  readBrowsingSnapshot,
  readListingEntry,
  recordListingDeparture,
  type ListingNavigationStorage,
} from "../lib/listing-navigation-state";

class MemoryStorage implements ListingNavigationStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const departure = (storage: ListingNavigationStorage, overrides: Record<string, unknown> = {}) => ({
  storage,
  sourceEntryId: "source-entry",
  sourceUrl: "/search?q=RTX+4060&condition=used&sort=price-asc&page=2",
  destinationUrl: "/listing/listing-42",
  listingId: "listing-42",
  anchorKey: "search-results:listing-42",
  scrollX: 0,
  scrollY: 4180,
  anchorTop: 172,
  anchorLeft: 288,
  railKey: null,
  railScrollLeft: null,
  now: 1_000,
  ...overrides,
});

describe("listing navigation state", () => {
  it("activates a matching internal departure and restores the exact source entry", () => {
    const storage = new MemoryStorage();

    expect(recordListingDeparture(departure(storage))).toBe(true);
    expect(activateListingEntry({
      storage,
      destinationEntryId: "detail-entry",
      destinationUrl: "/listing/listing-42",
      now: 1_100,
    })).toEqual({
      sourceEntryId: "source-entry",
      sourceUrl: "/search?q=RTX+4060&condition=used&sort=price-asc&page=2",
      destinationUrl: "/listing/listing-42",
      listingId: "listing-42",
      createdAt: 1_000,
    });

    expect(readBrowsingSnapshot({
      storage,
      entryId: "source-entry",
      currentUrl: "/search?q=RTX+4060&condition=used&sort=price-asc&page=2",
      now: 1_200,
    })).toMatchObject({
      listingId: "listing-42",
      anchorKey: "search-results:listing-42",
      scrollY: 4180,
      anchorTop: 172,
    });
  });

  it("keeps an activated detail context available across forward navigation", () => {
    const storage = new MemoryStorage();
    recordListingDeparture(departure(storage));
    activateListingEntry({ storage, destinationEntryId: "detail-entry", destinationUrl: "/listing/listing-42", now: 1_100 });

    expect(readListingEntry({
      storage,
      destinationEntryId: "detail-entry",
      destinationUrl: "/listing/listing-42",
      now: 1_300,
    })?.sourceUrl).toBe("/search?q=RTX+4060&condition=used&sort=price-asc&page=2");
  });

  it("keeps separate snapshots when search-param history entries share a Next bfcache ID", () => {
    const storage = new MemoryStorage();
    recordListingDeparture(departure(storage, {
      sourceUrl: "/search?q=first",
      destinationUrl: "/listing/first",
      listingId: "first",
      anchorKey: "search:first",
    }));
    recordListingDeparture(departure(storage, {
      sourceUrl: "/search?q=second",
      destinationUrl: "/listing/second",
      listingId: "second",
      anchorKey: "search:second",
      now: 1_100,
    }));

    expect(readBrowsingSnapshot({ storage, entryId: "source-entry", currentUrl: "/search?q=first", now: 1_200 })?.listingId).toBe("first");
    expect(readBrowsingSnapshot({ storage, entryId: "source-entry", currentUrl: "/search?q=second", now: 1_200 })?.listingId).toBe("second");
  });

  it("rejects direct, mismatched, external, malformed, and expired contexts", () => {
    const storage = new MemoryStorage();

    expect(activateListingEntry({ storage, destinationEntryId: "direct", destinationUrl: "/listing/listing-42", now: 1_000 })).toBeNull();
    expect(recordListingDeparture(departure(storage, { sourceUrl: "https://evil.example/phish" }))).toBe(false);
    expect(recordListingDeparture(departure(storage, { destinationUrl: "//evil.example/listing/42" }))).toBe(false);
    expect(recordListingDeparture(departure(storage, { sourceEntryId: "" }))).toBe(false);

    recordListingDeparture(departure(storage));
    expect(activateListingEntry({ storage, destinationEntryId: "wrong", destinationUrl: "/listing/another", now: 1_100 })).toBeNull();

    recordListingDeparture(departure(storage));
    expect(activateListingEntry({ storage, destinationEntryId: "expired", destinationUrl: "/listing/listing-42", now: 1_000 + 30 * 60 * 1_000 + 1 })).toBeNull();
  });

  it("bounds stored history entries and evicts the oldest snapshots", () => {
    const storage = new MemoryStorage();

    for (let index = 0; index < 40; index += 1) {
      recordListingDeparture(departure(storage, {
        sourceEntryId: `source-${index}`,
        sourceUrl: `/marketplace?page=${index + 1}`,
        destinationUrl: `/listing/${index}`,
        listingId: `listing-${index}`,
        anchorKey: `marketplace:listing-${index}`,
        now: 1_000 + index,
      }));
    }

    expect(readBrowsingSnapshot({ storage, entryId: "source-0", currentUrl: "/marketplace?page=1", now: 2_000 })).toBeNull();
    expect(readBrowsingSnapshot({ storage, entryId: "source-39", currentUrl: "/marketplace?page=40", now: 2_000 })?.listingId).toBe("listing-39");
  });

  it("fails closed when session storage is unavailable", () => {
    const storage: ListingNavigationStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };

    expect(recordListingDeparture(departure(storage))).toBe(false);
    expect(activateListingEntry({ storage, destinationEntryId: "detail", destinationUrl: "/listing/listing-42", now: 1_100 })).toBeNull();
    expect(readBrowsingSnapshot({ storage, entryId: "source", currentUrl: "/marketplace", now: 1_100 })).toBeNull();
  });

  it("calculates the scroll correction that returns an anchor to its saved viewport offset", () => {
    expect(calculateAnchorScrollDelta({ currentTop: 552, savedTop: 172 })).toBe(380);
    expect(calculateAnchorScrollDelta({ currentTop: 90, savedTop: 172 })).toBe(-82);
  });
});
