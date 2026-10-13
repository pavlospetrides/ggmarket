import { Search } from "lucide-react";

export function SearchBar({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return <form action="/search" className="w-full">
    <label htmlFor={large ? "hero-search" : "search"} className="sr-only">Search marketplace</label>
    <div className="group relative"><Search className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#8992a5] transition-colors group-focus-within:text-[#ad9dff] ${large ? "size-5 sm:size-6" : "size-5"}`} />
      <input id={large ? "hero-search" : "search"} name="q" defaultValue={defaultValue} placeholder="Search PS5, RTX 5070, Steam Deck..." className={`input border-[#30384a] bg-[#0b0f17e8] pr-28 shadow-[0_16px_50px_rgba(0,0,0,.24)] ${large ? "min-h-[60px] rounded-2xl pl-12 text-sm sm:pl-14 sm:text-base" : "pl-12"}`} />
      <button className={`btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 ${large ? "min-h-12 px-5" : "min-h-9 py-1"}`}>Search</button>
    </div>
  </form>;
}
