import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/202611050001_listing_image_variants.sql";

describe("listing image variant migration", () => {
  it("adds backward-compatible metadata with exact uniqueness and size constraints", () => {
    const sql = readFileSync(migrationPath, "utf8");

    for (const column of ["card_path", "detail_path", "original_bytes", "card_bytes", "detail_bytes", "mime_type", "media_version"]) {
      expect(sql, column).toMatch(new RegExp(`add column if not exists ${column}\\b`, "i"));
    }
    expect(sql).toMatch(/unique index[^;]+card_path[^;]+where card_path is not null/is);
    expect(sql).toMatch(/unique index[^;]+detail_path[^;]+where detail_path is not null/is);
    expect(sql).toMatch(/check \(original_bytes is null or original_bytes > 0\)/i);
    expect(sql).toMatch(/check \(card_bytes is null or card_bytes > 0\)/i);
    expect(sql).toMatch(/check \(detail_bytes is null or detail_bytes > 0\)/i);
    expect(sql).toMatch(/mime_type is null or mime_type = 'image\/webp'/i);
  });

  it("keeps the bucket private and authorizes only exact paths recorded on an authorized image row", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/update storage\.buckets set public = false where id = 'listing-images'/i);
    expect(sql).toMatch(/drop policy if exists "listing images storage controlled read"/i);
    expect(sql).toMatch(/storage\.objects\.name in \(i\.storage_path, i\.card_path, i\.detail_path\)/i);
    expect(sql).toMatch(/l\.status = 'active' or l\.seller_id = auth\.uid\(\) or public\.is_admin\(\)/i);
    expect(sql).not.toMatch(/storage\.objects\.name\s+like/i);
    expect(sql).not.toMatch(/bucket_id\s*=\s*'listing-images'\s*\)\s*;?\s*$/im);
  });

  it("does not weaken table RLS or grant broad privileges", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/grant all/i);
    expect(sql).not.toMatch(/grant (?:insert|update|delete) on (?:table )?public\.listing_images to (?:anon|authenticated)/i);
    expect(sql).not.toMatch(/security definer/i);
  });
});
