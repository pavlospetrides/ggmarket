import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  assertApplyAuthorized,
  buildBackfillPlan,
  formatBackfillLog,
  parseBackfillArgs,
  summarizeBackfillBatch,
// @ts-expect-error The production backfill is intentionally a directly executable ESM CLI.
} from "../scripts/backfill-listing-image-variants.mjs";
// @ts-expect-error The capacity model is an executable ESM operations script.
import { modelMediaCapacity } from "../scripts/media-capacity-model.mjs";

const row = {
  id: "33333333-3333-4333-8333-333333333333",
  storage_path: "owner/listing/legacy.jpg",
  card_path: null,
  detail_path: null,
  listing: {
    id: "22222222-2222-4222-8222-222222222222",
    seller_id: "11111111-1111-4111-8111-111111111111",
  },
};

describe("legacy media backfill guards", () => {
  it("defaults to a bounded dry run and rejects batches above 100", () => {
    expect(parseBackfillArgs([])).toMatchObject({ apply: false, batchSize: 25, cursor: null });
    expect(parseBackfillArgs(["--batch-size", "100"]).batchSize).toBe(100);
    expect(() => parseBackfillArgs(["--batch-size", "101"])).toThrow("between 1 and 100");
    expect(() => parseBackfillArgs(["--batch-size", "0"])).toThrow("between 1 and 100");
  });

  it("requires apply plus an exact project-ref confirmation", () => {
    const url = "https://projectref123.supabase.co";
    expect(() => assertApplyAuthorized({ apply: true, confirmProjectRef: null }, url)).toThrow("--confirm-project-ref");
    expect(() => assertApplyAuthorized({ apply: true, confirmProjectRef: "wrong" }, url)).toThrow("does not match");
    expect(assertApplyAuthorized({ apply: true, confirmProjectRef: "projectref123" }, url)).toBe("projectref123");
    expect(assertApplyAuthorized({ apply: false, confirmProjectRef: null }, undefined)).toBeNull();
  });

  it("skips completed rows and plans only missing deterministic variants", () => {
    expect(buildBackfillPlan([{ ...row, card_path: "card.webp", detail_path: "detail.webp" }])).toEqual([]);
    const partialRow = { ...row, card_path: "existing-card.webp" };
    expect(buildBackfillPlan([partialRow])).toEqual([{
      row: partialRow,
      paths: {
        card: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/card.webp",
        detail: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/detail.webp",
      },
      missing: ["detail"],
    }]);
  });

  it("logs exact object paths without leaking credentials or signed URLs", () => {
    const plan = buildBackfillPlan([row])[0];
    const output = formatBackfillLog("planned", plan);

    expect(output).toContain(plan.paths.card);
    expect(output).toContain(plan.paths.detail);
    expect(output).not.toMatch(/token=|service.role|secret|supabase\.co\/storage\/v1\/object\/sign/i);
  });

  it("counts every inspected candidate and exposes the exact resume cursor", () => {
    const complete = { ...row, card_path: "card.webp", detail_path: "detail.webp" };

    expect(summarizeBackfillBatch([complete], [])).toEqual({
      inspected: 1,
      planned: 0,
      applied: 0,
      failed: 0,
      nextCursor: row.id,
    });
  });

  it("offers credential-free help without contacting Supabase", () => {
    const output = execFileSync(process.execPath, ["scripts/backfill-listing-image-variants.mjs", "--help"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: { NODE_ENV: "test" },
    });
    expect(output).toContain("Dry-run is the default");
    expect(output).not.toMatch(/token=|service.role|secret/i);
  });

  it("rejects apply without project confirmation before reading credentials", () => {
    expect(() => execFileSync(process.execPath, ["scripts/backfill-listing-image-variants.mjs", "--apply"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: { NODE_ENV: "test" },
      stdio: "pipe",
    })).toThrow(expect.objectContaining({ stderr: expect.stringContaining("--confirm-project-ref") }));
  });
});

describe("media capacity model", () => {
  it.each([
    [10_000, 150_000, 44.5, 44.2, 6_000, 25],
    [50_000, 750_000, 222.5, 221, 30_000, 27.61],
    [100_000, 1_500_000, 445, 442, 60_000, 38.11],
  ])("models %i listings with reproducible storage and Pro-plan estimates", (listings, objects, storageGb, egressGb, monthlyChangedImages, monthlyUsd) => {
    expect(modelMediaCapacity(listings)).toMatchObject({
      listings,
      sourceImages: listings * 5,
      storedObjects: objects,
      storageGb,
      estimatedMonthlyCachedEgressGb: egressGb,
      monthlyNewOrReplacementImages: monthlyChangedImages,
      estimatedSupabaseProMonthlyUsd: monthlyUsd,
    });
  });
});
