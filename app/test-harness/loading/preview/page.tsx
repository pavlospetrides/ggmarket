import { notFound } from "next/navigation";
import { Loader2 } from "@/components/ui/loader-2";

export default function LoadingPreviewHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();

  return (
    <section className="container-page min-h-[55svh] py-12" data-ui>
      <h1 className="text-3xl font-bold">Lootriva loading system</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="surface-panel flex min-h-48 items-center justify-center p-6">
          <Loader2 label="Standard loader preview" />
        </div>
        <div className="surface-panel flex min-h-48 items-center justify-center p-6">
          <Loader2 size="compact" label="Compact loader preview" />
        </div>
      </div>
    </section>
  );
}
