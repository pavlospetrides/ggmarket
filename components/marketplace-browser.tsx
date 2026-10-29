"use client";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CategoryGrid } from "./category-grid";
import { ListingGrid } from "./listing-grid";
import { SearchBar } from "./search-bar";
import { TaxonomyBreadcrumbs } from "./taxonomy-breadcrumbs";
import { TaxonomyNavigation } from "./taxonomy-navigation";
import { useHydrated } from "./use-hydrated";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { conditions } from "@/lib/constants";
import { pageHref } from "@/lib/pagination";
import { COMPATIBILITY_OPTIONS, formatTaxonomyAttribute, getTaxonomyFields, getTaxonomyRoot, isDeprecatedTaxonomyAttribute, isTaxonomyFilterKey, resolveTaxonomyQuery, taxonomyFilterEntries, updateTaxonomyFilterParams } from "@/lib/gaming-taxonomy";
import { pcHardwareDependentKeys } from "@/lib/pc-hardware-taxonomy";
import type { Category, ListingAttributes, ListingQuery, PaginatedListings } from "@/lib/types";

const value = (params: ListingQuery, key: string) =>
  typeof params[key] === "string" ? (params[key] as string) : "";
const filterKeys = ["category", "min", "max", "condition", "location", "seller", "intent"] as const;
export function MarketplaceBrowser({
  result,
  params,
  categories,
  favoriteIds,
  viewerId,
  actionPath,
}: {
  result: PaginatedListings;
  params: ListingQuery;
  categories: Category[];
  favoriteIds: string[];
  viewerId: string | null;
  actionPath: "/marketplace" | "/search";
}) {
  const router = useRouter();
  const { items, total, page, pageSize } = result;
  const [filters, setFilters] = useState(false);
  const [filterNavigationPending, startFilterNavigation] = useTransition();
  const hydrated = useHydrated();
  const pendingFilterFocus = useRef("");
  const query = value(params, "q");
  const resolvedTaxonomy = useMemo(() => resolveTaxonomyQuery(params), [params]);
  const selectedCategorySlug = value(params, "category") || resolvedTaxonomy.category || "";
  const selectedRoot = getTaxonomyRoot(selectedCategorySlug);
  const taxonomyDisplayParams = { ...params, ...(selectedCategorySlug ? { category: selectedCategorySlug } : {}), ...Object.fromEntries(resolvedTaxonomy.filters.map((filter) => [filter.key, String(filter.value)])) };
  const resolvedTaxonomyValue = (key: string) => value(params, key) || String(resolvedTaxonomy.filters.find((filter) => filter.key === key)?.value ?? "");
  const activeFilters = useMemo(() => [...filterKeys.flatMap((key) => {
    const current = value(params, key);
    if (!current) return [];
    const label = key === "category" ? categories.find((item) => item.slug === current)?.name ?? current : current.replaceAll("_", " ");
    return [{ key, label }];
  }), ...taxonomyFilterEntries(params).map((filter) => ({ key: filter.key, label: formatTaxonomyAttribute(filter.key, filter.value).value }))], [categories, params]);
  const activeFilterCount = activeFilters.length;
  const hasStructuredFilters = taxonomyFilterEntries(taxonomyDisplayParams).length > 0;
  const categoryHref = (category: string) => {
    const next = new URLSearchParams();
    for (const [key, current] of Object.entries(params)) {
      if (typeof current === "string" && current && key !== "page" && key !== "category" && !isTaxonomyFilterKey(key) && !isDeprecatedTaxonomyAttribute(key)) next.set(key, current);
    }
    if (category) next.set("category", category);
    const search = next.toString();
    return search ? `${actionPath}?${search}` : actionPath;
  };
  const withoutFilter = (key: string) => {
    const next = { ...params };
    delete next[key];
    if (key === "category") {
      for (const candidate of Object.keys(next)) if (isTaxonomyFilterKey(candidate)) delete next[candidate];
    }
    if (key === "family") {
      delete next.platform;
      delete next.model;
    }
    delete next.page;
    return pageHref(actionPath, next, 1);
  };
  const resetHref = query
    ? `${actionPath}?${new URLSearchParams({ q: query }).toString()}`
    : actionPath;
  const filterFormKey = Object.entries(params)
    .filter(([, current]) => typeof current === "string")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, current]) => `${key}=${current}`)
    .join("&");
  useEffect(() => {
    if (filterNavigationPending || !pendingFilterFocus.current) return;
    const targetId = pendingFilterFocus.current;
    const frame = requestAnimationFrame(() => {
      document.getElementById(targetId)?.focus();
      pendingFilterFocus.current = "";
    });
    return () => cancelAnimationFrame(frame);
  }, [filterFormKey, filterNavigationPending]);
  const updateHierarchy = (prefix: "desktop" | "mobile", key: "family" | "platform" | "model", nextValue: string) => {
    pendingFilterFocus.current = key === "family" && nextValue ? `${prefix}-taxonomy-secondary` : `${prefix}-taxonomy-${key === "family" ? "primary" : "secondary"}`;
    const href = pageHref(actionPath, updateTaxonomyFilterParams(params, key, nextValue), 1);
    startFilterNavigation(() => router.push(href, { scroll: false }));
  };
  const updatePcFilter = (prefix: "desktop" | "mobile", key: string, nextValue: string) => {
    const next = updateTaxonomyFilterParams(taxonomyDisplayParams, key, nextValue);
    const nextFields = getTaxonomyFields("pc-components", next as ListingAttributes);
    const currentIndex = nextFields.findIndex((field) => field.key === key);
    const nextField = nextValue ? nextFields[currentIndex + 1] : undefined;
    pendingFilterFocus.current = `${prefix}-${nextField?.key ?? (key === "subcategory" ? "taxonomy-primary" : key)}`;
    const href = pageHref(actionPath, next, 1);
    startFilterNavigation(() => router.push(href, { scroll: false }));
  };
  const sidebar = (prefix: "desktop" | "mobile") => (
    <form action={actionPath} className="space-y-7" key={`${prefix}-${filterFormKey}`} aria-busy={filterNavigationPending}>
      {query && <input type="hidden" name="q" value={query} />}
      {value(params, "sort") && <input type="hidden" name="sort" value={value(params, "sort")} />}
      <div>
        <label className="label" htmlFor={`${prefix}-category`}>
          Category
        </label>
        <select
          className="input"
          id={`${prefix}-category`}
          name="category"
          defaultValue={value(params, "category")}
          onChange={(event) => {
            setFilters(false);
            router.push(categoryHref(event.currentTarget.value));
          }}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option value={item.slug} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {selectedRoot?.children?.length ? <>
        <div>
          <label className="label" htmlFor={`${prefix}-taxonomy-primary`}>{selectedCategorySlug === "games" || selectedCategorySlug === "consoles" ? "Platform family" : "Product type"}</label>
          <select className="input" id={`${prefix}-taxonomy-primary`} name={selectedCategorySlug === "games" || selectedCategorySlug === "consoles" ? "family" : "subcategory"} defaultValue={resolvedTaxonomyValue(selectedCategorySlug === "games" || selectedCategorySlug === "consoles" ? "family" : "subcategory")} disabled={filterNavigationPending} onChange={selectedCategorySlug === "games" || selectedCategorySlug === "consoles" ? (event) => updateHierarchy(prefix, "family", event.currentTarget.value) : selectedCategorySlug === "pc-components" ? (event) => updatePcFilter(prefix, "subcategory", event.currentTarget.value) : undefined}>
            <option value="">All {selectedCategorySlug === "games" || selectedCategorySlug === "consoles" ? "families" : "product types"}</option>
            {selectedRoot.children.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </div>
        {(selectedCategorySlug === "games" || selectedCategorySlug === "consoles") && selectedRoot.children.find((item) => item.id === resolvedTaxonomyValue("family"))?.children?.length ? <div>
          <label className="label" htmlFor={`${prefix}-taxonomy-secondary`}>{selectedCategorySlug === "games" ? "Console / Platform" : "Exact console model"}</label>
          <select className="input" id={`${prefix}-taxonomy-secondary`} name={selectedCategorySlug === "games" ? "platform" : "model"} defaultValue={resolvedTaxonomyValue(selectedCategorySlug === "games" ? "platform" : "model")} disabled={filterNavigationPending} onChange={(event) => updateHierarchy(prefix, selectedCategorySlug === "games" ? "platform" : "model", event.currentTarget.value)}>
            <option value="">All {selectedRoot.children.find((item) => item.id === resolvedTaxonomyValue("family"))?.label ?? (selectedCategorySlug === "games" ? "platforms" : "models")}</option>
            {selectedRoot.children.find((item) => item.id === resolvedTaxonomyValue("family"))?.children?.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </div> : null}
      </> : null}
      {["controllers", "peripherals", "vr"].includes(selectedCategorySlug) ? <div>
        <label className="label" htmlFor={`${prefix}-compatibility`}>Compatible platform</label>
        <select className="input" id={`${prefix}-compatibility`} name="compatibility" defaultValue={resolvedTaxonomyValue("compatibility")}><option value="">Any compatible platform</option>{COMPATIBILITY_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
      </div> : null}
      {getTaxonomyFields(selectedCategorySlug, taxonomyDisplayParams as ListingAttributes).filter((field) => field.key !== "compatibility" && !(field.key === "model" && selectedCategorySlug === "consoles") && ["select", "multiselect", "text", "number", "boolean"].includes(field.type)).map((field) => <div key={`${prefix}-${field.key}`}>
        <label className="label" htmlFor={`${prefix}-${field.key}`}>{field.label}</label>
        {field.type === "select" || field.type === "multiselect" ? <select className="input" id={`${prefix}-${field.key}`} name={field.key} defaultValue={resolvedTaxonomyValue(field.key)} disabled={filterNavigationPending && selectedCategorySlug === "pc-components"} onChange={selectedCategorySlug === "pc-components" && pcHardwareDependentKeys(resolvedTaxonomyValue("subcategory"), field.key).length ? (event) => updatePcFilter(prefix, field.key, event.currentTarget.value) : undefined}><option value="">Any {field.label.toLowerCase()}</option>{field.options?.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select> : field.type === "boolean" ? <select className="input" id={`${prefix}-${field.key}`} name={field.key} defaultValue={resolvedTaxonomyValue(field.key)}><option value="">Any</option><option value="true">Yes</option><option value="false">No</option></select> : <input className="input" id={`${prefix}-${field.key}`} name={field.key} type={field.type} min={field.min} max={field.max} defaultValue={resolvedTaxonomyValue(field.key)} />}
      </div>)}
      <fieldset>
        <legend className="label">Price range</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor={`${prefix}-min-price`}>Minimum price</label>
          <input
            className="input"
            id={`${prefix}-min-price`}
            name="min"
            inputMode="decimal"
            type="number"
            min="0"
            placeholder="Min €"
            defaultValue={value(params, "min")}
          />
          <label className="sr-only" htmlFor={`${prefix}-max-price`}>Maximum price</label>
          <input
            className="input"
            id={`${prefix}-max-price`}
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
        <Link prefetch={false} href={resetHref} className="btn-secondary">
          Reset
        </Link>
        <button className="btn-primary w-full" disabled={filterNavigationPending}>Apply filters</button>
      </div>
    </form>
  );
  return (
    <div className="container-page py-7 md:py-12">
      <TaxonomyBreadcrumbs actionPath={actionPath} categorySlug={selectedCategorySlug || undefined} params={taxonomyDisplayParams} />
      <header className={`marketplace-command-deck ${actionPath === "/search" ? "marketplace-command-deck--search" : ""}`}>
        <h1>
          {query ? `Results for “${query}”` : "Marketplace"}
        </h1>
        <p>Find consoles, components, games, and gear from gamers and specialist sellers.</p>
        <div className="marketplace-command-deck__search">
          <SearchBar action={actionPath} defaultValue={query} id="marketplace-query" />
        </div>
        <p className="marketplace-command-deck__count">{total} {total === 1 ? "listing indexed" : "listings indexed"}</p>
        <div className="marketplace-command-deck__bars" aria-hidden="true"><i /><i /><i /></div>
      </header>
      {!query && !params.category && (
        <div className="mb-9">
          <CategoryGrid categories={categories} limit={8} />
        </div>
      )}
      {selectedCategorySlug ? <div className="mb-7"><TaxonomyNavigation actionPath={actionPath} categorySlug={selectedCategorySlug} params={taxonomyDisplayParams} /></div> : null}
      <div className="grid gap-7 md:grid-cols-[240px_minmax(0,1fr)] lg:gap-9">
        <aside className="hidden md:block">
          <div className="sticky top-20 card p-5">
            <h2 className="mb-6 flex items-center justify-between gap-2 font-bold">
              <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters
              </span>
              {activeFilterCount > 0 && <span className="badge border-[#4e417e] bg-[#211a3a] text-[#c8bcff]">{activeFilterCount}</span>}
            </h2>
            {sidebar("desktop")}
          </div>
        </aside>
        <section className="min-w-0" aria-labelledby="marketplace-results-heading">
          <h2 id="marketplace-results-heading" className="sr-only">Marketplace results</h2>
           <div className="mb-5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface)] p-2 min-[375px]:grid-cols-[minmax(0,1fr)_auto_minmax(7.5rem,10rem)] min-[375px]:pl-3 md:flex md:justify-between md:gap-3">
            <p className="text-sm text-[var(--muted)]">
              <strong className="text-white">{total}</strong> {total === 1 ? "listing" : "listings"}
            </p>
            <div className="contents md:flex md:gap-2">
              {hydrated ? <Sheet open={filters} onOpenChange={setFilters}>
                <SheetTrigger asChild>
                  <button type="button" className="btn-secondary touch-manipulation md:hidden">
                    <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters {activeFilterCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-[var(--primary)] text-[10px]">{activeFilterCount}</span>}
                  </button>
                </SheetTrigger>
                <SheetContent id="marketplace-filters-dialog" aria-describedby="marketplace-filter-description">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription id="marketplace-filter-description">Narrow the market by category, price, condition, seller, and location.</SheetDescription>
                  </SheetHeader>
                  <div className="overscroll-contain overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">{sidebar("mobile")}</div>
                </SheetContent>
              </Sheet> : <details className="relative md:hidden">
                <summary className="btn-secondary min-h-11 cursor-pointer list-none touch-manipulation"><SlidersHorizontal className="size-4" aria-hidden="true" /> <span>Filters</span></summary>
                <div className="fixed inset-x-0 bottom-0 z-[61] max-h-[92dvh] overflow-y-auto rounded-t-[1.5rem] bg-[var(--surface)] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl">
                  <h2 className="mb-4 text-xl font-bold">Filters</h2>
                  {sidebar("mobile")}
                </div>
              </details>}
              <form action={actionPath} className={hydrated ? "col-span-2 grid min-w-0 grid-cols-1 gap-2 min-[375px]:col-span-1 md:flex md:w-auto" : "col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:w-auto"}>
                {Object.entries(params)
                  .filter(
                    ([key, item]) =>
                      key !== "sort" && key !== "page" && !isDeprecatedTaxonomyAttribute(key) && typeof item === "string" && item,
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
                   className="input min-h-11 min-w-0 w-full md:w-40"
                  name="sort"
                  defaultValue={value(params, "sort") || (query ? "" : "newest")}
                  onChange={(event) => {
                    const next: ListingQuery = { ...params, sort: event.currentTarget.value };
                    delete next.page;
                    router.push(pageHref(actionPath, next, 1));
                  }}
                  aria-label="Sort listings"
                >
                  {query && <option value="">Relevance</option>}
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price-asc">Price: low</option>
                  <option value="price-desc">Price: high</option>
                </select>
                {!hydrated && <button type="submit" className="btn-secondary min-h-11 px-3">Apply sort</button>}
              </form>
            </div>
          </div>
          {activeFilters.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
            {activeFilters.map((filter) => <Link prefetch={false} key={filter.key} href={withoutFilter(filter.key)} className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface-alt)] px-4 text-sm font-semibold capitalize text-[var(--text-secondary)] hover:text-white" aria-label={`Remove ${filter.key} filter: ${filter.label}`}>{filter.label}<X className="ml-2 size-3.5" aria-hidden="true" /></Link>)}
            <Link prefetch={false} href={resetHref} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--primary-hover)]">Clear all</Link>
          </div>}
          {items.length ? (
            <>
              <ListingGrid listings={items} viewerId={viewerId} favoriteIds={new Set(favoriteIds)} eagerFirst sparseEditorial />
              {total > pageSize && <nav className="mt-9 flex items-center justify-between gap-3 pt-5" aria-label="Marketplace pages">
                {page > 1 ? <Link prefetch={false} className="btn-secondary" href={pageHref(actionPath, params, page - 1)}>Previous</Link> : <span />}
                <p className="text-sm text-[var(--muted)]">Page <strong className="text-white">{page}</strong> of {Math.ceil(total / pageSize)}</p>
                {page < Math.ceil(total / pageSize) ? <Link prefetch={false} className="btn-secondary" href={pageHref(actionPath, params, page + 1)}>Next</Link> : <span />}
              </nav>}
            </>
          ) : (
            <div className="card empty-state">
              <div>
                <span className="empty-state-icon"><SearchX /></span>
                <h2 className="mt-4 text-xl font-bold">No matching listings</h2>
                <p className="mt-2 text-[var(--muted)]">
                  {hasStructuredFilters ? "Structured filters only match listings categorized with those details. Older or unclassified listings may not appear; remove a specification filter to widen the results." : "Try widening your filters or be the first to list one."}
                </p>
                <Link prefetch={false} href="/sell" className="btn-primary mt-5">
                  Create a listing
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
