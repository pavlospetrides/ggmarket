"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageIcon, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function ListingGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const previous = useCallback(() => setSelected((current) => (current - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setSelected((current) => (current + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!expanded) return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", keys);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", keys); document.body.style.overflow = ""; };
  }, [expanded, next, previous]);

  if (!images.length) return <div className="card grid aspect-[4/3] place-items-center text-center text-[var(--muted)]"><span><span className="empty-state-icon"><ImageIcon /></span><span className="mt-3 block text-sm">No photos available</span></span></div>;

  const controls = images.length > 1 && <>
    <button type="button" onClick={previous} className="icon-btn absolute left-3 top-1/2 z-10 -translate-y-1/2" aria-label="Previous image"><ChevronLeft /></button>
    <button type="button" onClick={next} className="icon-btn absolute right-3 top-1/2 z-10 -translate-y-1/2" aria-label="Next image"><ChevronRight /></button>
  </>;

  return <div>
    <div className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
      <button type="button" onClick={() => setExpanded(true)} className="relative block size-full cursor-zoom-in" aria-label="Open full-screen gallery">
        <Image src={images[selected]} alt={`${title} — image ${selected + 1}`} fill priority sizes="(max-width: 900px) 100vw, 60vw" className="object-cover transition duration-500 group-hover:scale-[1.015]" />
      </button>
      {controls}
      <span className="badge pointer-events-none absolute bottom-3 right-3 border-white/10 bg-black/65 text-white backdrop-blur-md">{selected + 1} / {images.length}</span>
      <span className="icon-btn pointer-events-none absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"><Expand className="size-4" /></span>
    </div>
    {images.length > 1 && <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">{images.map((src, index) => <button key={src} type="button" onClick={() => setSelected(index)} className={`relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl border-2 transition ${selected === index ? "border-[var(--primary)] opacity-100 shadow-[0_0_0_2px_rgba(132,104,255,.15)]" : "border-transparent opacity-60 hover:opacity-100"}`} aria-label={`View image ${index + 1}`} aria-current={selected === index}><Image src={src} alt="" fill sizes="72px" className="object-cover" /></button>)}</div>}

    {expanded && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#030406f2] p-3 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`${title} full-screen gallery`}>
      <button type="button" onClick={() => setExpanded(false)} className="icon-btn absolute right-4 top-4 z-20" aria-label="Close gallery"><X /></button>
      <div className="relative h-[86dvh] w-full max-w-6xl"><Image src={images[selected]} alt={`${title} — image ${selected + 1}`} fill sizes="100vw" className="object-contain" priority />{controls}</div>
      <span className="badge absolute bottom-[max(1rem,env(safe-area-inset-bottom))] border-white/10 bg-black/60 text-white">{selected + 1} of {images.length}</span>
    </div>}
  </div>;
}
