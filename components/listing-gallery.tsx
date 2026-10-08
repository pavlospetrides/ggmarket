"use client";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useState } from "react";

export function ListingGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  if (!images.length) return <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center text-[var(--muted)]"><span><ImageIcon className="mx-auto size-10" /><span className="mt-2 block text-sm">No photos available</span></span></div>;
  return <div><div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] sm:rounded-[1.5rem]"><Image src={images[selected]} alt={`${title} — image ${selected + 1}`} fill priority sizes="(max-width: 900px) 100vw, 60vw" className="object-cover" /><span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold">{selected + 1} / {images.length}</span></div>{images.length > 1 && <div className="mt-3 flex gap-3 overflow-auto pb-1">{images.map((src, index) => <button key={src} onClick={() => setSelected(index)} className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 ${selected === index ? "border-[var(--brand)]" : "border-transparent"}`} aria-label={`View image ${index + 1}`}><Image src={src} alt="" fill sizes="80px" className="object-cover" /></button>)}</div>}</div>;
}
