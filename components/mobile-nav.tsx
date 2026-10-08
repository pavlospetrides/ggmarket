import Link from "next/link";
import { Home, MessageCircle, Plus, Search, UserRound } from "lucide-react";

export function MobileNav() {
  const items = [
    ["Home", "/", Home],
    ["Search", "/search", Search],
    ["Messages", "/messages", MessageCircle],
    ["Profile", "/profile", UserRound],
  ] as const;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[#0b0d13f2] px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 items-end">
        {items.slice(0, 2).map(([label, href, Icon]) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[var(--muted)]"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
        <Link
          href="/sell"
          className="-mt-7 flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-bold"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--brand)] shadow-[0_8px_24px_rgba(124,92,255,.45)]">
            <Plus className="size-6" />
          </span>
          Sell
        </Link>
        {items.slice(2).map(([label, href, Icon]) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[var(--muted)]"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
