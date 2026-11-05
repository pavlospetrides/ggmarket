import Image, { type ImageProps } from "next/image";

/**
 * Renders an already-authorized listing image without invoking Vercel's
 * transformation service. The source remains a private Supabase signed URL;
 * Next Image still supplies dimensions, lazy loading, and layout stability.
 */
export function ListingMediaImage(props: ImageProps) {
  return <Image {...props} unoptimized />;
}
