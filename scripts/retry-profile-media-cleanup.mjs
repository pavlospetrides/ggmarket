#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { assertR2BackfillTarget } from "./backfill-listing-images-to-r2.mjs";

const PATH = /^profile-media\/[0-9a-f-]+\/(avatar|cover)\/[0-9a-f-]+\.webp$/;

export function parseArgs(args) {
  const options = { help: false, apply: false, batchSize: 25, cursor: null, confirmProjectRef: null, confirmR2Bucket: null };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--help") options.help = true;
    else if (argument === "--apply") options.apply = true;
    else if (["--batch-size", "--cursor", "--confirm-project-ref", "--confirm-r2-bucket"].includes(argument)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error("option-value-required");
      if (argument === "--batch-size") {
        options.batchSize = Number(value);
        if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 100) throw new Error("invalid-batch-size");
      } else if (argument === "--cursor") {
        if (!PATH.test(value)) throw new Error("invalid-cursor");
        options.cursor = value;
      } else if (argument === "--confirm-project-ref") options.confirmProjectRef = value;
      else options.confirmR2Bucket = value;
    } else throw new Error("unknown-option");
  }
  return options;
}

export async function run(options, environment = process.env, output = console.log) {
  if (options.help) {
    output("Usage: node --conditions=react-server --import=tsx scripts/retry-profile-media-cleanup.mjs [--batch-size 25] [--cursor PROFILE_PATH] [--apply --confirm-project-ref REF --confirm-r2-bucket BUCKET]\nDry-run by default. Apply also requires MEDIA_CLEANUP_ALLOW_APPLY=1. Never run without an approved target.");
    return { inspected: 0, completed: 0, pending: 0 };
  }
  if (options.apply && environment.MEDIA_CLEANUP_ALLOW_APPLY !== "1") throw new Error("cleanup-not-authorized");
  const { resolveSupabaseAdminConfig } = await import("../lib/supabase/admin-config.ts");
  const config = resolveSupabaseAdminConfig(environment);
  if (!config) throw new Error("cleanup-configuration-unavailable");
  assertR2BackfillTarget(options, config.url, environment.R2_BUCKET_NAME);
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = admin.from("profile_media_cleanup_jobs").select("path,owner_id,kind").is("completed_at", null).order("path").limit(options.batchSize);
  if (options.cursor) query = query.gt("path", options.cursor);
  const { data, error } = await query;
  if (error || !data) throw new Error("cleanup-query-failed");
  const cleanup = options.apply ? (await import("../lib/profile-media-storage.ts")).cleanupProfileMedia : null;
  const result = { inspected: data.length, completed: 0, pending: 0, nextCursor: options.cursor };
  let encounteredPending = false;
  for (const job of data) {
    if (!PATH.test(job.path) || !["avatar", "cover"].includes(job.kind)) {
      result.pending++; encounteredPending = true;
    } else if (cleanup) {
      await cleanup(admin, job.owner_id, job.kind);
      const checked = await admin.from("profile_media_cleanup_jobs").select("completed_at").eq("path", job.path).maybeSingle();
      if (checked.error || !checked.data?.completed_at) { result.pending++; encounteredPending = true; }
      else result.completed++;
    }
    if (!encounteredPending) result.nextCursor = job.path;
  }
  output(JSON.stringify(result));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await run(parseArgs(process.argv.slice(2))); if (result.pending) process.exitCode = 1; }
  catch { console.error("Profile media cleanup failed. Check approved target, configuration, and pending jobs."); process.exitCode = 1; }
}
