import { notFound } from "next/navigation";
import { ManageListingForm } from "@/components/manage-listing-form";
import type { Category, Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

const categories: Category[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Games", slug: "games", icon: "gamepad" },
  { id: "22222222-2222-4222-8222-222222222222", name: "PC Components", slug: "pc-components", icon: "cpu" },
  { id: "77777777-7777-4777-8777-777777777777", name: "Gaming PCs", slug: "gaming-pcs", icon: "monitor" },
];

const listing: Listing = {
  id: "33333333-3333-4333-8333-333333333333",
  slug: "existing-test-listing",
  title: "Existing test listing",
  description: "Existing test description used only by the safe interaction harness.",
  price: 450,
  currency: "EUR",
  location: "Test City",
  condition: "like_new",
  status: "active",
  category: categories[0],
  images: ["/icon.svg", "/icon.svg"],
  imageRecords: [
    { id: "44444444-4444-4444-8444-444444444444", path: "test/one.svg", url: "/icon.svg" },
    { id: "55555555-5555-4555-8555-555555555555", path: "test/two.svg", url: "/icon.svg" },
  ],
  seller: {
    id: "66666666-6666-4666-8666-666666666666",
    username: "interaction_harness",
    displayName: "Interaction Harness",
    rating: 0,
    reviewCount: 0,
    verified: false,
    memberSince: "2026-01-01T00:00:00.000Z",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  views: 0,
  shipping: true,
  meetup: true,
  attributes: {
    taxonomy_version: "1",
    subcategory: "game",
    family: "playstation",
    platform: "ps5",
    product_name: "PlayStation 5 Slim",
  },
};

const gamingPcListing: Listing = {
  ...listing,
  title: "Restored Gaming PC draft",
  description: "A deterministic draft fixture for category-specific specification restoration.",
  status: "draft",
  category: categories[2],
  attributes: {
    taxonomy_version: "1",
    subcategory: "complete-gaming-pc",
    product_name: "Custom Ryzen Gaming PC",
    cpu: "Ryzen 7 7800X3D",
    gpu: "RTX 4070",
    ram: "16 GB",
    storage: "1 TB NVMe",
  },
};

export default async function EditListingInteractionHarnessPage({ searchParams }: { searchParams: Promise<{ fixture?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const params = await searchParams;
  const selectedListing = params.fixture === "gaming-pc" ? gamingPcListing : listing;
  return <main className="container-page min-w-0 pb-28 pt-8">
    <h1 className="mb-6 text-3xl font-black">Edit listing interaction test harness</h1>
    <ManageListingForm listing={selectedListing} categories={categories} />
  </main>;
}
