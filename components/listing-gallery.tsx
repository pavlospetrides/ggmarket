"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageIcon } from "lucide-react";
import { useCallback, useState, type KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";

export function ListingGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const previous = useCallback(() => setSelected((current) => (current - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setSelected((current) => (current + 1) % images.length), [images.length]);

  function navigateExpandedGallery(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }
  }

  if (!images.length) return <div className="grid aspect-[4/3] min-w-0 place-items-center rounded-[var(--radius-xl)] bg-[var(--surface)] text-center text-[var(--text-secondary)]"><span><span className="empty-state-icon"><ImageIcon aria-hidden="true" /></span><span className="mt-3 block text-sm">No photos available</span></span></div>;

  const controls = images.length > 1 && <>
    <button type="button" onClick={previous} className="icon-btn absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-black/70 text-white" aria-label="Previous image"><ChevronLeft aria-hidden="true" /></button>
    <button type="button" onClick={next} className="icon-btn absolute right-3 top-1/2 z-10 -translate-y-1/2 bg-black/70 text-white" aria-label="Next image"><ChevronRight aria-hidden="true" /></button>
  </>;

  return <Dialog open={expanded} onOpenChange={setExpanded}>
    <div className="min-w-0">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface)]">
        <DialogTrigger asChild>
          <button type="button" className="relative block size-full cursor-zoom-in focus-visible:outline-offset-[-4px]" aria-label="Open full-screen gallery">
            <Image src={images[selected]} alt={`${title} — image ${selected + 1}`} fill loading="eager" sizes="(max-width: 1023px) calc(100vw - 32px), 60vw" className="object-contain p-2" />
          </button>
        </DialogTrigger>
        {controls}
        <span className="badge pointer-events-none absolute bottom-3 right-3 bg-black/70 text-white" aria-live="polite" aria-atomic="true">{selected + 1} / {images.length}</span>
        <span className="icon-btn pointer-events-none absolute right-3 top-3 bg-black/70 text-white" aria-hidden="true"><Expand className="size-4" /></span>
      </div>
      {images.length > 1 && <div className="mt-3 flex gap-2.5 overflow-x-auto overscroll-x-contain p-1" role="group" aria-label="Listing photos">{images.map((src, index) => <button key={`${src}-${index}`} type="button" onClick={() => setSelected(index)} className={`relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl border-2 bg-[var(--surface)] transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${selected === index ? "border-[var(--primary)] opacity-100" : "border-transparent opacity-60 hover:opacity-100"}`} aria-label={`View image ${index + 1}`} aria-current={selected === index}><Image src={src} alt="" fill sizes="72px" className="object-contain" /></button>)}</div>}
    </div>

    <DialogContent
      aria-describedby={undefined}
      closeLabel="Close gallery"
      onKeyDown={navigateExpandedGallery}
      className="bottom-[env(safe-area-inset-bottom)] left-0 top-[env(safe-area-inset-top)] h-auto max-h-none w-full max-w-none translate-x-0 translate-y-0 overflow-hidden overscroll-contain rounded-none bg-[#030406fa] p-3 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-[86dvh] sm:w-[calc(100%-2rem)] sm:max-w-6xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)]"
    >
      <DialogTitle className="sr-only">{title} full-screen gallery</DialogTitle>
      <div className="relative size-full"><Image src={images[selected]} alt={`${title} — image ${selected + 1}`} fill sizes="100vw" className="object-contain" loading="eager" />{controls}</div>
      <span className="badge absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 border-white/10 bg-black/60 text-white" aria-live="polite" aria-atomic="true">{selected + 1} of {images.length}</span>
    </DialogContent>
  </Dialog>;
}
