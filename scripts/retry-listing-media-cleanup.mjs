#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { parseR2BackfillArgs, assertR2BackfillTarget } from "./backfill-listing-images-to-r2.mjs";

export async function runCleanupRetry(options, environment = process.env, output = console.log) {
  if (options.help) {
    output("Usage: node --conditions=react-server --import=tsx scripts/retry-listing-media-cleanup.mjs [--batch-size 25] [--cursor IMAGE_UUID] [--apply --confirm-project-ref REF --confirm-r2-bucket BUCKET]\nDry-run by default. Apply also requires MEDIA_CLEANUP_ALLOW_APPLY=1. Completed jobs remain as permanent image-ID tombstones.");
    return { failed: 0 };
  }
  if (options.apply && environment.MEDIA_CLEANUP_ALLOW_APPLY !== "1") throw new Error("cleanup-not-authorized");
  const { resolveSupabaseAdminConfig } = await import("../lib/supabase/admin-config.ts");
  const config = resolveSupabaseAdminConfig(environment);
  if (!config) throw new Error("cleanup-configuration-unavailable");
  assertR2BackfillTarget(options, config.url, environment.R2_BUCKET_NAME);
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = admin.from("listing_image_cleanup_jobs").select("image_id,storage_provider,paths").is("completed_at", null).order("image_id").limit(options.batchSize);
  if (options.cursor) query = query.gt("image_id", options.cursor);
  const { data, error } = await query;
  if (error || !data) throw new Error("cleanup-query-failed");
  const result = { inspected: data.length, completed: 0, failed: 0, nextCursor: options.cursor ?? null };
  const complete = options.apply ? (await import("../lib/media-storage/cleanup.ts")).completeMediaCleanup : null;
  let failed = false;
  for (const job of data) {
    const outcome = complete ? await complete(admin, { imageId: job.image_id }) : { error: null };
    if (outcome.error) { failed = true; result.failed++; }
    else { if (complete) result.completed++; if (!failed) result.nextCursor = job.image_id; }
    output(JSON.stringify({ status: !complete ? "planned" : outcome.error ? "pending" : "completed", imageId: job.image_id, provider: job.storage_provider, objectCount: job.paths.length }));
  }
  output(JSON.stringify(result)); return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await runCleanupRetry(parseR2BackfillArgs(process.argv.slice(2))); if (result.failed) process.exitCode = 1; }
  catch { console.error("Media cleanup failed. Check approved target, configuration, and pending job records."); process.exitCode = 1; }
}
