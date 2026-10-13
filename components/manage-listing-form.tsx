"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { conditions } from "@/lib/constants";
import type { Listing } from "@/lib/types";

export function ManageListingForm({ listing }: { listing: Listing }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState(listing.imageRecords ?? []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          price: formData.get("price"),
          condition: formData.get("condition"),
          location: formData.get("location"),
          shipping: formData.get("shipping") === "on",
          meetup: formData.get("meetup") === "on",
          status: formData.get("status"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      setStatus("Listing updated");
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
    const response = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/profile/listings");
      router.refresh();
    } else {
      const result = await response.json();
      setError(result.error || "Delete failed");
      setBusy(false);
    }
  }

  return <form onSubmit={save} className="surface-panel space-y-5 p-6 sm:p-8">
    <div><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" defaultValue={listing.title} minLength={6} maxLength={120} required /></div>
    <div><label className="label" htmlFor="description">Description</label><textarea className="input min-h-36" id="description" name="description" defaultValue={listing.description} minLength={20} maxLength={5000} required /></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label className="label" htmlFor="price">Price (€)</label><input className="input" id="price" name="price" type="number" min="1" max="1000000" defaultValue={listing.price} required /></div><div><label className="label" htmlFor="condition">Condition</label><select className="input" id="condition" name="condition" defaultValue={listing.condition}>{conditions.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div><div><label className="label" htmlFor="location">Location</label><input className="input" id="location" name="location" defaultValue={listing.location} maxLength={120} required /></div><div><label className="label" htmlFor="status">Status</label><select className="input" id="status" name="status" defaultValue={listing.status}><option value="active">Active</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="removed">Removed</option>{listing.status === "draft" && <option value="draft">Draft</option>}</select></div></div>
    <div className="flex flex-wrap gap-5"><label className="inline-flex items-center gap-2"><input type="checkbox" name="shipping" defaultChecked={listing.shipping} className="size-5 accent-[#7758ff]" /> Shipping</label><label className="inline-flex items-center gap-2"><input type="checkbox" name="meetup" defaultChecked={listing.meetup} className="size-5 accent-[#7758ff]" /> Meetup</label></div>
    <div><h2 className="font-bold">Photos</h2><div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{images.map((image) => <div key={image.id} className="relative aspect-square overflow-hidden rounded-xl"><Image src={image.url} fill alt="Listing photo" className="object-cover" sizes="150px" /><button disabled={busy || images.length <= 1} type="button" onClick={() => removeImage(image.id)} className="absolute right-1 top-1 grid size-9 place-items-center rounded-full bg-black/75 disabled:opacity-40" aria-label="Delete photo" title={images.length <= 1 ? "An active listing must keep one photo" : "Delete photo"}><Trash2 className="size-4" /></button></div>)}</div></div>
    {error && <p className="rounded-xl bg-[#29151a] p-3 text-sm text-[#ff9ca6]" role="alert">{error}</p>}{status && <p className="text-sm text-[var(--success)]" role="status">{status}</p>}
    <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-5"><button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save changes"}</button><button disabled={busy} type="button" onClick={removeListing} className="btn-danger ml-auto"><Trash2 className="size-4" /> Delete listing</button></div>
  </form>;
}
