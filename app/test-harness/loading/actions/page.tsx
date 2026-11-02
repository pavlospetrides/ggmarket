import { notFound } from "next/navigation";
import { SavedSearchesManager } from "@/components/saved-searches-manager";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

const categories = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Games", slug: "games", icon: "gamepad" },
];

const savedSearches = [{
  id: "alert-1",
  name: "Console deals",
  search_term: "console",
  category_id: categories[0].id,
  condition: null,
  intent: "sale",
  min_price: null,
  max_price: 500,
  location: null,
  enabled: true,
}];

export default function LoadingActionsHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();

  return (
    <main className="container-page space-y-10 py-10">
      <SettingsForm
        email="test@example.com"
        username="test_user"
        displayName="Test User"
        location="Athens"
        bio="Test profile"
      />
      <SavedSearchesManager initial={savedSearches} categories={categories} />
    </main>
  );
}
