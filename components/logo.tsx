import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" aria-label="GGMarket home" className="group inline-flex min-h-11 items-center gap-2.5 text-[1.05rem] font-[820] tracking-[-.055em] text-white" translate="no">
    <BrandMark className="size-9 shrink-0 transition-transform duration-200 group-hover:scale-[1.045]" />
    {!compact && <span className="whitespace-nowrap">GG<span className="font-[650] text-[var(--text-secondary)]">Market</span></span>}
  </Link>;
}
