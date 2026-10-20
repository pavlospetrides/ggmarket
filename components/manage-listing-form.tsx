"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { conditions } from "@/lib/constants";
import { normalizeTaxonomyAttributes } from "@/lib/gaming-taxonomy";
import type { Category, Listing, ListingAttributes } from "@/lib/types";
import { TaxonomyAttributeFields } from "./taxonomy-attribute-fields";
import { buildListingTaxonomyAttributes, TaxonomySelector, type TaxonomySelection } from "./taxonomy-selector";
import { useHydrated } from "./use-hydrated";

export function ManageListingForm({ listing, categories }: { listing: Listing; categories: Category[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState(listing.imageRecords ?? []);
  const [dirty, setDirty] = useState(false);
  const [taxonomyDirty, setTaxonomyDirty] = useState(false);
  const normalizedAttributes = normalizeTaxonomyAttributes(listing.category.slug, listing.attributes);
  const initialProductName = typeof listing.attributes.product_name === "string" ? listing.attributes.product_name : listing.title;
  const [categoryId, setCategoryId] = useState(listing.category.id);
  const selectedCategory = categories.find((category) => category.id === categoryId) ?? listing.category;
  const [taxonomySelection, setTaxonomySelection] = useState<TaxonomySelection>({
    categorySlug: listing.category.slug,
    family: typeof normalizedAttributes.family === "string" ? normalizedAttributes.family : undefined,
    subcategory: typeof normalizedAttributes.subcategory === "string" ? normalizedAttributes.subcategory : undefined,
    platform: typeof normalizedAttributes.platform === "string" ? normalizedAttributes.platform : undefined,
    model: typeof normalizedAttributes.model === "string" ? normalizedAttributes.model : undefined,
  });
  const [taxonomyAttributes, setTaxonomyAttributes] = useState<ListingAttributes>(normalizedAttributes);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLinkNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Discard your unsaved changes?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, [dirty]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    const formData = new FormData(event.currentTarget);
    const productName = String(formData.get("productName") ?? "");
    const productNameChanged = productName !== initialProductName;
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      price: formData.get("price"),
      condition: formData.get("condition"),
      location: formData.get("location"),
      shipping: formData.get("shipping") === "on",
      meetup: formData.get("meetup") === "on",
      status: formData.get("status"),
      ...(taxonomyDirty ? {
        categoryId,
        productName,
        attributes: buildListingTaxonomyAttributes(taxonomySelection, taxonomyAttributes, listing.attributes),
      } : productNameChanged ? { productName } : {}),
    };
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      setStatus("Listing updated");
      setDirty(false);
      setTaxonomyDirty(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/listing-images/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Image deletion failed");
      setImages((current) => current.filter((image) => image.id !== id));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image deletion failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeListing() {
    if (!window.confirm("Delete this listing and all of its photos? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Delete failed");
      router.push("/profile/listings");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return <form data-hydrated={hydrated} onSubmit={save} onChange={() => setDirty(true)} className="surface-panel p-6 sm:p-8" aria-busy={!hydrated || busy}>
    {!hydrated ? <p className="mb-4 text-sm text-[var(--muted)]" role="status">Preparing listing editorâ€¦</p> : null}
    <fieldset disabled={!hydrated || busy} className="min-w-0 space-y-5 border-0 p-0">
    <legend className="sr-only">Edit listing information</legend>
    <div><label className="label" htmlFor="edit-category">Category</label><select className="input" id="edit-category" value={categoryId} onChange={(event) => { const next = categories.find((category) => category.id === event.target.value); setCategoryId(event.target.value); setTaxonomySelection({ categorySlug: next?.slug ?? "" }); setTaxonomyAttributes({}); setTaxonomyDirty(true); setDirty(true); }}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div>
    <TaxonomySelector selection={taxonomySelection} onChange={(next) => { setTaxonomySelection(next); setTaxonomyDirty(true); setDirty(true); }} />
    <div><label className="label" htmlFor="edit-product-name">Product or model name</label><input className="input" id="edit-product-name" name="productName" minLength={2} maxLength={160} defaultValue={initialProductName} required /></div>
    <TaxonomyAttributeFields categorySlug={selectedCategory.slug} selectionAttributes={buildListingTaxonomyAttributes(taxonomySelection, {})} values={taxonomyAttributes} enforceRequired={taxonomyDirty} onChange={(next) => { setTaxonomyAttributes(next); setTaxonomyDirty(true); setDirty(true); }} />
    <div><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" defaultValue={listing.title} minLength={6} maxLength={120} required /></div>
    <div><label className="label" htmlFor="description">Description</label><textarea className="input min-h-36" id="description" name="description" defaultValue={listing.description} minLength={1} maxLength={5000} required /></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label className="label" htmlFor="price">Price (€)</label><input className="input" id="price" name="price" type="number" min="1" max="1000000" defaultValue={listing.price} required /></div><div><label className="label" htmlFor="condition">Condition</label><select className="input" id="condition" name="condition" defaultValue={listing.condition}>{conditions.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div><div><label className="label" htmlFor="location">Location</label><input className="input" id="location" name="location" defaultValue={listing.location} maxLength={120} required /></div><div><label className="label" htmlFor="status">Status</label><select className="input" id="status" name="status" defaultValue={listing.status}><option value="active">Active</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="removed">Removed</option>{listing.status === "draft" && <option value="draft">Draft</option>}</select></div></div>
    <div className="flex flex-wrap gap-5"><label className="inline-flex items-center gap-2"><input type="checkbox" name="shipping" defaultChecked={listing.shipping} className="size-5 accent-[#7758ff]" /> Shipping</label><label className="inline-flex items-center gap-2"><input type="checkbox" name="meetup" defaultChecked={listing.meetup} className="size-5 accent-[#7758ff]" /> Meetup</label></div>
    <div><h2 className="font-bold">Photos</h2><div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{images.map((image) => <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl"><Image src={image.url} fill alt="Listing photo" className="object-cover" sizes="150px" /><button disabled={busy || images.length <= 1} type="button" onClick={() => removeImage(image.id)} className="absolute right-1 top-1 grid size-9 place-items-center rounded-full bg-black/75 disabled:opacity-40" aria-label="Delete photo" title={images.length <= 1 ? "An active listing must keep one photo" : "Delete photo"}><Trash2 className="size-4" /></button></div>)}</div></div>
    {error && <p ref={errorRef} tabIndex={-1} className="rounded-xl bg-[#29151a] p-3 text-sm text-[#ff9ca6]" role="alert">{error}</p>}{status && <p className="text-sm text-[var(--success)]" role="status" aria-live="polite">{status}</p>}
    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row"><button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? "Saving…" : "Save changes"}</button><button disabled={busy} type="button" onClick={removeListing} className="btn-danger w-full sm:ml-auto sm:w-auto"><Trash2 className="size-4" /> Delete listing</button></div>
    </fieldset>
  </form>;
}
