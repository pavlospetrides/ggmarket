import type { ProfileCrop, ProfileMediaKind } from "./profile-media";

export function profileCropForView(width: number, height: number, kind: ProfileMediaKind, zoom: number, panX: number, panY: number): ProfileCrop {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const ratio = kind === "avatar" ? 1 : 3;
  const imageRatio = width / height;
  if (!Number.isFinite(imageRatio) || imageRatio <= 0) return { x: 0, y: 0, width: 1, height: 1 };
  const baseWidth = imageRatio >= ratio ? ratio / imageRatio : 1;
  const baseHeight = imageRatio >= ratio ? 1 : imageRatio / ratio;
  const safeZoom = Number.isFinite(zoom) ? Math.max(1, Math.min(3, zoom)) : 1;
  const cropWidth = baseWidth / safeZoom;
  const cropHeight = baseHeight / safeZoom;
  const safePanX = Number.isFinite(panX) ? Math.max(0, Math.min(1, panX)) : 0.5;
  const safePanY = Number.isFinite(panY) ? Math.max(0, Math.min(1, panY)) : 0.5;
  return { x: (1 - cropWidth) * safePanX, y: (1 - cropHeight) * safePanY, width: cropWidth, height: cropHeight };
}

export function moveProfilePan(pan: number, deltaPixels: number, viewportPixels: number, cropFraction: number) {
  if (!Number.isFinite(pan)) return 0.5;
  const safePan = Math.max(0, Math.min(1, pan));
  if (!Number.isFinite(deltaPixels) || !Number.isFinite(viewportPixels) || viewportPixels <= 0 || !Number.isFinite(cropFraction) || cropFraction <= 0 || cropFraction >= 1) return safePan;
  return Math.max(0, Math.min(1, safePan - deltaPixels * cropFraction / (viewportPixels * (1 - cropFraction))));
}
