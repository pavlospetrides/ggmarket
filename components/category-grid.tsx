import Link from "next/link";
import { Armchair, Cpu, Disc3, Gamepad2, Ghost, Glasses, Joystick, Monitor, Mouse, PcCase, Trophy, Wrench } from "lucide-react";
import type { Category } from "@/lib/types";

const icons = { Armchair, Cpu, Disc3, Gamepad2, Ghost, Glasses, Joystick, Monitor, Mouse, PcCase, Trophy, Wrench };
export function CategoryGrid({ categories, limit }: { categories: Category[]; limit?: number }) {
  return <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-8">{categories.slice(0, limit).map((category) => {
    const Icon = icons[category.icon as keyof typeof icons] ?? Gamepad2;
    return <Link key={category.id} href={`/marketplace?category=${category.slug}`} className="card-interactive group flex min-w-0 flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(145deg,#131824,#0d1119)] px-1.5 py-4 text-center text-[11px] font-bold text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,.025)] hover:text-white sm:px-2 sm:text-xs"><span className="grid size-10 place-items-center rounded-xl border border-white/[.04] bg-[#191e2d] text-[#a995ff] transition-colors group-hover:bg-[#282240] group-hover:text-[#c4b8ff]"><Icon className="size-[19px]" /></span><span className="line-clamp-2 leading-tight">{category.name}</span></Link>;
  })}</div>;
}
