"use client";

import Image, { type ImageProps } from "next/image";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { shouldRefreshFailedMedia } from "@/lib/listing-media-expiry";

let lastMediaRefresh = 0;

/**
 * Renders an already-authorized listing image without invoking Vercel's
 * transformation service. The source remains a private storage signed URL;
 * Next Image still supplies dimensions, lazy loading, and layout stability.
 */
export function ListingMediaImage({ alt, onError, ...props }: ImageProps) {
  const router = useRouter();
  const attempted = useRef<string | null>(null);
  return <Image {...props} alt={alt} unoptimized onError={(event) => {
    onError?.(event);
    const source = typeof props.src === "string" ? props.src : null;
    if (source && attempted.current !== source && shouldRefreshFailedMedia(source, Date.now(), lastMediaRefresh)) {
      attempted.current = source;
      lastMediaRefresh = Date.now();
      // Regenerate through the page's current RLS reads; never proxy image bytes.
      router.refresh();
    }
  }} />;
}
