import Link from "next/link";

export function Logo() {
  return <Link href="/" className="group inline-flex items-center gap-2.5 text-xl font-[850] tracking-[-.045em]" aria-label="GGMarket home">
    <span className="grid size-9 place-items-center rounded-xl border border-white/15 bg-gradient-to-br from-[#9378ff] to-[#6547e9] text-[13px] font-black shadow-[0_7px_24px_rgba(105,73,238,.3)] transition-transform group-hover:-rotate-3 group-hover:scale-105">GG</span>
    <span>GG<span className="text-[var(--text-secondary)]">Market</span></span>
  </Link>;
}
