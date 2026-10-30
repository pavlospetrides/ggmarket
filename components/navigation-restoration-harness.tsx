"use client";

import { useEffect, useState } from "react";
import {
  BrowsingStateRestorer,
  ListingNavigationLink,
} from "./listing-navigation";
import { listingAnchorKey } from "@/lib/listing-navigation";

export function NavigationRestorationHarness({
  source,
  listingIds,
  browsingState,
}: {
  source: string;
  listingIds: number[];
  browsingState: string;
}) {
  const [lateLayoutReady, setLateLayoutReady] = useState(false);
  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setLateLayoutReady(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, []);

  const navigationContext = `harness:${source}`;
  return (
    <main className="container-page min-w-0 py-8">
      <BrowsingStateRestorer />
      <h1 className="text-3xl font-bold">{source.replaceAll("-", " ")} navigation harness</h1>
      <p data-testid="browsing-state" className="mt-3 text-[var(--text-secondary)]">{browsingState}</p>
      <p data-testid="loaded-result-count" className="mt-2 font-bold">{listingIds.length} loaded results</p>
      <div
        data-testid="late-layout-region"
        aria-hidden="true"
        className="transition-none"
        style={{ height: lateLayoutReady ? 640 : 1 }}
      />
      <section aria-label={`${source} listings`}>
        <div
          data-testid="listing-rail"
          data-listing-scroll-container={navigationContext}
          className="flex snap-x gap-4 overflow-x-auto pb-5"
        >
          {listingIds.map((listingId) => (
            <article
              key={listingId}
              aria-label={`Listing ${listingId}`}
              data-listing-id={`listing-${listingId}`}
              data-listing-anchor={listingAnchorKey(navigationContext, `listing-${listingId}`)}
              className="card min-h-52 w-64 shrink-0 snap-start p-5"
            >
              <p className="text-sm text-[var(--muted)]">Synthetic asynchronous result</p>
              <h2 className="mt-3 text-xl font-bold">Listing {listingId}</h2>
              <ListingNavigationLink
                href={`/test-harness/navigation/listing/${listingId}`}
                className="btn-primary mt-16 w-full"
              >
                Open Listing {listingId}
              </ListingNavigationLink>
            </article>
          ))}
        </div>
      </section>
      <div className="h-[70vh]" aria-hidden="true" />
    </main>
  );
}
