"use client";

import { useState } from "react";
import { ProfileMediaImage } from "./profile-media-image";

export function ProfileAvatar({ name, url, className = "", sizes = "96px" }: { name: string; url?: string; className?: string; sizes?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "G";
  return <span className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--primary)] font-black text-white ${className}`} role="img" aria-label={`${name} avatar`}>
    <span aria-hidden="true">{initial}</span>
    {url && failedSrc !== url ? <ProfileMediaImage src={url} alt="" sizes={sizes} className="object-cover" onFailed={() => setFailedSrc(url)} /> : null}
  </span>;
}
