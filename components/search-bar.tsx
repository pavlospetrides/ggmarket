import { Search } from "lucide-react";

type SearchBarProps = {
  action?: string;
  defaultValue?: string;
  id?: string;
  large?: boolean;
  placeholder?: string;
};

export function SearchBar({
  action = "/search",
  defaultValue = "",
  id,
  large = false,
  placeholder = "Search PS5, RTX 5070, Steam Deck…",
}: SearchBarProps) {
  const inputId = id ?? (large ? "hero-search" : "search");

  return <form action={action} className="w-full" role="search">
    <label htmlFor={inputId} className="sr-only">Search marketplace</label>
    <div className="group relative">
      <Search className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#8992a5] transition-colors group-focus-within:text-[var(--primary-hover)] ${large ? "size-5 sm:size-6" : "size-5"}`} />
      <input id={inputId} name="q" defaultValue={defaultValue} autoComplete="off" spellCheck={false} placeholder={placeholder} className={`input pr-28 ${large ? "min-h-[60px] rounded-[var(--radius-md)] pl-12 text-base sm:pl-14" : "pl-12"}`} />
      <button className={`btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 ${large ? "min-h-12 px-5" : "min-h-9 py-1"}`}>Search</button>
    </div>
  </form>;
}
