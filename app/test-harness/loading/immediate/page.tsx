import { notFound } from "next/navigation";

export default function ImmediateLoadingHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();

  return (
    <section className="container-page min-h-[55svh] py-12">
      <h1 className="text-3xl font-bold">Immediate content is ready</h1>
    </section>
  );
}
