import { Search } from "lucide-react";

export function SearchBar({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return <form action="/search" className="w-full">
    <label htmlFor={large ? "hero-search" : "search"} className="sr-only">Search marketplace</label>
    <div className="relative"><Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-[#9da3b2] ${large ? "size-6" : "size-5"}`} />
      <input id={large ? "hero-search" : "search"} name="q" defaultValue={defaultValue} placeholder="Search PS5, RTX 5070, Steam Deck..." className={`input bg-[#11151e] pr-28 ${large ? "min-h-16 rounded-2xl pl-14 text-base shadow-2xl sm:text-lg" : "pl-12"}`} />
      <button className={`btn-primary absolute right-2 top-1/2 -translate-y-1/2 ${large ? "min-h-12 px-5" : "min-h-9 py-1"}`}>Search</button>
    </div>
  </form>;
}
