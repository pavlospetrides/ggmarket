import { notFound } from "next/navigation";
import { ManageListingForm } from "@/components/manage-listing-form";
import { requireUser } from "@/lib/auth";
import { getListing } from "@/lib/data";
export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) { const user = await requireUser(); const { id } = await params; const listing = await getListing(id, true); if (!listing || listing.seller.id !== user.id) notFound(); return <div className="container-page py-8 md:py-12"><div className="page-header"><p className="eyebrow">Seller tools</p><h1 className="page-title">Edit listing</h1><p className="page-description">Keep the details current so buyers know exactly what to expect.</p></div><div className="max-w-3xl"><ManageListingForm listing={listing} /></div></div>; }
