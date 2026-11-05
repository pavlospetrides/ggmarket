import sharp, { type OutputInfo } from "sharp";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INPUT_BYTES = 10_485_760;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_DIMENSION = 12_000;
const SUPPORTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ListingImagePurpose = "card" | "detail" | "original";
export type ListingImagePathRecord = {
  storage_path: string;
  card_path?: string | null;
  detail_path?: string | null;
};

export type ListingImageArtifact = {
  bytes: Uint8Array;
  width: number;
  height: number;
  byteSize: number;
};

export type ProcessedListingImage = {
  mimeType: "image/webp";
  extension: "webp";
  original: ListingImageArtifact;
  card: ListingImageArtifact;
  detail: ListingImageArtifact;
};

export function selectListingImagePath(
  record: ListingImagePathRecord,
  purpose: ListingImagePurpose,
): string {
  if (purpose === "card") return record.card_path || record.storage_path;
  if (purpose === "detail") return record.detail_path || record.storage_path;
  return record.storage_path;
}

export function buildListingImagePaths(ownerId: string, listingId: string, imageId: string) {
  if (![ownerId, listingId, imageId].every((value) => UUID.test(value))) {
    throw new Error("Invalid media path identifier.");
  }
  const prefix = `${ownerId}/${listingId}/${imageId}`;
  return {
    original: `${prefix}/original.webp`,
    card: `${prefix}/card.webp`,
    detail: `${prefix}/detail.webp`,
  } as const;
}

function artifact(data: Buffer, info: OutputInfo): ListingImageArtifact {
  if (!info.width || !info.height || data.byteLength === 0) throw new Error("empty image");
  return {
    bytes: data,
    width: info.width,
    height: info.height,
    byteSize: data.byteLength,
  };
}

async function renderVariant(
  input: Uint8Array,
  maximumDimension: number,
  quality: number,
): Promise<ListingImageArtifact> {
  const { data, info } = await sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
    animated: false,
  })
    .rotate()
    .resize({
      width: maximumDimension,
      height: maximumDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return artifact(data, info);
}

export async function processListingImage(input: Uint8Array): Promise<ProcessedListingImage> {
  try {
    if (!input.byteLength || input.byteLength > MAX_INPUT_BYTES) throw new Error("invalid byte length");
    const metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
      animated: true,
    }).metadata();
    if (
      !metadata.format ||
      !SUPPORTED_FORMATS.has(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_INPUT_DIMENSION ||
      metadata.height > MAX_INPUT_DIMENSION ||
      metadata.width * metadata.height > MAX_INPUT_PIXELS ||
      (metadata.pages ?? 1) !== 1
    ) {
      throw new Error("unsupported image");
    }

    // Sequential rendering prevents three large decoded pixel buffers from
    // competing for memory inside one serverless invocation.
    const original = await renderVariant(input, 2560, 86);
    const detail = await renderVariant(input, 1600, 82);
    const card = await renderVariant(input, 640, 78);
    return { mimeType: "image/webp", extension: "webp", original, card, detail };
  } catch {
    throw new Error("Upload a valid image file.");
  }
}
