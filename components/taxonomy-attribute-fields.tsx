"use client";

import { getTaxonomyFields } from "../lib/gaming-taxonomy";
import { updatePcHardwareAttribute } from "../lib/pc-hardware-taxonomy";
import type { AttributeValue, ListingAttributes } from "../lib/types";

export function TaxonomyAttributeFields({ categorySlug, selectionAttributes, values, onChange, enforceRequired = true, collapsible = false }: { categorySlug: string; selectionAttributes: ListingAttributes; values: ListingAttributes; onChange: (next: ListingAttributes) => void; enforceRequired?: boolean; collapsible?: boolean }) {
  const resolvedAttributes = { ...values, ...selectionAttributes };
  const fields = getTaxonomyFields(categorySlug, resolvedAttributes);
  if (!fields.length) return null;
  const update = (key: string, value: AttributeValue | undefined) => {
    const next = categorySlug === "pc-components" ? updatePcHardwareAttribute(resolvedAttributes, key, value) : { ...values };
    if (categorySlug !== "pc-components") {
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) delete next[key]; else next[key] = value;
    }
    onChange(next);
  };
  const renderField = (field: (typeof fields)[number]) => {
      const id = `taxonomy-field-${field.key}`;
      if (field.type === "boolean") return <label key={field.key} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl bg-[var(--surface-alt)] px-4 py-3"><span>{field.label}</span><input type="checkbox" className="size-5 accent-[#7758ff]" checked={values[field.key] === true} onChange={(event) => update(field.key, event.target.checked)} /></label>;
      if (field.type === "multiselect") {
        const selected = Array.isArray(values[field.key]) ? values[field.key] as string[] : [];
        return <fieldset key={field.key}><legend className="label">{field.label}</legend><div className="grid gap-2 sm:grid-cols-2">{field.options?.map((item) => <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-sm" key={item.value}><input type="checkbox" className="size-5 shrink-0 accent-[#7758ff]" checked={selected.includes(item.value)} onChange={(event) => update(field.key, event.target.checked ? [...selected, item.value] : selected.filter((value) => value !== item.value))} /><span>{item.label}</span></label>)}</div></fieldset>;
      }
      if (field.type === "select") return <div key={field.key}><label className="label" htmlFor={id}>{field.label}</label><select id={id} className="input" value={typeof values[field.key] === "string" ? values[field.key] as string : ""} required={enforceRequired && field.required} onChange={(event) => update(field.key, event.target.value)}><option value="">Choose {field.label.toLowerCase()}</option>{field.options?.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div>;
      return <div key={field.key}><label className="label" htmlFor={id}>{field.label}</label><input id={id} className="input" type={field.type} min={field.min} max={field.max} placeholder={field.placeholder} required={enforceRequired && field.required} value={typeof values[field.key] === "string" || typeof values[field.key] === "number" ? values[field.key] as string | number : ""} onChange={(event) => update(field.key, field.type === "number" ? event.target.value ? Number(event.target.value) : undefined : event.target.value)} /></div>;
  };
  if (!collapsible) return <fieldset className="mt-6 space-y-5"><legend className="text-base font-bold">Product details</legend>{fields.map(renderField)}</fieldset>;
  const essential = fields.filter((field) => field.required);
  const optional = fields.filter((field) => !field.required);
  return <div className="mt-6 space-y-5">
    {essential.length ? <fieldset className="space-y-5"><legend className="sr-only">Required product details</legend>{essential.map(renderField)}</fieldset> : null}
    {optional.length ? <details className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4"><summary className="cursor-pointer font-bold">Additional details (optional)</summary><fieldset className="mt-5 space-y-5"><legend className="sr-only">Additional details (optional)</legend>{optional.map(renderField)}</fieldset><p className="mt-5 text-xs leading-5 text-[var(--muted)]">Grading, certification, and authenticity details are seller-provided information. Lootriva does not verify or guarantee them.</p></details> : null}
  </div>;
}
