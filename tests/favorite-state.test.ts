import { describe, expect, it, vi } from "vitest";
import { createFavoriteStore } from "../lib/favorite-state";

describe("favorite state coordination", () => {
  const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("reconciles a changed server value after an App Router refresh", () => {
    const store = createFavoriteStore();
    expect(store.getSnapshot(accountA, "listing-1", false).active).toBe(false);

    store.syncFromServer(accountA, "listing-1", true);

    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({
      active: true,
      busy: false,
      error: "",
    });
  });

  it("notifies every mounted control for the same listing", () => {
    const store = createFavoriteStore();
    const first = vi.fn();
    const second = vi.fn();
    store.getSnapshot(accountA, "listing-1", false);
    store.subscribe(accountA, "listing-1", first);
    store.subscribe(accountA, "listing-1", second);

    const operation = store.beginToggle(accountA, "listing-1", false);

    expect(operation).toEqual({ previous: false, next: true });
    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({ active: true, busy: true });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("serializes rapid activation while a write is in flight", () => {
    const store = createFavoriteStore();
    store.getSnapshot(accountA, "listing-1", false);

    expect(store.beginToggle(accountA, "listing-1", false)).toEqual({ previous: false, next: true });
    expect(store.beginToggle(accountA, "listing-1", true)).toBeNull();
    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({ active: false, busy: true });

    expect(store.confirm(accountA, "listing-1", true)).toEqual({ previous: true, next: false });
    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({ active: false, busy: true });
    expect(store.confirm(accountA, "listing-1", false)).toBeNull();
    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({ active: false, busy: false });
  });

  it("uses the server-confirmed value after success", () => {
    const store = createFavoriteStore();
    store.beginToggle(accountA, "listing-1", false);

    store.confirm(accountA, "listing-1", true);

    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({
      active: true,
      busy: false,
      error: "",
    });
  });

  it("rolls every control back and exposes the request error", () => {
    const store = createFavoriteStore();
    store.beginToggle(accountA, "listing-1", false);

    store.rollback(accountA, "listing-1", false, "The listing could not be saved.");

    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({
      active: false,
      busy: false,
      error: "The listing could not be saved.",
    });
  });

  it("does not let a server refresh overwrite an in-flight optimistic value", () => {
    const store = createFavoriteStore();
    store.beginToggle(accountA, "listing-1", false);

    store.syncFromServer(accountA, "listing-1", false);

    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({ active: true, busy: true });
  });

  it("isolates the same listing ID between two authenticated viewers", () => {
    const store = createFavoriteStore();

    store.beginToggle(accountA, "listing-1", false);
    store.confirm(accountA, "listing-1", true);

    expect(store.getSnapshot(accountA, "listing-1", false).active).toBe(true);
    expect(store.getSnapshot(accountB, "listing-1", false).active).toBe(false);
  });

  it("keeps rollback and queued intent inside the originating account", () => {
    const store = createFavoriteStore();
    store.beginToggle(accountA, "listing-1", false);
    store.beginToggle(accountA, "listing-1", true);
    store.beginToggle(accountB, "listing-1", false);

    store.rollback(accountA, "listing-1", false, "Account A failed");

    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({
      active: false,
      busy: false,
      error: "Account A failed",
    });
    expect(store.getSnapshot(accountB, "listing-1", false)).toMatchObject({
      active: true,
      busy: true,
      error: "",
    });
  });

  it("does not let a delayed Account A confirmation overwrite Account B", () => {
    const store = createFavoriteStore();
    store.beginToggle(accountA, "listing-1", false);
    store.syncFromServer(accountB, "listing-1", false);

    store.confirm(accountA, "listing-1", true);

    expect(store.getSnapshot(accountA, "listing-1", false)).toMatchObject({ active: true, busy: false });
    expect(store.getSnapshot(accountB, "listing-1", false)).toMatchObject({ active: false, busy: false });
  });
});
