import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GAMING_TAXONOMY, getTaxonomyRoot, isTaxonomyFilterKey } from "@/lib/gaming-taxonomy";
import type { ListingQuery } from "@/lib/types";

const stringValue = (params: ListingQuery, key: string) => typeof params[key] === "string" ? params[key] as string : "";
function queryHref(actionPath: string, params: ListingQuery, additions: Record<string, string>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value && key !== "page" && key !== "category" && !isTaxonomyFilterKey(key)) search.set(key, value);
  }
  for (const [key, value] of Object.entries(additions)) {
    if (value) search.set(key, value);
    else search.delete(key);
  }
  return `${actionPath}?${search.toString()}`;
}

export function TaxonomyNavigation({ actionPath = "/marketplace", categorySlug, params = {}, directory = false }: { actionPath?: string; categorySlug?: string; params?: ListingQuery; directory?: boolean }) {
  if (directory || !categorySlug) return <div className="taxonomy-directory">{GAMING_TAXONOMY.map((root) => <Link className="taxonomy-directory-item" href={queryHref(actionPath, params, { category: root.categorySlug })} key={root.id}><span><strong>{root.label}</strong><small>{root.children?.length ? `${root.children.length} ways to browse` : "Focused gear category"}</small></span><ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link>)}</div>;
  const root = getTaxonomyRoot(categorySlug);
  if (!root?.children?.length) return null;
  const selectedParentId = stringValue(params, categorySlug === "games" || categorySlug === "consoles" ? "family" : "subcategory");
  const selectedParent = root.children.find((item) => item.id === selectedParentId);
  return <div className="taxonomy-navigator" aria-label={`Browse ${root.label}`}>
    <div className="taxonomy-choice-row">{root.children.map((item) => {
      const key = categorySlug === "games" || categorySlug === "consoles" ? "family" : "subcategory";
      return <Link className="taxonomy-choice" data-active={selectedParentId === item.id || undefined} href={queryHref(actionPath, params, { category: categorySlug, [key]: item.id })} key={item.id}>{item.label}</Link>;
    })}</div>
    {selectedParent?.children?.length ? <div className="taxonomy-choice-row taxonomy-choice-row-secondary">{selectedParent.children.map((item) => { const parentKey = categorySlug === "games" || categorySlug === "consoles" ? "family" : "subcategory"; const key = categorySlug === "games" ? "platform" : "model"; return <Link className="taxonomy-choice" data-active={stringValue(params, key) === item.id || undefined} href={queryHref(actionPath, params, { category: categorySlug, [parentKey]: selectedParent.id, [key]: item.id })} key={item.id}>{item.label}</Link>; })}</div> : null}
  </div>;
}
