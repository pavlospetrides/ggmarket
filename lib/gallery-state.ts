export function advanceGalleryIndex(current: number, count: number, direction: -1 | 1) {
  if (count <= 1) return 0;
  return (current + direction + count) % count;
}
