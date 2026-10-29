import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MobileFixedStackHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  return (
    <div className="mobile-listing-page container-page min-w-0 py-8">
      <h1 className="page-title">Mobile listing layout</h1>
      <p className="page-description">
        A deterministic read-only surface for checking persistent controls with long content.
      </p>
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 8 }, (_, index) => (
          <section className="surface-panel min-w-0 p-5" key={index}>
            <h2 className="text-xl font-bold">Listing section {index + 1}</h2>
            <p className="mt-3 [overflow-wrap:anywhere]">
              Long-content-probe-{"x".repeat(96)}
            </p>
          </section>
        ))}
      </div>
      <div data-listing-actions="mobile" className="mobile-listing-actions md:hidden">
        <button className="btn-primary w-full" type="button">Message seller</button>
      </div>
    </div>
  );
}
