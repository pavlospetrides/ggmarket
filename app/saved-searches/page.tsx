import { BellRing } from "lucide-react";
import { SavedSearchesManager } from "@/components/saved-searches-manager";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { getSavedSearches } from "@/lib/phase2-data";

export default async function SavedSearchesPage() {
  const user = await requireUser("/saved-searches");
  const [items, categories] = await Promise.all([getSavedSearches(user.id), getCategories()]);
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <div className="page-header min-w-0"><p className="eyebrow">Automatic discovery</p><h1 className="page-title flex min-w-0 items-center gap-3"><BellRing className="shrink-0 text-[#aa98ff]" aria-hidden="true" /> Saved searches</h1><p className="page-description">Create an in-app alert when a newly published listing matches your criteria.</p></div>
    <SavedSearchesManager initial={items} categories={categories} />
  </div>;
}
