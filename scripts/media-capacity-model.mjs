#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export const MEDIA_CAPACITY_ASSUMPTIONS = Object.freeze({
  imagesPerListing: 5,
  variantsPerImage: 3,
  averageCardKb: 70,
  averageDetailKb: 220,
  averageOriginalKb: 600,
  monthlyCardImpressionsPerListing: 50,
  monthlyDetailViewsPerListing: 5,
  detailImagesPerView: 3,
  browserCacheHitRate: 0.35,
  monthlyNewListingRate: 0.10,
  monthlyReplacementImageRate: 0.02,
  supabaseProBaseUsd: 25,
  includedStorageGb: 100,
  storageOverageUsdPerGb: 0.0213,
  includedCachedEgressGb: 250,
  cachedEgressOverageUsdPerGb: 0.03,
});

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function modelMediaCapacity(listings, assumptions = MEDIA_CAPACITY_ASSUMPTIONS) {
  if (!Number.isInteger(listings) || listings < 1) throw new Error("Listings must be a positive integer.");
  const sourceImages = listings * assumptions.imagesPerListing;
  const storedObjects = sourceImages * assumptions.variantsPerImage;
  const averageStoredKb = assumptions.averageCardKb + assumptions.averageDetailKb + assumptions.averageOriginalKb;
  const storageGb = round((sourceImages * averageStoredKb) / 1_000_000);
  const uncachedDeliveryKb = listings * (
    assumptions.monthlyCardImpressionsPerListing * assumptions.averageCardKb
    + assumptions.monthlyDetailViewsPerListing * assumptions.detailImagesPerView * assumptions.averageDetailKb
  );
  const estimatedMonthlyCachedEgressGb = round(
    (uncachedDeliveryKb / 1_000_000) * (1 - assumptions.browserCacheHitRate),
  );
  const storageOverageUsd = Math.max(0, storageGb - assumptions.includedStorageGb) * assumptions.storageOverageUsdPerGb;
  const egressOverageUsd = Math.max(0, estimatedMonthlyCachedEgressGb - assumptions.includedCachedEgressGb) * assumptions.cachedEgressOverageUsdPerGb;
  const monthlyNewListingImages = Math.ceil(listings * assumptions.monthlyNewListingRate) * assumptions.imagesPerListing;
  const monthlyReplacementImages = Math.ceil(sourceImages * assumptions.monthlyReplacementImageRate);

  return {
    listings,
    sourceImages,
    storedObjects,
    storageGb,
    estimatedMonthlyCachedEgressGb,
    monthlyNewOrReplacementImages: monthlyNewListingImages + monthlyReplacementImages,
    estimatedStorageOverageUsd: round(storageOverageUsd),
    estimatedCachedEgressOverageUsd: round(egressOverageUsd),
    estimatedSupabaseProMonthlyUsd: round(assumptions.supabaseProBaseUsd + storageOverageUsd + egressOverageUsd),
  };
}

export function modelR2ImageCapacity(sourceImages) {
  if (!Number.isInteger(sourceImages) || sourceImages < 1) throw new Error("Images must be a positive integer.");
  const storageGb = round(sourceImages * 890 / 1_000_000);
  const monthlyClassAWrites = Math.ceil(sourceImages * 0.12) * 3;
  const monthlyClassBReads = Math.ceil(sourceImages / 5 * 65 * 0.65);
  // Standard prices verified 2026-11-12. Free allowances are shared per account;
  // assume unused elsewhere and round billable units up as Cloudflare documents.
  const storageUsd = Math.ceil(Math.max(0, storageGb - 10)) * 0.015;
  const classAUsd = Math.ceil(Math.max(0, monthlyClassAWrites - 1_000_000) / 1_000_000) * 4.5;
  const classBUsd = Math.ceil(Math.max(0, monthlyClassBReads - 10_000_000) / 1_000_000) * 0.36;
  return { sourceImages, storedObjects: sourceImages * 3, storageGb, monthlyClassAWrites, monthlyClassBReads, initialUploadClassA: sourceImages * 3, backfillClassBUpperBound: sourceImages * 9, estimatedMonthlyR2Usd: round(storageUsd + classAUsd + classBUsd) };
}

export function buildMediaCapacityReport(listingCounts = [10_000, 50_000, 100_000]) {
  return {
    generatedAt: new Date().toISOString(),
    units: { storage: "decimal GB", sizes: "decimal KB", currency: "USD" },
    assumptions: MEDIA_CAPACITY_ASSUMPTIONS,
    scenarios: listingCounts.map((listings) => modelMediaCapacity(listings)),
    r2ImageScenarios: [10_000, 50_000, 100_000].map(modelR2ImageCapacity),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(buildMediaCapacityReport(), null, 2));
}
