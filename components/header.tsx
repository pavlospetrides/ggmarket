"use client";

import Link from "next/link";
import { Heart, MessageCircle, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";

export function Header() {
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditing && searchRef.current?.offsetParent) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  if (["/login", "/register", "/forgot-password", "/reset-password"].some((route) => pathname.startsWith(route))) return null;
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return <header data-ui className="sticky top-0 z-40 hidden bg-[color:var(--nav)] md:block">
    <div className="container-page flex h-[4.5rem] items-center gap-6">
      <Logo />
      <nav className="flex h-full items-center gap-1 text-[13px] font-semibold text-[var(--text-secondary)]" aria-label="Main navigation">
        <Link href="/marketplace" className={`flex min-h-11 items-center px-3 transition-colors hover:text-white ${active("/marketplace") ? "text-white" : ""}`}>Marketplace</Link>
        <Link href="/browse" className={`flex min-h-11 items-center px-3 transition-colors hover:text-white ${active("/browse") ? "text-white" : ""}`}>Browse</Link>
      </nav>
      <form action="/search" className="ml-auto hidden w-full max-w-sm lg:block">
        <label className="sr-only" htmlFor="nav-search">Search marketplace</label>
        <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" /><input ref={searchRef} id="nav-search" name="q" className="input min-h-10 py-2 pl-10 pr-10" autoComplete="off" spellCheck={false} placeholder="Search gaming gear…" /><kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md bg-[var(--surface-elevated)] px-1.5 py-1 text-[11px] text-[var(--muted)] xl:block">/</kbd></div>
      </form>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Link href="/messages" className={`icon-btn min-h-10 size-10 border-transparent bg-transparent ${active("/messages") ? "bg-[var(--surface-alt)] text-white" : ""}`} aria-label="Messages"><MessageCircle className="size-[19px]" /></Link>
        <Link href="/favorites" className={`icon-btn min-h-10 size-10 border-transparent bg-transparent ${active("/favorites") ? "bg-[var(--surface-alt)] text-white" : ""}`} aria-label="Favorites"><Heart className="size-[19px]" /></Link>
        <Link href="/profile" className={`icon-btn min-h-10 size-10 border-transparent bg-transparent ${active("/profile") ? "bg-[var(--surface-alt)] text-white" : ""}`} aria-label="Profile"><UserRound className="size-[19px]" /></Link>
        <Link href="/sell" className="btn-primary min-h-10 px-5">Sell</Link>
      </div>
    </div>
  </header>;
}
