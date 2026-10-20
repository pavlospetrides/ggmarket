import { notFound } from "next/navigation";
import { ManageListingForm } from "@/components/manage-listing-form";
import { PageMasthead } from "@/components/page-masthead";
import { requireUser } from "@/lib/auth";
import { getCategories, getListing } from "@/lib/data";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [listing, categories] = await Promise.all([getListing(id, true), getCategories()]);
  if (!listing || listing.seller.id !== user.id) notFound();
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Seller tools" title="Edit listing" description="Keep the details current so buyers know exactly what to expect." variant="operations" meta={<span>{listing.title}</span>} />
    <div className="min-w-0 max-w-3xl"><ManageListingForm listing={listing} categories={categories} /></div>
  </div>;
}
