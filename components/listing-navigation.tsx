"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import {
  activateListingEntry,
  calculateAnchorScrollDelta,
  readBrowsingSnapshot,
  readListingEntry,
  recordListingDeparture,
  type ListingBrowsingSnapshot,
  type ListingNavigationContext,
} from "../lib/listing-navigation-state";

type ListingNavigationLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

type DepartureCapture = {
  sourceEntryId: string;
  sourceUrl: string;
  destinationUrl: string;
  listingId: string;
  anchorKey: string;
  scrollX: number;
  scrollY: number;
  anchorTop: number;
  anchorLeft: number;
  railKey: string | null;
  railScrollLeft: number | null;
};

export function listingAnchorKey(context: string, listingId: string) {
  return `${context}:${listingId}`;
}

export function captureListingDeparture({
  target,
  sourceEntryId,
  sourceUrl,
  destinationUrl,
  viewport,
}: {
  target: HTMLElement;
  sourceEntryId: string;
  sourceUrl: string;
  destinationUrl: string;
  viewport: { scrollX: number; scrollY: number };
}): DepartureCapture | null {
  const anchor = target.closest<HTMLElement>("[data-listing-anchor]");
  const anchorKey = anchor?.getAttribute("data-listing-anchor");
  const listingId = anchor?.getAttribute("data-listing-id");
  if (!anchor || !anchorKey || !listingId) return null;
  const rect = anchor.getBoundingClientRect();
  const rail = anchor.closest<HTMLElement>("[data-listing-scroll-container]");
  const railKey = rail?.getAttribute("data-listing-scroll-container") ?? null;
  return {
    sourceEntryId,
    sourceUrl,
    destinationUrl,
    listingId,
    anchorKey,
    scrollX: viewport.scrollX,
    scrollY: viewport.scrollY,
    anchorTop: rect.top,
    anchorLeft: rect.left,
    railKey,
    railScrollLeft: railKey ? rail?.scrollLeft ?? null : null,
  };
}

export function ListingNavigationLink({ href, onNavigate, ...props }: ListingNavigationLinkProps) {
  const { bfcacheId } = useRouter();
  const anchorRef = useRef<HTMLAnchorElement>(null);
  return (
    <Link
      {...props}
      href={href}
      ref={anchorRef}
      onNavigate={(event) => {
        if (!anchorRef.current) return onNavigate?.(event);
        const departure = captureListingDeparture({
          target: anchorRef.current,
          sourceEntryId: bfcacheId,
          sourceUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
          destinationUrl: href,
          viewport: { scrollX: window.scrollX, scrollY: window.scrollY },
        });
        if (departure) recordListingDeparture({ storage: window.sessionStorage, ...departure });
        onNavigate?.(event);
      }}
    />
  );
}

type BrowsingEnvironment = {
  findAnchor: (key: string) => { getBoundingClientRect: () => { top: number; left: number } } | null;
  findRail: (key: string) => { scrollLeft: number } | null;
  scrollTo: (x: number, y: number) => void;
  scrollBy: (x: number, y: number) => void;
};

export function applyBrowsingSnapshot(snapshot: ListingBrowsingSnapshot, environment: BrowsingEnvironment) {
  if (snapshot.railKey && snapshot.railScrollLeft !== null) {
    const rail = environment.findRail(snapshot.railKey);
    if (rail) rail.scrollLeft = snapshot.railScrollLeft;
  }
  const anchor = environment.findAnchor(snapshot.anchorKey);
  if (!anchor) {
    environment.scrollTo(snapshot.scrollX, snapshot.scrollY);
    return { anchorFound: false, stable: false, verticalDelta: null };
  }
  const verticalDelta = calculateAnchorScrollDelta({
    currentTop: anchor.getBoundingClientRect().top,
    savedTop: snapshot.anchorTop,
  });
  const stable = Math.abs(verticalDelta) <= 1;
  if (!stable) environment.scrollBy(0, verticalDelta);
  return { anchorFound: true, stable, verticalDelta };
}

function findDataElement(attribute: "data-listing-anchor" | "data-listing-scroll-container", value: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`))
    .find((element) => element.getAttribute(attribute) === value) ?? null;
}

export function BrowsingStateRestorer() {
  const { bfcacheId } = useRouter();
  useLayoutEffect(() => {
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const snapshot = readBrowsingSnapshot({
      storage: window.sessionStorage,
      entryId: bfcacheId,
      currentUrl,
    });
    if (!snapshot) return;

    let frame = 0;
    let attempts = 0;
    let stableFrames = 0;
    let stopped = false;
    const environment: BrowsingEnvironment = {
      findAnchor: (key) => findDataElement("data-listing-anchor", key),
      findRail: (key) => findDataElement("data-listing-scroll-container", key),
      scrollTo: (x, y) => window.scrollTo(x, y),
      scrollBy: (x, y) => window.scrollBy(x, y),
    };
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const schedule = () => {
      if (!stopped && !frame) frame = window.requestAnimationFrame(correct);
    };
    const correct = () => {
      frame = 0;
      attempts += 1;
      const result = applyBrowsingSnapshot(snapshot, environment);
      stableFrames = result.stable ? stableFrames + 1 : 0;
      const resourcesReady = Array.from(document.images).every((image) => image.complete);
      if (attempts < 180 && (stableFrames < 4 || !resourcesReady)) schedule();
      else {
        stopped = true;
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
      }
    };

    applyBrowsingSnapshot(snapshot, environment);
    resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      stableFrames = 0;
      schedule();
    });
    resizeObserver?.observe(document.body);
    mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
      stableFrames = 0;
      schedule();
    });
    mutationObserver?.observe(document.body, { childList: true, subtree: true });
    void document.fonts?.ready.then(() => {
      stableFrames = 0;
      schedule();
    });
    schedule();

    return () => {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [bfcacheId]);
  return null;
}

export function chooseListingBackAction(context: Pick<ListingNavigationContext, "sourceEntryId" | "sourceUrl"> | null) {
  return context ? "back" : "marketplace";
}

function titleCaseSource(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => ({ pc: "PC", pcs: "PCs", cpu: "CPU", gpu: "GPU", vr: "VR" })[word.toLowerCase()] ?? `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function listingBackDestination(sourceUrl: string) {
  if (!sourceUrl.startsWith("/") || sourceUrl.startsWith("//") || sourceUrl.includes("\\")) return "Marketplace";
  const url = new URL(sourceUrl, "https://ggmarket.invalid");
  const pathname = url.pathname;
  const isRoute = (route: string) => pathname === `/${route}` || pathname.endsWith(`/${route}`);
  if (isRoute("favorites")) return "Favorites";
  if (isRoute("browse")) return "Browse";
  if (isRoute("search")) return "Search Results";
  if (isRoute("saved-searches")) return "Saved Searches";
  if (isRoute("recently-viewed")) return "Recently Viewed";
  if (pathname.startsWith("/profile") || isRoute("profile")) return "Seller Profile";
  if (pathname.startsWith("/listing/")) return "Previous Listing";
  if (pathname === "/") return "Home";
  const category = url.searchParams.get("category");
  if (isRoute("marketplace") && category && category !== "all") return titleCaseSource(category);
  return "Marketplace";
}

function resolveListingContext(destinationEntryId: string) {
  const destinationUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return activateListingEntry({
    storage: window.sessionStorage,
    destinationEntryId,
    destinationUrl,
  }) ?? readListingEntry({
    storage: window.sessionStorage,
    destinationEntryId,
    destinationUrl,
  });
}

export function ListingBackButton() {
  const router = useRouter();
  const [context, setContext] = useState<ListingNavigationContext | null>(null);
  useLayoutEffect(() => {
    // Session storage is external history state; resolve it before paint so the label does not shift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContext(resolveListingContext(router.bfcacheId));
  }, [router.bfcacheId]);

  const destination = context ? listingBackDestination(context.sourceUrl) : "Marketplace";
  return (
    <button
      type="button"
      className="-ml-3 inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-start gap-2 px-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--primary-hover)] focus-visible:rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-hover)]"
      aria-label={`Back to ${destination}`}
      onClick={() => {
        const currentContext = context ?? resolveListingContext(router.bfcacheId);
        if (chooseListingBackAction(currentContext) === "back") router.back();
        else router.replace("/marketplace");
      }}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      <span>Back to {destination}</span>
    </button>
  );
}
