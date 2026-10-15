import { notFound } from "next/navigation";
import { ManageListingForm } from "@/components/manage-listing-form";
import { requireUser } from "@/lib/auth";
import { getCategories, getListing } from "@/lib/data";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [listing, categories] = await Promise.all([getListing(id, true), getCategories()]);
  if (!listing || listing.seller.id !== user.id) notFound();
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <div className="page-header min-w-0"><p className="mb-2 text-sm font-semibold text-[var(--primary-hover)]">Seller tools</p><h1 className="page-title">Edit listing</h1><p className="page-description">Keep the details current so buyers know exactly what to expect.</p></div>
    <div className="min-w-0 max-w-3xl"><ManageListingForm listing={listing} categories={categories} /></div>
  </div>;
}
