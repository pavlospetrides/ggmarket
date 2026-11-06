import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { listingImageObjectPaths } from "@/lib/listing-media-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) {
    return NextResponse.json({ error: "Image deletion is unavailable." }, { status: 503 });
  }

  const { data: image } = await supabase
    .from("listing_images")
    .select("id,storage_path,card_path,detail_path,listing_id,listing:listings!listing_images_listing_id_fkey(seller_id,status)")
    .eq("id", id)
    .maybeSingle();
  const listing = Array.isArray(image?.listing) ? image.listing[0] : image?.listing;
  if (!image || !listing || listing.seller_id !== user.id) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  const { count } = await supabase
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", image.listing_id);
  if (listing.status === "active" && (count ?? 0) <= 1) {
    return NextResponse.json({ error: "An active listing must keep at least one photo." }, { status: 400 });
  }

  // The RLS-bound mutation is the authorization gate. Suspended or
  // unauthorized actors cannot trigger privileged object cleanup.
  const { error } = await supabase.from("listing_images").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Image metadata could not be deleted." }, { status: 400 });
  }

  const paths = listingImageObjectPaths(image);
  const { error: storageError } = await admin.storage.from("listing-images").remove(paths);
  if (storageError) {
    console.error("Listing image cleanup pending", { imageId: id, objectCount: paths.length });
    return NextResponse.json({ ok: true, cleanupPending: true }, { status: 202 });
  }
  return NextResponse.json({ ok: true });
}
