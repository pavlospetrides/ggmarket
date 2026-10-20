import { BellRing } from "lucide-react";
import { SavedSearchesManager } from "@/components/saved-searches-manager";
import { PageMasthead } from "@/components/page-masthead";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { getSavedSearches } from "@/lib/phase2-data";

export default async function SavedSearchesPage() {
  const user = await requireUser("/saved-searches");
  const [items, categories] = await Promise.all([getSavedSearches(user.id), getCategories()]);
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Automatic discovery" title="Saved searches" description="Create an in-app alert when a newly published listing matches your criteria." variant="communication" meta={<span className="inline-flex items-center gap-2"><BellRing className="size-4" aria-hidden="true" /> {items.length} active watches</span>} />
    <SavedSearchesManager initial={items} categories={categories} />
  </div>;
}
