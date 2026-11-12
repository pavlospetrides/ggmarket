"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { shouldRefreshFailedMedia } from "@/lib/listing-media-expiry";

let lastRefresh = 0;

export function ProfileMediaImage({ src, alt, sizes, onFailed, className = "" }: { src: string; alt: string; sizes: string; onFailed?: () => void; className?: string }) {
  const router = useRouter();
  const attempted = useRef<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) return null;
  return <Image src={src} alt={alt} fill unoptimized sizes={sizes} className={className} onError={() => {
    onFailed?.();
    setFailedSrc(src);
    if (attempted.current !== src && shouldRefreshFailedMedia(src, Date.now(), lastRefresh)) {
      attempted.current = src;
      lastRefresh = Date.now();
      router.refresh();
    }
  }} />;
}
