import { notFound } from "next/navigation";
import { GGCardSection } from "@/components/gg-card-section";
import { DEFAULT_GG_CARD } from "@/lib/gg-card";

export const dynamic = "force-dynamic";

export default function GGCardHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const identity = { displayName: "Synthetic Player", username: "synthetic-player" };
  return (
    <main className="container-page py-8">
      <h1 className="text-3xl font-bold">Lootriva Card interaction harness</h1>
      <div data-testid="public-card"><GGCardSection own={false} identity={identity} card={{ ...DEFAULT_GG_CARD, slogan: "Public synthetic card", isPublic: true }} /></div>
      <div data-testid="private-card"><GGCardSection own={false} identity={identity} card={null} /></div>
      <div data-testid="owner-card"><GGCardSection own identity={identity} card={DEFAULT_GG_CARD} /></div>
    </main>
  );
}
