import Link from "next/link";
import { ArrowUpRight, PackageOpen, Pencil, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { formatPrice, labelCondition } from "@/lib/constants";
import { getOwnListings } from "@/lib/data";

export default async function ManageListingsPage() {
  const user = await requireUser("/profile/listings");
  const listings = await getOwnListings(user.id);

  return (
    <div className="container-page py-8 pb-8 md:py-12 md:pb-12">
      <div className="page-header flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Seller tools</p>
          <h1 className="page-title [overflow-wrap:anywhere]">Your listings</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {listings.length} {listings.length === 1 ? "listing" : "listings"} in your inventory
          </p>
        </div>
        <Link href="/sell" className="btn-primary w-full sm:w-auto">
          <Plus className="size-4" aria-hidden="true" />
          New listing
        </Link>
      </div>

      {listings.length ? (
        <div className="space-y-3">
          {listings.map((listing) => (
            <article
              key={listing.id}
              className="card card-interactive grid min-w-0 grid-cols-1 gap-4 overflow-hidden p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
            >
              <div className="min-w-0">
                <span className="badge capitalize">{listing.status}</span>
                <h2 className="mt-2 min-w-0 font-bold leading-snug [overflow-wrap:anywhere]">
                  {listing.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  <span className="price text-white">{formatPrice(listing.price)}</span>{" "}
                  · {labelCondition(listing.condition)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <Link href={`/listing/${listing.id}/edit`} className="btn-secondary min-w-0">
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </Link>
                {listing.status === "active" ? (
                  <Link href={`/listing/${listing.id}`} className="btn-ghost min-w-0">
                    View
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty-state overflow-hidden">
          <div className="min-w-0">
            <span className="empty-state-icon" aria-hidden="true"><PackageOpen /></span>
            <h2 className="mt-4 font-bold text-white">No listings yet</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Turn unused gear into your next upgrade.</p>
            <Link href="/sell" className="btn-primary mt-5">
              <Plus className="size-4" aria-hidden="true" />
              Create your first listing
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
