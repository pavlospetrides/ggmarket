import Link from "next/link";
import { Armchair, Cpu, Disc3, Gamepad2, Ghost, Glasses, Joystick, Monitor, Mouse, PcCase, Trophy, Wrench } from "lucide-react";
import type { Category } from "@/lib/types";

const icons = { Armchair, Cpu, Disc3, Gamepad2, Ghost, Glasses, Joystick, Monitor, Mouse, PcCase, Trophy, Wrench };
export function CategoryGrid({ categories, limit }: { categories: Category[]; limit?: number }) {
  return <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">{categories.slice(0, limit).map((category) => {
    const Icon = icons[category.icon as keyof typeof icons] ?? Gamepad2;
    return <Link key={category.id} href={`/marketplace?category=${category.slug}`} className="group flex min-w-0 flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-4 text-center text-xs font-semibold text-[#bfc4d0] transition hover:-translate-y-1 hover:border-[#6452ac] hover:text-white sm:text-sm"><span className="grid size-11 place-items-center rounded-xl bg-[#1b1e2b] text-[#a995ff] group-hover:bg-[#292141]"><Icon className="size-5" /></span><span className="line-clamp-2">{category.name}</span></Link>;
  })}</div>;
}
