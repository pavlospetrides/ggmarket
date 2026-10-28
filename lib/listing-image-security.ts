import sharp from "sharp";

const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_IMAGE_DIMENSION = 4096;

export type NormalizedListingImage = {
  bytes: Uint8Array;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
};

export async function normalizeListingImage(input: Uint8Array): Promise<NormalizedListingImage> {
  try {
    const { data, info } = await sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      animated: false,
    })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height || data.byteLength === 0) throw new Error("empty image");
    return {
      bytes: data,
      contentType: "image/webp",
      extension: "webp",
      width: info.width,
      height: info.height,
    };
  } catch {
    throw new Error("Upload a valid image file.");
  }
}
