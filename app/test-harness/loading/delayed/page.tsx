import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DelayedLoadingHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  await new Promise((resolve) => setTimeout(resolve, 600));

  return (
    <section className="container-page min-h-[55svh] py-12">
      <h1 className="text-3xl font-bold">Delayed content is ready</h1>
    </section>
  );
}
