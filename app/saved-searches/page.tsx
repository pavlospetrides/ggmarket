import { BellRing } from "lucide-react";
import { SavedSearchesManager } from "@/components/saved-searches-manager";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { getSavedSearches } from "@/lib/phase2-data";

export default async function SavedSearchesPage() { const user = await requireUser("/saved-searches"); const [items, categories] = await Promise.all([getSavedSearches(user.id), getCategories()]); return <div className="container-page py-8 md:py-12"><div className="mb-8"><p className="eyebrow">Automatic discovery</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><BellRing className="text-[#aa98ff]" /> Saved searches</h1><p className="mt-3 max-w-2xl text-[var(--muted)]">Create an in-app alert when a newly published listing matches your criteria.</p></div><SavedSearchesManager initial={items} categories={categories} /></div>; }
