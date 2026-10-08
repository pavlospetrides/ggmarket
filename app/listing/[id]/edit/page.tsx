import { notFound } from "next/navigation";
import { ManageListingForm } from "@/components/manage-listing-form";
import { requireUser } from "@/lib/auth";
import { getListing } from "@/lib/data";
export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) { const user = await requireUser(); const { id } = await params; const listing = await getListing(id, true); if (!listing || listing.seller.id !== user.id) notFound(); return <div className="container-page py-10"><p className="eyebrow">Seller tools</p><h1 className="mt-2 text-3xl font-black">Edit listing</h1><div className="mt-8 max-w-3xl"><ManageListingForm listing={listing} /></div></div>; }
