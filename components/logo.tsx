import Link from "next/link";

export function Logo() {
  return <Link href="/" className="inline-flex items-center gap-2 font-black tracking-[-.04em] text-xl" aria-label="GGMarket home">
    <span className="grid size-9 place-items-center rounded-xl bg-[#7657ff] text-sm shadow-[0_6px_22px_rgba(118,87,255,.35)]">GG</span>
    <span>GGMarket</span>
  </Link>;
}
