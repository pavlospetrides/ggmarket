import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LoadingHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();

  return (
    <section className="container-page min-h-[55svh] py-12" data-ui>
      <h1 className="text-3xl font-bold">Loading system test harness</h1>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="btn-primary" href="/test-harness/loading/delayed" prefetch={false}>
          Open delayed content
        </Link>
        <Link className="btn-secondary" href="/test-harness/loading/immediate">
          Open immediate content
        </Link>
      </div>
    </section>
  );
}
