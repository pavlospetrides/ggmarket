#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const HELP = `Usage: node scripts/backfill-listing-image-variants.mjs [options]

Dry-run is the default. It lists a bounded page of legacy rows and the exact
deterministic variant paths without downloading, uploading, or updating data.

Options:
  --batch-size <1-100>          Number of rows to inspect (default: 25)
  --cursor <image-uuid>         Resume after this listing_images.id
  --apply                       Generate and persist missing variants
  --confirm-project-ref <ref>   Required with --apply; must match Supabase URL
  --help                        Show this help without reading credentials
`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
  return value;
}

export function parseBackfillArgs(args) {
  const options = { apply: false, batchSize: 25, cursor: null, confirmProjectRef: null, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help") options.help = true;
    else if (argument === "--apply") options.apply = true;
    else if (argument === "--batch-size") {
      const value = Number(requiredValue(args, index, argument));
      if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error("--batch-size must be between 1 and 100.");
      options.batchSize = value;
      index += 1;
    } else if (argument === "--cursor") {
      const value = requiredValue(args, index, argument);
      if (!UUID.test(value)) throw new Error("--cursor must be a UUID.");
      options.cursor = value;
      index += 1;
    } else if (argument === "--confirm-project-ref") {
      options.confirmProjectRef = requiredValue(args, index, argument);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

function projectRefFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const suffix = ".supabase.co";
    if (!hostname.endsWith(suffix)) return null;
    const projectRef = hostname.slice(0, -suffix.length);
    return /^[a-z0-9]{8,64}$/.test(projectRef) ? projectRef : null;
  } catch {
    return null;
  }
}

export function assertApplyAuthorized(options, url) {
  if (!options.apply) return null;
  if (!options.confirmProjectRef) throw new Error("--apply requires --confirm-project-ref.");
  const actualRef = projectRefFromUrl(url);
  if (!actualRef || actualRef !== options.confirmProjectRef.toLowerCase()) {
    throw new Error("Confirmed project ref does not match the configured Supabase URL.");
  }
  return actualRef;
}

function relatedListing(row) {
  return Array.isArray(row.listing) ? row.listing[0] : row.listing;
}

function buildVariantPaths(ownerId, listingId, imageId) {
  if (![ownerId, listingId, imageId].every((value) => UUID.test(value))) {
    throw new Error("Invalid media path identifier.");
  }
  const prefix = `${ownerId}/${listingId}/${imageId}`;
  return { card: `${prefix}/card.webp`, detail: `${prefix}/detail.webp` };
}

export function buildBackfillPlan(rows) {
  return rows.flatMap((row) => {
    if (row.card_path && row.detail_path) return [];
    const listing = relatedListing(row);
    if (!listing || !UUID.test(row.id) || !UUID.test(listing.id) || !UUID.test(listing.seller_id)) return [];
    const paths = buildVariantPaths(listing.seller_id, listing.id, row.id);
    return [{
      row,
      paths: { card: paths.card, detail: paths.detail },
      missing: [
        ...(!row.card_path ? ["card"] : []),
        ...(!row.detail_path ? ["detail"] : []),
      ],
    }];
  });
}

export function formatBackfillLog(status, plan, details = {}) {
  return JSON.stringify({
    status,
    rowId: plan.row.id,
    missing: plan.missing,
    paths: Object.fromEntries(plan.missing.map((purpose) => [purpose, plan.paths[purpose]])),
    ...details,
  });
}

export function summarizeBackfillBatch(candidates, plans) {
  return {
    inspected: candidates.length,
    planned: plans.length,
    applied: 0,
    failed: 0,
    nextCursor: candidates.at(-1)?.id ?? null,
  };
}

async function loadCandidates(client, options) {
  let query = client
    .from("listing_images")
    .select("id,storage_path,card_path,detail_path,listing:listings!inner(id,seller_id)")
    .or("card_path.is.null,detail_path.is.null")
    .order("id", { ascending: true })
    .limit(options.batchSize);
  if (options.cursor) query = query.gt("id", options.cursor);
  const { data, error } = await query;
  if (error) throw new Error("Unable to load legacy image candidates.");
  return data ?? [];
}

async function applyPlan(client, bucket, plan, processListingImage) {
  const { data: source, error: downloadError } = await bucket.download(plan.row.storage_path);
  if (downloadError || !source) throw new Error("source-download-failed");
  const sourceBytes = new Uint8Array(await source.arrayBuffer());
  const processed = await processListingImage(sourceBytes);

  for (const purpose of plan.missing) {
    const artifact = processed[purpose];
    const { error } = await bucket.upload(plan.paths[purpose], artifact.bytes, {
      contentType: processed.mimeType,
      cacheControl: "300",
      upsert: true,
    });
    if (error) throw new Error("variant-upload-failed");
  }

  const patch = {
    media_version: 2,
    mime_type: processed.mimeType,
    original_bytes: sourceBytes.byteLength,
    ...(plan.missing.includes("card") && {
      card_path: plan.paths.card,
      card_bytes: processed.card.byteSize,
    }),
    ...(plan.missing.includes("detail") && {
      detail_path: plan.paths.detail,
      detail_bytes: processed.detail.byteSize,
    }),
  };
  const { error: updateError } = await client.from("listing_images").update(patch).eq("id", plan.row.id);
  if (updateError) throw new Error("metadata-update-failed");
}

export async function runBackfill(options, environment = process.env, output = console) {
  if (options.help) {
    output.log(HELP);
    return { inspected: 0, planned: 0, applied: 0, failed: 0 };
  }
  if (options.apply && !options.confirmProjectRef) {
    throw new Error("--apply requires --confirm-project-ref.");
  }
  const [supabaseModule, mediaModule, adminConfigModule] = await Promise.all([
    import("@supabase/supabase-js"),
    import("../lib/listing-media.ts"),
    import("../lib/supabase/admin-config.ts"),
  ]);
  const config = adminConfigModule.resolveSupabaseAdminConfig(environment);
  if (!config) throw new Error("Supabase admin configuration is unavailable.");
  assertApplyAuthorized(options, config.url);

  const client = supabaseModule.createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const candidates = await loadCandidates(client, options);
  const plans = buildBackfillPlan(candidates);
  const result = summarizeBackfillBatch(candidates, plans);
  const bucket = client.storage.from("listing-images");
  for (const plan of plans) {
    if (!options.apply) {
      output.log(formatBackfillLog("planned", plan));
      continue;
    }
    try {
      await applyPlan(client, bucket, plan, mediaModule.processListingImage);
      result.applied += 1;
      output.log(formatBackfillLog("applied", plan));
    } catch (error) {
      result.failed += 1;
      const code = error instanceof Error && /^[a-z-]+$/.test(error.message) ? error.message : "processing-failed";
      output.error(formatBackfillLog("failed", plan, { code }));
    }
  }
  output.log(JSON.stringify({ status: options.apply ? "complete" : "dry-run", ...result }));
  return result;
}

async function main() {
  try {
    const options = parseBackfillArgs(process.argv.slice(2));
    const result = await runBackfill(options);
    if (result.failed) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Backfill failed.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
