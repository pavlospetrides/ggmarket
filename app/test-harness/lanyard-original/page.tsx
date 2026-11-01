import { notFound } from "next/navigation";
import LanyardBadge from "@/components/ui/lanyard-badge";

export const dynamic = "force-dynamic";

export default function OriginalLanyardHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return (
    <main className="min-h-screen bg-[#f1ede5]" aria-label="Original lanyard reference">
      <LanyardBadge height="100svh" />
    </main>
  );
}
