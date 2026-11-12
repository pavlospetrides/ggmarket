#!/usr/bin/env node
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const HELP = `Usage: node --conditions=react-server --import=tsx scripts/backfill-listing-images-to-r2.mjs [options]
Dry-run is the default. No source images are ever deleted.
--batch-size <1-100> (default 25)
--cursor <image-uuid> (resume after this row)
--apply --confirm-project-ref <ref> --confirm-r2-bucket <bucket>
--help
Set R2_BACKFILL_ALLOW_APPLY=1 separately for an approved apply run.
`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseR2BackfillArgs(args) {
  const options = { apply: false, help: false, batchSize: 25, cursor: null, confirmProjectRef: null, confirmR2Bucket: null };
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === "--help") options.help = true;
    else if (argument === "--apply") options.apply = true;
    else if (["--batch-size", "--cursor", "--confirm-project-ref", "--confirm-r2-bucket"].includes(argument)) {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("option-value-required");
      if (argument === "--batch-size") {
        options.batchSize = Number(value);
        if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 100) throw new Error("invalid-batch-size");
      } else if (argument === "--cursor") {
        if (!UUID.test(value)) throw new Error("invalid-cursor"); options.cursor = value;
      } else if (argument === "--confirm-project-ref") options.confirmProjectRef = value;
      else options.confirmR2Bucket = value;
    } else throw new Error("unknown-option");
  }
  return options;
}

export function assertR2BackfillTarget(options, supabaseUrl, bucket) {
  if (!options.apply) return;
  const hostname = new URL(supabaseUrl).hostname;
  if (!options.confirmProjectRef || hostname !== `${options.confirmProjectRef}.supabase.co` || !options.confirmR2Bucket || options.confirmR2Bucket !== bucket) {
    throw new Error("backfill-target-confirmation-required");
  }
}

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function contentType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "image/webp";
  throw new Error("unsupported-source-format");
}

export async function migrateR2Image(row, { source, destination, update }) {
  if (row.storage_provider === "r2") return;
  const paths = [...new Set([row.storage_path, row.card_path, row.detail_path].filter(Boolean))];
  for (const path of paths) {
    const input = await source.download(path);
    if (input.error || !input.data?.byteLength) throw new Error("source-download-failed");
    const digest = hash(input.data);
    const existing = await destination.head(path);
    let verified = false;
    if (existing.data?.byteSize === input.data.byteLength) {
      const downloaded = await destination.download(path);
      verified = !downloaded.error && downloaded.data && hash(downloaded.data) === digest;
    }
    if (!verified) {
      const stored = await destination.upload(path, input.data, { contentType: contentType(input.data), cacheControl: "300", upsert: true, sha256: digest });
      if (stored.error) throw new Error("destination-upload-failed");
      const [metadata, downloaded] = await Promise.all([destination.head(path), destination.download(path)]);
      if (metadata.error || metadata.data?.byteSize !== input.data.byteLength || downloaded.error || !downloaded.data || hash(downloaded.data) !== digest) throw new Error("destination-verification-failed");
    }
  }
  if (!await update(row)) throw new Error("metadata-snapshot-changed");
}

export async function runR2Batch(rows, options, dependencies, output = console.log) {
  const result = { inspected: rows.length, planned: 0, applied: 0, failed: 0, nextCursor: options.cursor ?? null, scanCursor: rows.at(-1)?.id ?? null };
  let failed = false;
  for (const row of rows) {
    if (row.storage_provider === "r2") continue;
    result.planned++;
    if (!options.apply) {
      output(JSON.stringify({ status: "planned", rowId: row.id, objectCount: new Set([row.storage_path, row.card_path, row.detail_path].filter(Boolean)).size }));
      result.nextCursor = row.id;
      continue;
    }
    try {
      await migrateR2Image(row, dependencies);
      result.applied++;
      if (!failed) result.nextCursor = row.id;
      output(JSON.stringify({ status: "applied", rowId: row.id }));
    } catch {
      failed = true; result.failed++;
      output(JSON.stringify({ status: "failed", rowId: row.id, code: "image-migration-failed" }));
    }
  }
  output(JSON.stringify({ status: options.apply ? "complete" : "dry-run", ...result }));
  return result;
}

export async function runR2Backfill(options, environment = process.env, output = console.log) {
  if (options.help) { output(HELP); return { failed: 0 }; }
  if (options.apply && environment.R2_BACKFILL_ALLOW_APPLY !== "1") throw new Error("backfill-apply-not-authorized");
  const { resolveSupabaseAdminConfig } = await import("../lib/supabase/admin-config.ts");
  const config = resolveSupabaseAdminConfig(environment);
  if (!config) throw new Error("supabase-configuration-unavailable");
  assertR2BackfillTarget(options, config.url, environment.R2_BUCKET_NAME);
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = client.from("listing_images").select("id,listing_id,storage_path,card_path,detail_path,storage_provider").eq("storage_provider", "supabase").order("id").limit(options.batchSize);
  if (options.cursor) query = query.gt("id", options.cursor);
  const { data, error } = await query;
  if (error) throw new Error("candidate-query-failed");
  // Dry runs never initialize R2 or read image objects.
  if (!options.apply) return runR2Batch(data ?? [], options, {}, output);
  const [{ createR2Storage }, { createSupabaseStorage }, { resolveR2Config }] = await Promise.all([
    import("../lib/media-storage/r2.ts"), import("../lib/media-storage/supabase.ts"), import("../lib/media-storage/config.ts"),
  ]);
  const source = createSupabaseStorage(client);
  const destination = createR2Storage(resolveR2Config(environment));
  const update = async (row) => {
    let mutation = client.from("listing_images").update({ storage_provider: "r2" }).eq("id", row.id).eq("listing_id", row.listing_id).eq("storage_provider", "supabase").eq("storage_path", row.storage_path);
    for (const key of ["card_path", "detail_path"]) mutation = row[key] ? mutation.eq(key, row[key]) : mutation.is(key, null);
    const result = await mutation.select("id").maybeSingle();
    return !result.error && result.data?.id === row.id;
  };
  return runR2Batch(data ?? [], options, { source, destination, update }, output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await runR2Backfill(parseR2BackfillArgs(process.argv.slice(2))); if (result.failed) process.exitCode = 1; }
  catch { console.error("R2 backfill failed. Check approved target, configuration, and sanitized batch reports."); process.exitCode = 1; }
}
