"use client";

import Link from "next/link";
import { Heart, MessageCircle, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";

export function Header() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return <header className="sticky top-0 z-40 hidden border-b border-white/[.06] bg-[#080a0ed9] shadow-[0_8px_32px_rgba(0,0,0,.18)] backdrop-blur-2xl md:block">
    <div className="container-page flex h-16 items-center gap-7">
      <Logo />
      <nav className="flex h-full items-center gap-1 text-sm font-semibold text-[var(--text-secondary)]" aria-label="Main navigation">
        <Link href="/marketplace" className={`relative flex h-full items-center px-3 transition-colors hover:text-white ${active("/marketplace") ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--primary)]" : ""}`}>Marketplace</Link>
        <Link href="/browse" className={`relative flex h-full items-center px-3 transition-colors hover:text-white ${active("/browse") ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--primary)]" : ""}`}>Browse</Link>
      </nav>
      <form action="/search" className="ml-auto hidden w-full max-w-sm lg:block">
        <label className="sr-only" htmlFor="nav-search">Search marketplace</label>
        <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" /><input id="nav-search" name="q" className="input min-h-10 py-2 pl-10" placeholder="Search gaming gear" /><kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] xl:block">/</kbd></div>
      </form>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Link href="/messages" className={`icon-btn min-h-10 size-10 border-transparent bg-transparent ${active("/messages") ? "bg-[var(--surface-alt)] text-white" : ""}`} aria-label="Messages"><MessageCircle className="size-[19px]" /></Link>
        <Link href="/favorites" className={`icon-btn min-h-10 size-10 border-transparent bg-transparent ${active("/favorites") ? "bg-[var(--surface-alt)] text-white" : ""}`} aria-label="Favorites"><Heart className="size-[19px]" /></Link>
        <Link href="/profile" className={`icon-btn min-h-10 size-10 border-transparent bg-transparent ${active("/profile") ? "bg-[var(--surface-alt)] text-white" : ""}`} aria-label="Profile"><UserRound className="size-[19px]" /></Link>
        <Link href="/sell" className="btn-primary min-h-10 px-5">Sell item</Link>
      </div>
    </div>
  </header>;
}
