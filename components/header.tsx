import Link from "next/link";
import { Heart, Search, UserRound } from "lucide-react";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";

export function Header() {
  return <header className="sticky top-0 z-40 hidden border-b border-[var(--border)] bg-[#080a0fe8] backdrop-blur-xl md:block">
    <div className="container-page flex h-[72px] items-center gap-8">
      <Logo />
      <nav className="flex items-center gap-6 text-sm font-semibold text-[#b9bfcc]" aria-label="Main navigation">
        <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
        <Link href="/search" className="hover:text-white">Browse</Link>
      </nav>
      <form action="/search" className="ml-auto hidden w-full max-w-sm lg:block">
        <label className="sr-only" htmlFor="nav-search">Search marketplace</label>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" /><input id="nav-search" name="q" className="input min-h-10 py-2 pl-10" placeholder="Search gaming gear" /></div>
      </form>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Link href="/favorites" className="grid size-10 place-items-center rounded-xl hover:bg-[var(--surface-2)]" aria-label="Favorites"><Heart className="size-5" /></Link>
        <Link href="/profile" className="grid size-10 place-items-center rounded-xl hover:bg-[var(--surface-2)]" aria-label="Profile"><UserRound className="size-5" /></Link>
        <Link href="/sell" className="btn-primary min-h-10 px-5">Sell</Link>
      </div>
    </div>
  </header>;
}
