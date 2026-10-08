"use client";
import { BellRing, Pencil, Plus, Trash2 } from "lucide-react";
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
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
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
      setError(result.error);
      return;
    }
    form.reset();
    setItems((current) => [result as SavedSearch, ...current]);
    router.refresh();
  }
  async function toggle(item: SavedSearch) {
    const response = await fetch(`/api/saved-searches/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    if (response.ok)
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, enabled: !value.enabled } : value,
        ),
      );
  }
  async function rename(item: SavedSearch) {
    const name = window.prompt("Alert name", item.name)?.trim();
    if (!name || name === item.name) return;
    const response = await fetch(`/api/saved-searches/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok)
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, name } : value,
        ),
      );
    else setError("The alert could not be updated.");
  }
  async function remove(id: string) {
    const response = await fetch(`/api/saved-searches/${id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setItems((current) => current.filter((item) => item.id !== id));
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={create} className="card h-fit space-y-4 p-5 sm:p-6">
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
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <button className="btn-primary w-full">
          <Plus className="size-4" /> Create alert
        </button>
      </form>
      <section>
        <div className="space-y-3">
          {items.length ? (
            items.map((item) => (
              <article
                key={item.id}
                className="card flex flex-wrap items-center gap-4 p-5"
              >
                <span
                  className={`grid size-11 place-items-center rounded-xl ${item.enabled ? "bg-[#213729] text-[var(--success)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}
                >
                  <BellRing className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{item.name}</h2>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">
                    {[
                      item.search_term,
                      item.intent?.replaceAll("_", " "),
                      item.location,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "All matching listings"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => rename(item)}
                  className="grid size-11 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-2)]"
                  aria-label={`Rename ${item.name}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="btn-secondary"
                >
                  {item.enabled ? "Pause" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="grid size-11 place-items-center rounded-xl text-[var(--danger)] hover:bg-[var(--surface-2)]"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </article>
            ))
          ) : (
            <div className="card p-10 text-center text-[var(--muted)]">
              No saved searches yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
