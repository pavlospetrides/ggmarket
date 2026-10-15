import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getTaxonomyPath } from "@/lib/gaming-taxonomy";
import type { ListingAttributes, ListingQuery } from "@/lib/types";

const stringValue = (params: ListingQuery, key: string) => typeof params[key] === "string" ? params[key] as string : "";
const href = (actionPath: string, params: ListingQuery, keep: string[]) => {
  const search = new URLSearchParams();
  for (const key of ["q", ...keep]) { const value = stringValue(params, key); if (value) search.set(key, value); }
  const query = search.toString();
  return query ? `${actionPath}?${query}` : actionPath;
};

export function TaxonomyBreadcrumbs({ actionPath, categorySlug, params }: { actionPath: string; categorySlug?: string; params: ListingQuery }) {
  const attributes: ListingAttributes = Object.fromEntries(["family", "subcategory", "platform", "model"].flatMap((key) => { const value = stringValue(params, key); return value ? [[key, value]] : []; }));
  const path = categorySlug ? getTaxonomyPath(categorySlug, attributes) : [];
  return <nav className="taxonomy-breadcrumbs" aria-label="Category breadcrumb">
    <Link href={href(actionPath, params, [])}>Marketplace</Link>
    {path.map((item, index) => {
      const keep = item.kind === "root" ? ["category"] : item.kind === "family" ? ["category", "family"] : ["category", "family", "subcategory", item.kind === "platform" ? "platform" : "model"];
      return <span className="inline-flex min-w-0 items-center gap-1.5" key={`${item.kind}-${item.id}`}><ChevronRight className="size-3.5 shrink-0" aria-hidden="true" /><Link className="min-w-0 break-words" href={href(actionPath, params, keep)} aria-current={index === path.length - 1 ? "page" : undefined}>{item.label}</Link></span>;
    })}
  </nav>;
}
