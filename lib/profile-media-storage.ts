import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createR2Storage } from "./media-storage/r2";
import { resolveR2Config } from "./media-storage/config";
import { isOwnedProfileMediaPath, type ProfileMediaKind } from "./profile-media";

export function profileMediaBucket() {
  return createR2Storage(resolveR2Config(process.env));
}

export async function cleanupProfileMedia(admin: SupabaseClient, ownerId: string, kind: ProfileMediaKind) {
  const { data: profile, error: profileError } = await admin.from("profiles").select("avatar_path,cover_path").eq("id", ownerId).maybeSingle();
  if (profileError) return { pending: true };
  const { data: jobs, error } = await admin.from("profile_media_cleanup_jobs").select("path,owner_id,kind").eq("owner_id", ownerId).eq("kind", kind).is("completed_at", null).limit(20);
  if (error || !jobs) return { pending: true };
  let bucket: ReturnType<typeof profileMediaBucket>;
  try { bucket = profileMediaBucket(); }
  catch { return { pending: true }; }
  let pending = jobs.length === 20;
  for (const job of jobs) {
    if (!isOwnedProfileMediaPath(job.path, ownerId, kind) || job.path === profile?.avatar_path || job.path === profile?.cover_path) { pending = true; continue; }
    let removed: Awaited<ReturnType<typeof bucket.remove>>;
    try { removed = await bucket.remove([job.path]); }
    catch { pending = true; continue; }
    if (removed.error) { pending = true; continue; }
    const completed = await admin.from("profile_media_cleanup_jobs").update({ completed_at: new Date().toISOString() }).eq("path", job.path).eq("owner_id", ownerId).is("completed_at", null);
    if (completed.error) pending = true;
  }
  return { pending };
}
