import sharp from "sharp";

export type ProfileMediaKind = "avatar" | "cover";
export type ProfileCrop = { x: number; y: number; width: number; height: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function buildProfileMediaPath(ownerId: string, kind: ProfileMediaKind, mediaId: string) {
  if (!UUID.test(ownerId) || !UUID.test(mediaId) || !["avatar", "cover"].includes(kind)) throw new Error("Invalid profile media path.");
  return `profile-media/${ownerId}/${kind}/${mediaId}.webp`;
}

export function isOwnedProfileMediaPath(path: string, ownerId: string, kind: ProfileMediaKind): boolean {
  if (!UUID.test(ownerId)) return false;
  const match = /^profile-media\/([0-9a-f-]+)\/(avatar|cover)\/([0-9a-f-]+)\.webp$/i.exec(path);
  return Boolean(match && match[1] === ownerId && match[2] === kind && UUID.test(match[3]));
}

export async function processProfileMedia(input: Uint8Array, kind: ProfileMediaKind, crop: ProfileCrop, declaredMime: string): Promise<Uint8Array> {
  try {
    if (!["avatar", "cover"].includes(kind) || !input.byteLength || input.byteLength > 10_485_760) throw new Error();
    if ([crop.x, crop.y, crop.width, crop.height].some((n) => !Number.isFinite(n)) || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > 1.00001 || crop.y + crop.height > 1.00001) throw new Error();
    const source = sharp(input, { failOn: "error", limitInputPixels: 40_000_000, animated: true });
    const meta = await source.metadata();
    if (!meta.format || MIME[meta.format] !== declaredMime || !meta.width || !meta.height || meta.width > 12_000 || meta.height > 12_000 || meta.width * meta.height > 40_000_000 || (meta.pages ?? 1) !== 1) throw new Error();
    const swapped = [5, 6, 7, 8].includes(meta.orientation ?? 1);
    const width = swapped ? meta.height : meta.width;
    const height = swapped ? meta.width : meta.height;
    const left = Math.round(crop.x * width);
    const top = Math.round(crop.y * height);
    const extractWidth = Math.min(width - left, Math.round(crop.width * width));
    const extractHeight = Math.min(height - top, Math.round(crop.height * height));
    const ratio = kind === "avatar" ? 1 : 3;
    if (extractWidth < 1 || extractHeight < 1 || Math.abs(extractWidth / extractHeight - ratio) > Math.max(0.04, 4 / extractHeight)) throw new Error();
    const output = kind === "avatar" ? { width: 1024, height: 1024 } : { width: 2400, height: 800 };
    return await sharp(input, { failOn: "error", limitInputPixels: 40_000_000, animated: false })
      .rotate().extract({ left, top, width: extractWidth, height: extractHeight })
      .resize(output.width, output.height, { fit: "fill" })
      .webp({ quality: kind === "avatar" ? 88 : 84, effort: 4 })
      .toBuffer();
  } catch {
    throw new Error("Upload a valid image and crop.");
  }
}
