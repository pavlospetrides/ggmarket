import type { ProfileCrop, ProfileMediaKind } from "./profile-media";

export function profileCropForView(width: number, height: number, kind: ProfileMediaKind, zoom: number, panX: number, panY: number): ProfileCrop {
  const ratio = kind === "avatar" ? 1 : 3;
  const imageRatio = width / height;
  const baseWidth = imageRatio >= ratio ? ratio / imageRatio : 1;
  const baseHeight = imageRatio >= ratio ? 1 : imageRatio / ratio;
  const cropWidth = baseWidth / zoom;
  const cropHeight = baseHeight / zoom;
  return { x: (1 - cropWidth) * panX, y: (1 - cropHeight) * panY, width: cropWidth, height: cropHeight };
}

export function moveProfilePan(pan: number, deltaPixels: number, viewportPixels: number, cropFraction: number) {
  if (!viewportPixels || cropFraction >= 1) return pan;
  return Math.max(0, Math.min(1, pan - deltaPixels * cropFraction / (viewportPixels * (1 - cropFraction))));
}
