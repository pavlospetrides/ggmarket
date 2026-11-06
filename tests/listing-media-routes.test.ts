import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ProcessedListingImage } from "../lib/listing-media";
import {
  ListingMediaStorageError,
  listingImageObjectPaths,
  uploadListingImageArtifacts,
} from "../lib/listing-media-storage";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const processed: ProcessedListingImage = {
  mimeType: "image/webp",
  extension: "webp",
  original: { bytes: new Uint8Array([1]), width: 1200, height: 800, byteSize: 1000 },
  detail: { bytes: new Uint8Array([2]), width: 1200, height: 800, byteSize: 700 },
  card: { bytes: new Uint8Array([3]), width: 640, height: 427, byteSize: 200 },
};
const paths = {
  original: "owner/listing/image/original.webp",
  detail: "owner/listing/image/detail.webp",
  card: "owner/listing/image/card.webp",
};

describe("trusted listing media storage", () => {
  it("uploads every immutable artifact with private bounded caching", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));

    await expect(uploadListingImageArtifacts({ upload, remove }, paths, processed)).resolves.toEqual([
      paths.original,
      paths.detail,
      paths.card,
    ]);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload).toHaveBeenNthCalledWith(1, paths.original, processed.original.bytes, {
      contentType: "image/webp",
      cacheControl: "300",
      upsert: true,
    });
  });

  it("keeps deterministic partial artifacts for retry instead of deleting a concurrent winner", async () => {
    const upload = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "temporary storage failure" } });
    const remove = vi.fn(async () => ({ error: null }));

    const error = await uploadListingImageArtifacts({ upload, remove }, paths, processed).catch((reason) => reason);

    expect(error).toBeInstanceOf(ListingMediaStorageError);
    expect(error.cleanupPending).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it("treats the first failed upload result as ambiguous and repairable", async () => {
    const upload = vi.fn().mockResolvedValueOnce({ error: { message: "ambiguous storage failure" } });
    const remove = vi.fn(async () => ({ error: null }));

    const error = await uploadListingImageArtifacts({ upload, remove }, paths, processed).catch((reason) => reason);

    expect(error).toBeInstanceOf(ListingMediaStorageError);
    expect(error.cleanupPending).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it("deduplicates only database-recorded original and variant paths", () => {
    expect(listingImageObjectPaths({
      storage_path: "a/original.webp",
      card_path: "a/card.webp",
      detail_path: "a/detail.webp",
    })).toEqual(["a/original.webp", "a/card.webp", "a/detail.webp"]);
    expect(listingImageObjectPaths({
      storage_path: "legacy.jpg",
      card_path: null,
      detail_path: "legacy.jpg",
    })).toEqual(["legacy.jpg"]);
  });
});

describe("listing media route contracts", () => {
  it("records generated variant metadata only after artifact upload", () => {
    const source = read("app/api/listings/[id]/images/route.ts");
    const upload = source.indexOf("uploadListingImageArtifacts");
    const insert = source.indexOf(".insert({");

    expect(source).toContain("processListingImage");
    expect(source).toContain("buildListingImagePaths(user.id, id, imageId)");
    expect(source).toContain("card_path: paths.card");
    expect(source).toContain("detail_path: paths.detail");
    expect(source).toContain("media_version: 2");
    expect(upload).toBeGreaterThanOrEqual(0);
    expect(insert).toBeGreaterThan(upload);
    expect(source).toContain("await bucket.remove(createdPaths)");
    expect(source).toContain("Listing image upload cleanup pending");
  });

  it("reuses a validated client upload id before decoding or storing a retry", () => {
    const source = read("app/api/listings/[id]/images/route.ts");
    const retryLookup = source.indexOf("existingImage");
    const processing = source.indexOf("await processListingImage");

    expect(source).toContain('form?.get("uploadId")');
    expect(source).toContain('.eq("id", imageId)');
    expect(source).toContain("existingImage.listing_id === id && existingImage.sort_order === sortOrder");
    expect(source).toContain("Upload identifier conflict.");
    expect(source).toContain("racedImage");
    expect(retryLookup).toBeGreaterThanOrEqual(0);
    expect(retryLookup).toBeLessThan(processing);
  });

  it("deletes every exact recorded path through the trusted admin boundary", () => {
    const imageDelete = read("app/api/listing-images/[id]/route.ts");
    const listingDelete = read("app/api/listings/[id]/route.ts");

    for (const source of [imageDelete, listingDelete]) {
      expect(source).toContain("card_path");
      expect(source).toContain("detail_path");
      expect(source).toContain("listingImageObjectPaths");
      expect(source).toContain("createAdminClient");
    }
    expect(imageDelete).not.toContain("request.json()");
    expect(listingDelete).not.toContain("request.json()");
  });
});
