import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getUser } from "@/lib/auth";
import { buildListingImagePaths, processListingImage } from "@/lib/listing-media";
import {
  ListingMediaStorageError,
  reconcileListingImageMetadataFailure,
  uploadListingImageArtifacts,
} from "@/lib/listing-media-storage";
import { readLimitedMultipartForm } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createMediaStorage } from "@/lib/media-storage";
import { reserveUploadProvider } from "@/lib/media-storage/uploads";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }
  const form = await readLimitedMultipartForm(request);
  const uploadId = form?.get("uploadId");
  const file = form?.get("image");
  const sortOrder = Number(form?.get("sortOrder"));
  if (typeof uploadId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadId) || !(file instanceof File) || file.size === 0 || file.size > 10_485_760 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 7) {
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
  const active = await supabase.rpc("is_active_user");
  if (active.error || active.data !== true) return NextResponse.json({ error: "Image uploads are not permitted." }, { status: active.error ? 503 : 403 });

  const imageId = uploadId;
  const imageSelect = "id,listing_id,storage_path,card_path,detail_path,storage_provider,sort_order,width,height";
  const { data: existingImage, error: existingError } = await supabase
    .from("listing_images")
    .select(imageSelect)
    .eq("id", imageId)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: "Image uploads are unavailable." }, { status: 503 });
  if (existingImage) {
    if (existingImage.listing_id === id && existingImage.sort_order === sortOrder) {
      return NextResponse.json(existingImage);
    }
    return NextResponse.json({ error: "Upload identifier conflict." }, { status: 409 });
  }

  let image;
  try {
    image = await processListingImage(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload a valid image file." }, { status: 400 });
  }

  const paths = buildListingImagePaths(user.id, id, imageId);
  let provider;
  let bucket;
  try {
    provider = await reserveUploadProvider(admin, imageId, id, user.id, createHash("sha256").update(image.original.bytes).digest("hex"));
    bucket = createMediaStorage(provider, admin);
  } catch {
    return NextResponse.json({ error: "Image uploads are unavailable." }, { status: 503 });
  }
  let createdPaths: string[];
  try {
    createdPaths = await uploadListingImageArtifacts(bucket, paths, image);
  } catch (error) {
    const cleanupPending = error instanceof ListingMediaStorageError && error.cleanupPending;
    if (cleanupPending) {
      console.error("Listing image upload cleanup pending", { listingId: id, imageId, objectCount: 3 });
    }
    return NextResponse.json(
      { error: "The image could not be stored." },
      { status: cleanupPending ? 503 : 400 },
    );
  }

  const metadata = await supabase
    .from("listing_images")
    .insert({
      id: imageId,
      listing_id: id,
      storage_provider: provider,
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
    .select(imageSelect)
    .single();
  if (metadata.error) {
    // A concurrent request with the same stable upload ID may have completed
    // after the initial lookup. Never remove artifacts backing its row.
    const raceLookup = await supabase
      .from("listing_images")
      .select(imageSelect)
      .eq("id", imageId)
      .maybeSingle();
    const reconciliation = await reconcileListingImageMetadataFailure(
      bucket,
      createdPaths,
      raceLookup,
      id,
      sortOrder,
    );
    if (reconciliation.status === "existing") {
      return NextResponse.json(reconciliation.image);
    }
    if (reconciliation.status === "conflict") {
      return NextResponse.json({ error: "Upload identifier conflict." }, { status: 409 });
    }
    if (reconciliation.status === "pending" || reconciliation.cleanupPending) {
      console.error("Listing image upload cleanup pending", {
        listingId: id,
        imageId,
        objectCount: createdPaths.length,
      });
    }
    return NextResponse.json(
      { error: "The image could not be attached." },
      { status: reconciliation.status === "pending" || reconciliation.cleanupPending ? 503 : 400 },
    );
  }
  return NextResponse.json(metadata.data, { status: 201 });
}
