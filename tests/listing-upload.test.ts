import { describe, expect, it, vi } from "vitest";
import {
  ListingUploadError,
  aggregateUploadProgress,
  isTransientUploadStatus,
  moveOrderedItem,
  retryListingUpload,
  selectListingPhotoFiles,
} from "../lib/listing-upload";

describe("listing upload retry", () => {
  it.each([408, 425, 429, 500, 503])("classifies HTTP %i as transient", (status) => {
    expect(isTransientUploadStatus(status)).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 413, 422])("does not retry HTTP %i", (status) => {
    expect(isTransientUploadStatus(status)).toBe(false);
  });

  it("retries transient failures with bounded backoff and returns the successful result", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new ListingUploadError("busy", 503))
      .mockRejectedValueOnce(new ListingUploadError("busy", 429))
      .mockResolvedValue("uploaded");
    const delays: number[] = [];

    await expect(retryListingUpload(operation, {
      maxAttempts: 3,
      delay: async (milliseconds) => { delays.push(milliseconds); },
    })).resolves.toBe("uploaded");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([250, 500]);
  });

  it("propagates cancellation without another attempt", async () => {
    const controller = new AbortController();
    const operation = vi.fn(async () => {
      controller.abort();
      throw new DOMException("Cancelled", "AbortError");
    });

    await expect(retryListingUpload(operation, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("does not replay an ambiguous network failure with an unknown server outcome", async () => {
    const operation = vi.fn().mockRejectedValue(new TypeError("network interrupted"));

    await expect(retryListingUpload(operation, {
      delay: async () => undefined,
    })).rejects.toThrow("network interrupted");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe("listing photo selection and progress", () => {
  it("rejects oversized, unsupported, and over-count files before upload", () => {
    const valid = new File([new Uint8Array(10)], "valid.jpg", { type: "image/jpeg" });
    const oversized = new File([new Uint8Array(10_485_761)], "huge.png", { type: "image/png" });
    const svg = new File(["<svg/>"], "active.svg", { type: "image/svg+xml" });

    const result = selectListingPhotoFiles(7, [valid, oversized, svg, valid]);

    expect(result.accepted).toEqual([valid]);
    expect(result.rejected).toEqual([
      { file: oversized, reason: "size" },
      { file: svg, reason: "type" },
      { file: valid, reason: "count" },
    ]);
  });

  it("aggregates per-file progress without exceeding the valid percentage range", () => {
    expect(aggregateUploadProgress([100, 50, 0])).toBe(50);
    expect(aggregateUploadProgress([120, -10])).toBe(50);
    expect(aggregateUploadProgress([])).toBe(0);
  });

  it("moves one photo while preserving stable order and the original array", () => {
    const original = ["one", "two", "three"];

    expect(moveOrderedItem(original, 2, 0)).toEqual(["three", "one", "two"]);
    expect(moveOrderedItem(original, 0, -1)).toEqual(original);
    expect(original).toEqual(["one", "two", "three"]);
  });
});
