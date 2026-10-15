"use client";
import { BellRing, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Category } from "@/lib/types";

type SavedSearch = {
  id: string;
  name: string;
  search_term: string | null;
  category_id: string | null;
  condition: string | null;
  intent: string | null;
  min_price: number | null;
  max_price: number | null;
  location: string | null;
  enabled: boolean;
};
export function SavedSearchesManager({
  initial,
  categories,
}: {
  initial: SavedSearch[];
  categories: Category[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createBusy) return;
    setError("");
    setCreateBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          searchTerm: data.get("searchTerm") || null,
          categoryId: data.get("categoryId") || null,
          intent: data.get("intent") || null,
          minPrice: data.get("minPrice") ? Number(data.get("minPrice")) : null,
          maxPrice: data.get("maxPrice") ? Number(data.get("maxPrice")) : null,
          location: data.get("location") || null,
          enabled: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "The alert could not be created. Try again.");
        return;
      }
      form.reset();
      setItems((current) => [result as SavedSearch, ...current]);
      router.refresh();
    } catch {
      setError("The alert could not be created. Try again.");
    } finally {
      setCreateBusy(false);
    }
  }
  async function toggle(item: SavedSearch) {
    if (busyId) return;
    setError("");
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/saved-searches/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      if (!response.ok) throw new Error("Request failed");
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, enabled: !value.enabled } : value,
        ),
      );
    } catch {
      setError("The alert could not be updated. Try again.");
    } finally {
      setBusyId(null);
    }
  }
  async function rename(item: SavedSearch) {
    const name = draftName.trim();
    if (!name) return;
    if (name === item.name) { setEditingId(null); return; }
    if (busyId) return;
    setError("");
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/saved-searches/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Request failed");
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, name } : value,
        ),
      );
      setEditingId(null);
    } catch {
      setError("The alert could not be updated. Try again.");
    } finally {
      setBusyId(null);
    }
  }
  async function remove(id: string) {
    if (busyId) return;
    setError("");
    setBusyId(id);
    try {
      const response = await fetch(`/api/saved-searches/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Request failed");
      setItems((current) => current.filter((item) => item.id !== id));
      setPendingDeleteId(null);
    } catch {
      setError("The alert could not be deleted. Try again.");
    } finally {
      setBusyId(null);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={create} className="surface-panel h-fit space-y-4 p-5 sm:sticky sm:top-20 sm:p-6">
        <h2 className="text-xl font-bold">Create alert</h2>
        <div>
          <label className="label" htmlFor="alert-name">
            Alert name
          </label>
          <input
            className="input"
            id="alert-name"
            name="name"
            maxLength={80}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="alert-term">
            Search term
          </label>
          <input
            className="input"
            id="alert-term"
            name="searchTerm"
            maxLength={120}
            placeholder="e.g. RTX 4070"
          />
        </div>
        <div>
          <label className="label" htmlFor="alert-category">
            Category
          </label>
          <select className="input" id="alert-category" name="categoryId">
            <option value="">Any category</option>
            {categories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="alert-intent">
            Intent
          </label>
          <select className="input" id="alert-intent" name="intent">
            <option value="">Any intent</option>
            <option value="sale">For sale</option>
            <option value="wanted">Wanted</option>
            <option value="trade">Trade</option>
            <option value="sale_or_trade">Sale or trade</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            name="minPrice"
            type="number"
            min="1"
            placeholder="Min €"
            aria-label="Minimum price"
          />
          <input
            className="input"
            name="maxPrice"
            type="number"
            min="1"
            placeholder="Max €"
            aria-label="Maximum price"
          />
        </div>
        <input
          className="input"
          name="location"
          maxLength={120}
          placeholder="Location"
          aria-label="Location"
        />
        {error && (
          <p role="alert" aria-live="polite" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <button disabled={createBusy} className="btn-primary w-full">
          <Plus className="size-4" /> {createBusy ? "Creating…" : "Create alert"}
        </button>
      </form>
      <section>
        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <article
                key={item.id}
                className="card card-interactive grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden p-4 sm:p-5"
              >
                <span
                  className={`grid size-11 place-items-center rounded-xl ${item.enabled ? "bg-[#213729] text-[var(--success)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}
                >
                  <BellRing className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  {editingId === item.id ? <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><label className="sr-only" htmlFor={`rename-${item.id}`}>Edit alert name</label><input id={`rename-${item.id}`} className="input min-h-10 min-w-0 py-2" value={draftName} maxLength={80} autoFocus disabled={busyId === item.id} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void rename(item); } if (event.key === "Escape" && !busyId) setEditingId(null); }} /><button type="button" disabled={busyId === item.id} className="icon-btn size-10 min-h-10" onClick={() => void rename(item)} aria-label="Save alert name"><Check className="size-4" aria-hidden="true" /></button><button type="button" disabled={busyId === item.id} className="icon-btn size-10 min-h-10" onClick={() => setEditingId(null)} aria-label="Cancel rename"><X className="size-4" aria-hidden="true" /></button></div> : <h2 className="min-w-0 font-bold [overflow-wrap:anywhere]">{item.name}</h2>}
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">
                    {[
                      item.search_term,
                      item.intent?.replaceAll("_", " "),
                      item.location,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "All matching listings"}
                  </p>
                </div>
                <div className="col-span-2 grid min-w-0 grid-cols-[auto_1fr_auto] gap-2 sm:flex sm:justify-end">
                  <button type="button" disabled={busyId !== null} onClick={() => { setEditingId(item.id); setDraftName(item.name); }} className="icon-btn border-transparent bg-transparent" aria-label={`Rename ${item.name}`}><Pencil className="size-4" aria-hidden="true" /></button>
                  <button type="button" disabled={busyId !== null} onClick={() => void toggle(item)} className="btn-secondary min-w-0">{item.enabled ? "Pause" : "Enable"}</button>
                  <button type="button" disabled={busyId !== null} onClick={() => setPendingDeleteId(item.id)} className="icon-btn border-transparent bg-transparent text-[var(--danger)]" aria-label={`Delete ${item.name}`}><Trash2 className="size-4" aria-hidden="true" /></button>
                </div>
                {pendingDeleteId === item.id ? (
                  <div className="col-span-2 rounded-[var(--radius-md)] bg-[#2e1b24] p-3" role="alert">
                    <p className="text-sm text-[#ffc1c7]">Delete this alert? This cannot be undone.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" className="btn-secondary" disabled={busyId === item.id} onClick={() => setPendingDeleteId(null)}>Cancel delete</button>
                      <button type="button" className="btn-danger" disabled={busyId === item.id} onClick={() => void remove(item.id)}>Confirm delete</button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="card empty-state"><div><span className="empty-state-icon"><BellRing /></span><h2 className="mt-4 font-bold text-white">No saved searches yet</h2><p className="mt-2 text-sm text-[var(--muted)]">Create an alert and we&apos;ll watch the marketplace for you.</p></div></div>
          )}
        </div>
      </section>
    </div>
  );
}
