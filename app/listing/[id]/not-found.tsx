import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="system-state container-page grid min-h-[60dvh] min-w-0 place-items-center py-8 text-center">
      <div className="system-state__panel w-full min-w-0 max-w-lg rounded-[var(--radius-xl)] bg-[var(--surface)] p-6 sm:p-10">
        <PackageSearch className="mx-auto size-12 text-[var(--primary-hover)]" aria-hidden="true" />
        <p className="mt-5 text-sm font-semibold text-[var(--primary-hover)]">Listing unavailable</p>
        <h1 className="mt-4 text-4xl font-[850] leading-tight tracking-tight [overflow-wrap:anywhere]">This listing has left the lobby</h1>
        <p className="mt-4 leading-7 text-[var(--text-secondary)]">It may have sold, expired, or been removed by its owner. There is more to find in the marketplace.</p>
        <Link href="/marketplace" className="btn-primary mt-6 w-full sm:w-auto">Browse marketplace <ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
