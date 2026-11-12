import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { storedMediaProvider, createMediaStorage } from "./index";
import { assertObjectKey, type MediaStorage } from "./types";
import type { MediaStorageProvider } from "./config";

type CleanupJob = { image_id: string; storage_provider: string; paths: string[] };

// Call only after an affected-row RLS delete, or from explicitly approved
// operator tooling. The database's AFTER DELETE trigger is the snapshot source.
export async function completeMediaCleanup(
  admin: SupabaseClient,
  scope: { imageId?: string; listingId?: string },
  storage: (provider: MediaStorageProvider) => MediaStorage = (provider) => createMediaStorage(provider, admin),
): Promise<{ error: string | null }> {
  try {
    if (!scope.imageId && !scope.listingId) throw new Error("Cleanup scope required.");
    let query = admin.from("listing_image_cleanup_jobs").select("image_id,storage_provider,paths").is("completed_at", null).order("created_at", { ascending: false }).limit(100);
    query = scope.imageId ? query.eq("image_id", scope.imageId) : query.eq("listing_id", scope.listingId!);
    const { data, error } = await query;
    if (error || !data || (scope.imageId && !data.length)) throw new Error("Cleanup snapshot unavailable.");
    const jobs = data as CleanupJob[];
    const groups = new Map<MediaStorageProvider, { paths: Set<string>; ids: string[] }>();
    for (const job of jobs) {
      const provider = storedMediaProvider(job.storage_provider);
      const group = groups.get(provider) ?? { paths: new Set<string>(), ids: [] };
      job.paths.forEach((path) => { assertObjectKey(path); group.paths.add(path); });
      group.ids.push(job.image_id); groups.set(provider, group);
    }
    const prepared = [...groups].map(([provider, group]) => ({ ...group, bucket: storage(provider) }));
    for (const group of prepared) {
      const removed = await group.bucket.remove([...group.paths]);
      if (removed.error) throw new Error("Cleanup pending.");
      const completed = await admin.from("listing_image_cleanup_jobs").update({ completed_at: new Date().toISOString() }).in("image_id", group.ids);
      if (completed.error) throw new Error("Cleanup completion pending.");
    }
    return { error: jobs.length === 100 ? "media-cleanup-pending" : null };
  } catch { return { error: "media-cleanup-pending" }; }
}
