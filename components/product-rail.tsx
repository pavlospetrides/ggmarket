"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function ProductRail({ label, restorationKey, children }: { label: string; restorationKey?: string; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.82, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div
        ref={rail}
        data-listing-scroll-container={restorationKey}
        tabIndex={0}
        role="region"
        aria-label={label}
        className="browse-rail -mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-5 pt-1 focus-visible:rounded-xl sm:gap-5"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
        }}
      >
        {children}
      </div>
      <div className="mt-2 hidden justify-end gap-2 sm:flex">
        <button type="button" className="icon-btn" aria-label={`Scroll ${label} backward`} onClick={() => move(-1)}><ArrowLeft className="size-4" aria-hidden="true" /></button>
        <button type="button" className="icon-btn" aria-label={`Scroll ${label} forward`} onClick={() => move(1)}><ArrowRight className="size-4" aria-hidden="true" /></button>
      </div>
    </div>
  );
}
