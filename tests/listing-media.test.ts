import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildListingImagePaths,
  processListingImage,
  selectListingImagePath,
} from "../lib/listing-media";

const ownerId = "e1696070-43bf-419f-a6a1-283af14781b3";
const listingId = "0ceb610b-e443-4ba8-892c-32c319c9659c";
const imageId = "3112388d-cfe5-4a7c-a334-e3c1854cd410";

describe("listing image variant selection", () => {
  const complete = {
    storage_path: `${ownerId}/${listingId}/${imageId}/original.webp`,
    card_path: `${ownerId}/${listingId}/${imageId}/card.webp`,
    detail_path: `${ownerId}/${listingId}/${imageId}/detail.webp`,
  };

  it.each([
    ["card", complete.card_path],
    ["detail", complete.detail_path],
    ["original", complete.storage_path],
  ] as const)("selects the exact %s artifact", (purpose, expected) => {
    expect(selectListingImagePath(complete, purpose)).toBe(expected);
  });

  it("falls back to the authorized legacy original when variants are absent", () => {
    const legacy = { storage_path: "seller/listing/legacy.jpg", card_path: null, detail_path: null };

    expect(selectListingImagePath(legacy, "card")).toBe(legacy.storage_path);
    expect(selectListingImagePath(legacy, "detail")).toBe(legacy.storage_path);
  });

  it("builds immutable paths only from UUID ownership identifiers", () => {
    expect(buildListingImagePaths(ownerId, listingId, imageId)).toEqual({
      original: `${ownerId}/${listingId}/${imageId}/original.webp`,
      card: `${ownerId}/${listingId}/${imageId}/card.webp`,
      detail: `${ownerId}/${listingId}/${imageId}/detail.webp`,
    });
    expect(() => buildListingImagePaths("../other-user", listingId, imageId)).toThrow("Invalid media path identifier");
  });
});

describe("listing image processing", () => {
  it.each(["jpeg", "png", "webp"] as const)("accepts real %s bytes and emits WebP", async (format) => {
    const input = await sharp({
      create: { width: 32, height: 20, channels: 4, background: { r: 25, g: 50, b: 75, alpha: 0.5 } },
    })[format]().toBuffer();

    const result = await processListingImage(input);

    expect(result.mimeType).toBe("image/webp");
    expect(result.original.bytes.byteLength).toBeGreaterThan(0);
    expect(result.card.bytes.byteLength).toBeGreaterThan(0);
    expect(result.detail.bytes.byteLength).toBeGreaterThan(0);
  });

  it("produces bounded contain variants without enlargement", async () => {
    const input = await sharp({
      create: { width: 3000, height: 1800, channels: 3, background: "#7158e2" },
    }).jpeg({ quality: 95 }).toBuffer();

    const result = await processListingImage(input);

    expect([result.card.width, result.card.height]).toEqual([640, 384]);
    expect([result.detail.width, result.detail.height]).toEqual([1600, 960]);
    expect([result.original.width, result.original.height]).toEqual([2560, 1536]);
  });

  it("rejects spoofed bytes, SVG markup, and animated or unsupported media", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>1</script></svg>');
    const animatedGif = Uint8Array.from(Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      "base64",
    ));

    await expect(processListingImage(new TextEncoder().encode("not an image"))).rejects.toThrow("valid image");
    await expect(processListingImage(svg)).rejects.toThrow("valid image");
    await expect(processListingImage(animatedGif)).rejects.toThrow("valid image");
  });
});
