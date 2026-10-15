import Link from "next/link";
import { ArrowUpRight, Armchair, Cpu, Disc3, Gamepad2, Ghost, Glasses, Joystick, Monitor, Mouse, PcCase, Trophy, Wrench } from "lucide-react";
import type { Category } from "@/lib/types";

const icons = { Armchair, Cpu, Disc3, Gamepad2, Ghost, Glasses, Joystick, Monitor, Mouse, PcCase, Trophy, Wrench };
export function CategoryGrid({ categories, limit }: { categories: Category[]; limit?: number }) {
  return <div className="category-index">{categories.slice(0, limit).map((category) => {
    const Icon = icons[category.icon as keyof typeof icons] ?? Gamepad2;
    return <Link key={category.id} href={`/marketplace?category=${category.slug}`} className="category-index-item"><span className="category-index-icon"><Icon className="size-4" /></span><strong className="min-w-0 flex-1 text-[15px]">{category.name}</strong><ArrowUpRight className="category-index-arrow" /></Link>;
  })}</div>;
}
