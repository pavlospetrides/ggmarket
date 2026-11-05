import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { buildListingImagePaths, processListingImage } from "@/lib/listing-media";
import { uploadListingImageArtifacts } from "@/lib/listing-media-storage";
import { readLimitedMultipartForm } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }
  const form = await readLimitedMultipartForm(request);
  const file = form?.get("image");
  const sortOrder = Number(form?.get("sortOrder"));
  if (!(file instanceof File) || file.size === 0 || file.size > 10_485_760 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 7) {
    return NextResponse.json({ error: "Invalid image upload." }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "Image uploads are unavailable." }, { status: 503 });
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", id)
    .eq("seller_id", user.id)
    .in("status", ["draft", "active"])
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  let image;
  try {
    image = await processListingImage(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload a valid image file." }, { status: 400 });
  }

  const imageId = crypto.randomUUID();
  const paths = buildListingImagePaths(user.id, id, imageId);
  const bucket = admin.storage.from("listing-images");
  let createdPaths: string[];
  try {
    createdPaths = await uploadListingImageArtifacts(bucket, paths, image);
  } catch {
    return NextResponse.json({ error: "The image could not be stored." }, { status: 400 });
  }

  const metadata = await supabase
    .from("listing_images")
    .insert({
      id: imageId,
      listing_id: id,
      storage_path: paths.original,
      card_path: paths.card,
      detail_path: paths.detail,
      sort_order: sortOrder,
      width: image.original.width,
      height: image.original.height,
      original_bytes: image.original.byteSize,
      card_bytes: image.card.byteSize,
      detail_bytes: image.detail.byteSize,
      mime_type: image.mimeType,
      media_version: 2,
    })
    .select("id,storage_path,card_path,detail_path,sort_order,width,height")
    .single();
  if (metadata.error) {
    await bucket.remove(createdPaths);
    return NextResponse.json({ error: "The image could not be attached." }, { status: 400 });
  }
  return NextResponse.json(metadata.data, { status: 201 });
}
