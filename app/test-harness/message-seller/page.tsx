import { notFound } from "next/navigation";
import { MessageSellerButton } from "@/components/message-seller-button";

const listingId = "11111111-1111-4111-8111-111111111111";

export const dynamic = "force-dynamic";

export default async function MessageSellerHarnessPage({
  searchParams,
}: {
  searchParams: Promise<{ authenticated?: string; own?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const params = await searchParams;
  const own = params.own === "1";

  return (
    <main className="container-page space-y-8 py-8">
      <section className="surface-panel min-w-0 p-4" aria-label="Seller information">
        {own ? (
          <p>This is your listing. Manage it instead of starting a conversation.</p>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] font-extrabold text-[var(--primary-hover)]" aria-hidden="true">S</span>
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]"><strong>Synthetic seller with a long display name</strong></span>
            <MessageSellerButton listingId={listingId} loggedIn={params.authenticated === "1"} iconOnly />
          </div>
        )}
      </section>
      <section className="surface-panel min-w-0 p-5" aria-label="Long listing content">
        <h1 className="text-2xl font-bold">Long listing description</h1>
        {Array.from({ length: 12 }, (_, index) => (
          <p className="mt-4 [overflow-wrap:anywhere]" key={index}>Listing detail {index + 1}: {"content-".repeat(24)}</p>
        ))}
      </section>
    </main>
  );
}
