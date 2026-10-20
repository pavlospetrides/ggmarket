"use client";

import { ChevronRight } from "lucide-react";
import { getTaxonomyFields, getTaxonomyPath, getTaxonomyRoot, TAXONOMY_FIELD_KEYS } from "../lib/gaming-taxonomy";
import type { ListingAttributes } from "../lib/types";

export type TaxonomySelection = {
  categorySlug: string;
  family?: string;
  subcategory?: string;
  platform?: string;
  model?: string;
};

const structuralKeys = new Set(["taxonomy_version", "subcategory", "family", "platform", "model", "compatibility"]);

export function isTaxonomySelectionComplete(selection: TaxonomySelection): boolean {
  const root = getTaxonomyRoot(selection.categorySlug);
  if (!root || !root.children?.length) return true;
  if (selection.categorySlug === "games") return Boolean(selection.family && selection.platform);
  if (selection.categorySlug === "consoles") return Boolean(selection.family && selection.model);
  return Boolean(selection.subcategory);
}

export function buildListingTaxonomyAttributes(
  selection: TaxonomySelection,
  fields: ListingAttributes,
  preserved: ListingAttributes = {},
): ListingAttributes {
  const selectionAttributes: ListingAttributes = { ...(selection.subcategory ? { subcategory: selection.subcategory } : {}), ...(selection.family ? { family: selection.family } : {}), ...(selection.platform ? { platform: selection.platform } : {}), ...(selection.model ? { model: selection.model } : {}) };
  const allowedFieldKeys = new Set(getTaxonomyFields(selection.categorySlug, { ...fields, ...selectionAttributes }).map((field) => field.key));
  const next: ListingAttributes = {};
  for (const [key, value] of Object.entries(preserved)) {
    if (!structuralKeys.has(key) && !TAXONOMY_FIELD_KEYS.has(key)) next[key] = value;
  }
  next.taxonomy_version = "1";
  if (selection.categorySlug === "games") next.subcategory = "game";
  if (selection.subcategory) next.subcategory = selection.subcategory;
  if (selection.family) next.family = selection.family;
  if (selection.platform) next.platform = selection.platform;
  if (selection.model) next.model = selection.model;
  for (const [key, value] of Object.entries(fields)) {
    if (allowedFieldKeys.has(key)) next[key] = value;
  }
  return next;
}

export function TaxonomySelector({ selection, onChange, error }: { selection: TaxonomySelection; onChange: (selection: TaxonomySelection) => void; error?: string }) {
  const root = getTaxonomyRoot(selection.categorySlug);
  if (!root?.children?.length) return null;
  const isFamilyTree = selection.categorySlug === "games" || selection.categorySlug === "consoles";
  const chosenParent = isFamilyTree ? root.children.find((item) => item.id === selection.family) : undefined;
  const pathAttributes: ListingAttributes = { ...(selection.family ? { family: selection.family } : {}), ...(selection.subcategory ? { subcategory: selection.subcategory } : {}), ...(selection.platform ? { platform: selection.platform } : {}), ...(selection.model ? { model: selection.model } : {}) };
  const path = getTaxonomyPath(selection.categorySlug, pathAttributes);
  const missingLevel = error
    ? (isFamilyTree ? (selection.family ? "two" : "one") : "one")
    : undefined;
  return <div className="mt-6 space-y-5">
    <div>
      <label className="label" htmlFor="taxonomy-level-one">{isFamilyTree ? "Platform family" : "Product type"}</label>
      <select
        id="taxonomy-level-one"
        className="input"
        value={isFamilyTree ? selection.family ?? "" : selection.subcategory ?? ""}
        aria-invalid={missingLevel === "one"}
        aria-describedby={missingLevel === "one" ? "taxonomy-error" : undefined}
        onChange={(event) => onChange(isFamilyTree
          ? { categorySlug: selection.categorySlug, family: event.target.value || undefined }
          : { categorySlug: selection.categorySlug, subcategory: event.target.value || undefined })}
      >
        <option value="">Choose {isFamilyTree ? "a family" : "a product type"}</option>
        {root.children.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
      </select>
    </div>
    {chosenParent?.children?.length ? <div>
      <label className="label" htmlFor="taxonomy-level-two">{selection.categorySlug === "games" ? "Console / Platform" : "Exact console model"}</label>
      <select
        id="taxonomy-level-two"
        className="input"
        value={selection.categorySlug === "games" ? selection.platform ?? "" : selection.model ?? ""}
        aria-invalid={missingLevel === "two"}
        aria-describedby={missingLevel === "two" ? "taxonomy-error" : undefined}
        onChange={(event) => onChange({ ...selection, ...(selection.categorySlug === "games" ? { platform: event.target.value || undefined } : { model: event.target.value || undefined }) })}
      >
        <option value="">Choose {selection.categorySlug === "games" ? "a platform" : "a model"}</option>
        {chosenParent.children.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
      </select>
    </div> : null}
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-4" aria-live="polite">
      <span className="block text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">You’re listing in</span>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)]">
        {path.map((item, index) => <span className="inline-flex min-w-0 items-center gap-1.5" key={`${item.kind}-${item.id}`}><span className="break-words">{item.label}</span>{index < path.length - 1 ? <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" /> : null}</span>)}
      </div>
    </div>
    {error ? <p id="taxonomy-error" className="text-sm text-[var(--danger)]" role="alert" aria-live="assertive">{error}</p> : null}
  </div>;
}
