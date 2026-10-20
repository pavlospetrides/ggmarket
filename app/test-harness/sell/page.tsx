import { notFound } from "next/navigation";
import { SellWizard } from "@/components/sell-wizard";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

const categories: Category[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Games", slug: "games", icon: "gamepad" },
  { id: "22222222-2222-4222-8222-222222222222", name: "PC Components", slug: "pc-components", icon: "cpu" },
];

export default function SellInteractionHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return <main className="container-page min-w-0 pb-28 pt-8">
    <h1 className="sr-only">Sell interaction test harness</h1>
    <SellWizard categories={categories} />
  </main>;
}
