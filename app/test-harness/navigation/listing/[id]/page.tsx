import { notFound } from "next/navigation";
import {
  BrowsingStateRestorer,
  ListingBackButton,
  ListingNavigationLink,
} from "@/components/listing-navigation";

export const dynamic = "force-dynamic";

export default async function NavigationListingHarness({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const { id } = await params;
  const listingId = Number(id);
  if (!Number.isInteger(listingId) || listingId < 1) notFound();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const relatedId = listingId + 1;
  const context = `harness:listing:${listingId}:related`;

  return (
    <main className="container-page min-w-0 py-8">
      <BrowsingStateRestorer />
      <ListingBackButton />
      <h1 className="mt-1 text-4xl font-bold">Listing {listingId}</h1>
      <p className="mt-4 max-w-2xl text-[var(--text-secondary)]">Synthetic detail data yielded asynchronously by a Server Component.</p>
      <div className="h-[70vh]" aria-hidden="true" />
      <section aria-labelledby="related-heading">
        <h2 id="related-heading" className="text-2xl font-bold">Related listings</h2>
        <article
          aria-label={`Related Listing ${relatedId}`}
          data-listing-id={`listing-${relatedId}`}
          data-listing-anchor={`${context}:listing-${relatedId}`}
          className="card mt-5 max-w-sm p-5"
        >
          <h3 className="text-xl font-bold">Related Listing {relatedId}</h3>
          <ListingNavigationLink href={`/test-harness/navigation/listing/${relatedId}`} className="btn-primary mt-6">
            Open Related Listing {relatedId}
          </ListingNavigationLink>
        </article>
      </section>
    </main>
  );
}
