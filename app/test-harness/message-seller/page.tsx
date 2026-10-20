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
      <section aria-label="Listing detail action">
        {own ? (
          <p>This is your listing. Manage it instead of starting a conversation.</p>
        ) : (
          <MessageSellerButton listingId={listingId} loggedIn={params.authenticated === "1"} />
        )}
      </section>
      <section data-listing-actions="mobile" aria-label="Mobile listing action">
        {own ? (
          <p>Self-messaging is unavailable.</p>
        ) : (
          <MessageSellerButton
            listingId={listingId}
            loggedIn={params.authenticated === "1"}
            compact
            label="Message"
          />
        )}
      </section>
    </main>
  );
}
