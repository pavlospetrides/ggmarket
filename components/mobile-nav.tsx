"use client";

import Link from "next/link";
import { Home, MessageCircle, Plus, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();
  const items = [
    ["Home", "/", Home],
    ["Browse", "/browse", Search],
    ["Messages", "/messages", MessageCircle],
    ["Profile", "/profile", UserRound],
  ] as const;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[.08] bg-[#090c12ed] px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-16px_40px_rgba(0,0,0,.28)] backdrop-blur-2xl md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 items-end">
        {items.slice(0, 2).map(([label, href, Icon]) => {
          const selected = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
          <Link
            key={href}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${selected ? "text-[#b7a8ff]" : "text-[var(--muted)]"}`}
          >
            <Icon className={`size-5 ${selected ? "stroke-[2.5]" : ""}`} />
            {label}
          </Link>
        )})}
        <Link
          href="/sell"
          aria-current={pathname.startsWith("/sell") ? "page" : undefined}
          className="-mt-6 flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-extrabold"
        >
          <span className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#947aff] to-[#6949ee] shadow-[0_10px_28px_rgba(105,73,238,.38)] transition-transform active:scale-95">
            <Plus className="size-6" />
          </span>
          Sell
        </Link>
        {items.slice(2).map(([label, href, Icon]) => {
          const selected = pathname.startsWith(href);
          return (
          <Link
            key={href}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${selected ? "text-[#b7a8ff]" : "text-[var(--muted)]"}`}
          >
            <Icon className={`size-5 ${selected ? "stroke-[2.5]" : ""}`} />
            {label}
          </Link>
        )})}
      </div>
    </nav>
  );
}
