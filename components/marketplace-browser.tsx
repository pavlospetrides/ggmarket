"use client";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { CategoryGrid } from "./category-grid";
import { ListingGrid } from "./listing-grid";
import { SearchBar } from "./search-bar";
import { conditions } from "@/lib/constants";
import type { Category, Listing, ListingQuery } from "@/lib/types";

const value = (params: ListingQuery, key: string) =>
  typeof params[key] === "string" ? (params[key] as string) : "";
export function MarketplaceBrowser({
  items,
  params,
  categories,
  favoriteIds,
}: {
  items: Listing[];
  params: ListingQuery;
  categories: Category[];
  favoriteIds: string[];
}) {
  const [filters, setFilters] = useState(false);
  const query = value(params, "q");
  const sidebar = (prefix: "desktop" | "mobile") => (
    <form action="/marketplace" className="space-y-7">
      {query && <input type="hidden" name="q" value={query} />}
      <div>
        <label className="label" htmlFor={`${prefix}-category`}>
          Category
        </label>
        <select
          className="input"
          id={`${prefix}-category`}
          name="category"
          defaultValue={value(params, "category")}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option value={item.slug} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="label">Price range</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input"
            name="min"
            inputMode="decimal"
            type="number"
            min="0"
            placeholder="Min €"
            defaultValue={value(params, "min")}
          />
          <input
            className="input"
            name="max"
            inputMode="decimal"
            type="number"
            min="0"
            placeholder="Max €"
            defaultValue={value(params, "max")}
          />
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor={`${prefix}-condition`}>
          Condition
        </label>
        <select
          className="input"
          id={`${prefix}-condition`}
          name="condition"
          defaultValue={value(params, "condition")}
        >
          <option value="">Any condition</option>
          {conditions.map(([condition, label]) => (
            <option value={condition} key={condition}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-location`}>
          Location
        </label>
        <input
          className="input"
          id={`${prefix}-location`}
          name="location"
          maxLength={80}
          placeholder="City or region"
          defaultValue={value(params, "location")}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-seller-type`}>
          Seller type
        </label>
        <select
          className="input"
          id={`${prefix}-seller-type`}
          name="seller"
          defaultValue={value(params, "seller")}
        >
          <option value="">All sellers</option>
          <option value="private">Private</option>
          <option value="business">Business</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-intent`}>
          Listing type
        </label>
        <select
          className="input"
          id={`${prefix}-intent`}
          name="intent"
          defaultValue={value(params, "intent")}
        >
          <option value="">All types</option>
          <option value="sale">For sale</option>
          <option value="wanted">Wanted</option>
          <option value="trade">Trade</option>
          <option value="sale_or_trade">Sale or trade</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href="/marketplace" className="btn-secondary">
          Reset
        </a>
        <button className="btn-primary w-full">Apply filters</button>
      </div>
    </form>
  );
  return (
    <div className="container-page py-8 md:py-12">
      <div className="mb-8">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Marketplace
        </h1>
        <div className="mt-6 max-w-2xl">
          <SearchBar defaultValue={query} />
        </div>
      </div>
      {!query && !params.category && (
        <div className="mb-10">
          <CategoryGrid categories={categories} limit={8} />
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-[230px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-24 card p-5">
            <h2 className="mb-6 flex items-center gap-2 font-bold">
              <SlidersHorizontal className="size-4" /> Filters
            </h2>
            {sidebar("desktop")}
          </div>
        </aside>
        <section>
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              <strong className="text-white">{items.length}</strong> listings
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilters(true)}
                className="btn-secondary md:hidden"
              >
                <SlidersHorizontal className="size-4" /> Filters
              </button>
              <form action="/marketplace">
                {Object.entries(params)
                  .filter(
                    ([key, item]) =>
                      key !== "sort" && typeof item === "string" && item,
                  )
                  .map(([key, item]) => (
                    <input
                      type="hidden"
                      name={key}
                      value={item as string}
                      key={key}
                    />
                  ))}
                <select
                  className="input min-h-11 w-40"
                  name="sort"
                  defaultValue={value(params, "sort") || "newest"}
                  onChange={(event) =>
                    event.currentTarget.form?.requestSubmit()
                  }
                  aria-label="Sort listings"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price-asc">Price: low</option>
                  <option value="price-desc">Price: high</option>
                </select>
              </form>
            </div>
          </div>
          {items.length ? (
            <ListingGrid listings={items} favoriteIds={new Set(favoriteIds)} />
          ) : (
            <div className="card grid min-h-72 place-items-center p-8 text-center">
              <div>
                <h2 className="text-xl font-bold">No matching listings</h2>
                <p className="mt-2 text-[var(--muted)]">
                  Try widening your filters or be the first to list one.
                </p>
                <a href="/sell" className="btn-primary mt-5">
                  Create a listing
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
      {filters && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Marketplace filters"
          onClick={() => setFilters(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-auto rounded-t-[2rem] border-t border-[var(--border)] bg-[var(--surface)] p-6 pb-24"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Filters</h2>
              <button
                type="button"
                onClick={() => setFilters(false)}
                className="grid size-10 place-items-center rounded-full bg-[var(--surface-2)]"
                aria-label="Close filters"
              >
                <X />
              </button>
            </div>
              {sidebar("mobile")}
          </div>
        </div>
      )}
    </div>
  );
}
