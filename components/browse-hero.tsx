"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type BrowseHeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
};

export function BrowseHero({ slides }: { slides: BrowseHeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const count = slides.length;
  const move = (offset: number) => setActive((current) => (current + offset + count) % count);

  useEffect(() => {
    if (paused || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % count),
      7_000,
    );
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  const slide = slides[active];
  return (
    <section
      className="group relative isolate min-h-[29rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#101522] shadow-[0_36px_110px_rgba(0,0,0,.48)] sm:min-h-[34rem]"
      aria-roledescription="carousel"
      aria-label="Featured discoveries"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={(event) => { pointerStart.current = event.clientX; }}
      onPointerUp={(event) => {
        if (pointerStart.current == null) return;
        const distance = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1);
      }}
    >
      <Image
        key={slide.image}
        src={slide.image}
        alt={slide.imageAlt}
        fill
        priority={active === 0}
        sizes="(max-width: 768px) 100vw, 1240px"
        className="browse-hero-image object-cover"
        style={{ objectPosition: slide.imagePosition }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,.97)_0%,rgba(6,8,14,.84)_43%,rgba(6,8,14,.2)_78%),radial-gradient(circle_at_82%_20%,rgba(131,100,255,.34),transparent_42%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_right,black,transparent)]" />
      <div className="relative z-10 flex min-h-[29rem] max-w-2xl flex-col justify-end p-6 pb-20 sm:min-h-[34rem] sm:justify-center sm:p-12 lg:p-16">
        <span className="eyebrow mb-4 text-[#b8abff]">{slide.eyebrow}</span>
        <h1 className="max-w-xl text-4xl font-black uppercase leading-[.92] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">
          {slide.title}
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-6 text-[#c7ccda] sm:text-lg sm:leading-8">
          {slide.description}
        </p>
        <Link prefetch={false} href={slide.href} className="btn-primary mt-7 w-fit px-5">
          {slide.cta} <ArrowRight className="size-4" />
        </Link>
      </div>
      {count > 1 && (
        <>
          <div className="absolute bottom-5 left-6 z-20 flex gap-2 sm:left-12 lg:left-16">
            {slides.map((item, index) => (
              <button
                key={`${item.title}-${index}`}
                type="button"
                className={`h-2 rounded-full transition-[width,background] ${index === active ? "w-8 bg-white" : "w-2 bg-white/35 hover:bg-white/65"}`}
                aria-label={`Show slide ${index + 1}: ${item.title}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          <div className="absolute bottom-5 right-5 z-20 hidden gap-2 sm:flex">
            <button type="button" className="icon-btn border-white/15 bg-black/35" aria-label="Previous discovery" onClick={() => move(-1)}><ArrowLeft className="size-4" /></button>
            <button type="button" className="icon-btn border-white/15 bg-black/35" aria-label="Next discovery" onClick={() => move(1)}><ArrowRight className="size-4" /></button>
          </div>
        </>
      )}
    </section>
  );
}
