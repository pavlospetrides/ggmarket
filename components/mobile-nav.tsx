"use client";

import Link from "next/link";
import { Heart, Home, Plus, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();
  if (["/login", "/register", "/forgot-password", "/reset-password"].some((route) => pathname.startsWith(route)) || /^\/messages\/[^/]+$/.test(pathname)) return null;
  const items = [
    ["Home", "/", Home],
    ["Browse", "/browse", Search],
    ["Favorites", "/favorites", Heart],
    ["Profile", "/profile", UserRound],
  ] as const;
  return (
    <nav
      data-ui
      data-mobile-navigation
      className="fixed inset-x-0 bottom-0 z-50 bg-[#0c1018f5] px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-1.5 md:hidden"
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
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[13px] font-bold transition-colors ${selected ? "text-[var(--primary-hover)]" : "text-[var(--muted)]"}`}
          >
            <Icon className={`size-5 ${selected ? "stroke-[2.5]" : ""}`} />
            {label}
          </Link>
        )})}
        <Link
          href="/sell"
          aria-current={pathname.startsWith("/sell") ? "page" : undefined}
          className="-mt-6 flex min-h-12 flex-col items-center justify-center gap-1 text-[13px] font-extrabold"
        >
          <span className="grid size-12 place-items-center rounded-[14px] bg-[var(--primary)] transition-transform active:scale-95">
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
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[13px] font-bold transition-colors ${selected ? "text-[var(--primary-hover)]" : "text-[var(--muted)]"}`}
          >
            <Icon className={`size-5 ${selected ? "stroke-[2.5]" : ""}`} />
            {label}
          </Link>
        )})}
      </div>
    </nav>
  );
}
