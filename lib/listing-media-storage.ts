import type { ProcessedListingImage } from "./listing-media";

type StorageResult = PromiseLike<{ error: unknown | null }>;
export type ListingMediaBucket = {
  upload(
    path: string,
    bytes: Uint8Array,
    options: { contentType: "image/webp"; cacheControl: string; upsert: false },
  ): StorageResult;
  remove(paths: string[]): StorageResult;
};

type ImagePathRow = {
  storage_path: string;
  card_path?: string | null;
  detail_path?: string | null;
};

export function listingImageObjectPaths(row: ImagePathRow): string[] {
  return [...new Set([row.storage_path, row.card_path, row.detail_path].filter(
    (path): path is string => typeof path === "string" && path.length > 0,
  ))];
}

export async function uploadListingImageArtifacts(
  bucket: ListingMediaBucket,
  paths: { original: string; detail: string; card: string },
  image: ProcessedListingImage,
): Promise<string[]> {
  const artifacts = [
    [paths.original, image.original],
    [paths.detail, image.detail],
    [paths.card, image.card],
  ] as const;
  const createdPaths: string[] = [];
  for (const [path, artifact] of artifacts) {
    const result = await bucket.upload(path, artifact.bytes, {
      contentType: image.mimeType,
      cacheControl: "300",
      upsert: false,
    });
    if (result.error) {
      if (createdPaths.length) await bucket.remove(createdPaths);
      throw new Error("The image variants could not be stored.");
    }
    createdPaths.push(path);
  }
  return createdPaths;
}
