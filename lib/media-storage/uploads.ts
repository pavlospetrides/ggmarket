import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaStorageProvider, resolveR2Config, type MediaStorageProvider } from "./config";
import { storedMediaProvider } from "./index";

export async function reserveUploadProvider(admin: SupabaseClient, imageId: string, listingId: string, sellerId: string, sha256: string): Promise<MediaStorageProvider> {
  const desired = resolveMediaStorageProvider(process.env);
  // Validate before reserving, so a broken rollout does not pin new IDs to R2.
  if (desired === "r2") resolveR2Config(process.env);
  const { error } = await admin.from("listing_image_storage_assignments").upsert({ id: imageId, listing_id: listingId, seller_id: sellerId, storage_provider: desired, sha256 }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error("Media assignment unavailable.");
  const { data, error: lookupError } = await admin.from("listing_image_storage_assignments").select("listing_id,seller_id,storage_provider,sha256").eq("id", imageId).single();
  if (lookupError || !data || data.listing_id !== listingId || data.seller_id !== sellerId || data.sha256 !== sha256) throw new Error("Media assignment unavailable.");
  return storedMediaProvider(data.storage_provider);
}
