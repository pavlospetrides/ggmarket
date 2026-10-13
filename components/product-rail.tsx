"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function ProductRail({ label, children }: { label: string; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.82, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div className="absolute -top-14 right-0 hidden gap-2 sm:flex">
        <button type="button" className="icon-btn" aria-label={`Scroll ${label} backward`} onClick={() => move(-1)}><ArrowLeft className="size-4" /></button>
        <button type="button" className="icon-btn" aria-label={`Scroll ${label} forward`} onClick={() => move(1)}><ArrowRight className="size-4" /></button>
      </div>
      <div
        ref={rail}
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
    </div>
  );
}
