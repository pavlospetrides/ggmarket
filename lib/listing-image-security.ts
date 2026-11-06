import { processListingImage } from "./listing-media";

export type NormalizedListingImage = {
  bytes: Uint8Array;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
};

export async function normalizeListingImage(input: Uint8Array): Promise<NormalizedListingImage> {
  const processed = await processListingImage(input);
  return {
    bytes: processed.original.bytes,
    contentType: processed.mimeType,
    extension: processed.extension,
    width: processed.original.width,
    height: processed.original.height,
  };
}
