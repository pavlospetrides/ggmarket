import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../supabase/migrations/202610200001_account_ratings_and_description.sql",
  import.meta.url,
);
const coreSchemaUrl = new URL(
  "../supabase/migrations/202610010001_core_schema.sql",
  import.meta.url,
);

describe("account ratings and description migration", () => {
  it("enforces trimmed non-empty descriptions and one immutable rating identity pair", () => {
    const sql = readFileSync(migrationUrl, "utf8");
    expect(sql).toMatch(/char_length\(btrim\(\s*description\s*,\s*U&'[^']+'\s*\)\)\s+between\s+1\s+and\s+5000/i);
    for (const codePoint of ["0009", "000A", "000B", "000C", "000D", "0020", "00A0", "1680", "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "200A", "2028", "2029", "202F", "205F", "3000", "FEFF"]) {
      expect(sql.toUpperCase()).toContain(`\\${codePoint}`);
    }
    expect(sql).toMatch(/unique index[^;]+reviews[^;]+reviewer_id[^;]+seller_id/is);
    expect(sql).toMatch(/reviewer_id\s*=\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/seller_id\s*<>\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/public\.is_active_user\(\)/i);
    expect(sql).toMatch(/grant update\s*\(rating,\s*comment\)/i);
    expect(sql).not.toMatch(/grant update\s*\([^)]*(reviewer_id|seller_id)/i);
  });

  it("does not silently discard historical duplicate ratings", () => {
    const sql = readFileSync(migrationUrl, "utf8");
    expect(sql).toContain("duplicate reviewer/target ratings must be resolved before migration");
    expect(sql).not.toMatch(/delete\s+from\s+public\.reviews/i);
  });

  it("removes inherited and direct review write grants before adding narrow column grants", () => {
    const sql = readFileSync(migrationUrl, "utf8");
    expect(sql).toMatch(/revoke\s+all\s+privileges\s+on\s+table\s+public\.reviews\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i);
    expect(sql).toMatch(/string_agg\(format\('%I'\s*,\s*a\.attname\)/i);
    expect(sql).toMatch(/revoke all privileges \(%s\) on table public\.reviews from public, anon, authenticated/i);
    expect(sql).toMatch(/grant\s+insert\s*\(reviewer_id\s*,\s*seller_id\s*,\s*rating\s*,\s*comment\)\s+on\s+public\.reviews\s+to\s+authenticated/i);
    expect(sql).toMatch(/grant\s+update\s*\(rating\s*,\s*comment\)\s+on\s+public\.reviews\s+to\s+authenticated/i);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+public\.reviews\s+to\s+(public|anon|authenticated)/i);
    expect(sql).toMatch(/alter\s+table\s+public\.reviews\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/grant\s+select\s+on\s+table\s+public\.reviews\s+to\s+anon\s*,\s*authenticated/i);
    expect(sql).toMatch(/grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+table\s+public\.reviews\s+to\s+service_role/i);
    const revoke = sql.search(/revoke\s+all\s+privileges\s+on\s+table\s+public\.reviews/i);
    const narrowInsert = sql.search(/grant\s+insert\s*\(reviewer_id/i);
    const narrowUpdate = sql.search(/grant\s+update\s*\(rating/i);
    expect(revoke).toBeGreaterThanOrEqual(0);
    expect(narrowInsert).toBeGreaterThan(revoke);
    expect(narrowUpdate).toBeGreaterThan(revoke);
  });

  it("rejects suspended reviewers and suspended target profiles", () => {
    const sql = readFileSync(migrationUrl, "utf8");
    const hardening = readFileSync(new URL("../supabase/migrations/202610030005_production_security_hardening.sql", import.meta.url), "utf8");
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+public\.is_active_profile\s*\(target_profile\s+uuid\)/i);
    expect(sql).toMatch(/where\s+id\s*=\s*target_profile\s+and\s+suspended_at\s+is\s+null/i);
    expect(sql.match(/public\.is_active_user\(\)/gi)?.length).toBeGreaterThanOrEqual(3);
    expect(sql.match(/public\.is_active_profile\(seller_id\)/gi)?.length).toBeGreaterThanOrEqual(3);
    expect(sql).toMatch(/security\s+definer\s+set\s+search_path\s*=\s*''/i);
    expect(sql).toMatch(/revoke\s+all\s+on\s+function\s+public\.is_active_profile\(uuid\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.is_active_profile\(uuid\)\s+to\s+authenticated/i);
    expect(hardening).toMatch(/where\s+id\s*=\s*auth\.uid\(\)\s+and\s+suspended_at\s+is\s+null/i);
    expect(sql).toMatch(/where\s+id\s*=\s*target_profile\s+and\s+suspended_at\s+is\s+null/i);
    expect(sql).toMatch(/execute\s+\$definition\$[\s\S]+create\s+or\s+replace\s+function\s+public\.is_active_profile[\s\S]+revoke all on function public\.is_active_profile\(uuid\)[\s\S]+grant execute on function public\.is_active_profile\(uuid\)[\s\S]+\$migration\$/i);
  });

  it("validates the replacement description constraint before dropping the legacy constraint", () => {
    const sql = readFileSync(migrationUrl, "utf8");
    expect(sql).toMatch(/description\s+is\s+not\s+null\s+and\s+char_length\(btrim\(\s*description\s*,\s*U&'/i);
    const add = sql.search(/add\s+constraint\s+listings_description_required/i);
    const validate = sql.search(/validate\s+constraint\s+listings_description_required/i);
    const dropLegacy = sql.search(/drop\s+constraint\s+if\s+exists\s+listings_description_check/i);
    expect(add).toBeGreaterThanOrEqual(0);
    expect(validate).toBeGreaterThan(add);
    expect(dropLegacy).toBeGreaterThan(validate);
    expect(sql).toMatch(/create\s+unique\s+index\s+if\s+not\s+exists\s+reviews_reviewer_seller_uidx/i);
    expect(sql).toContain("existing reviews_reviewer_seller_uidx has an incompatible definition");
    expect(sql).toMatch(/pg_get_indexdef\(i\.indexrelid\s*,\s*1\s*,\s*true\)\s*=\s*'reviewer_id'/i);
    expect(sql).toMatch(/pg_get_indexdef\(i\.indexrelid\s*,\s*2\s*,\s*true\)\s*=\s*'seller_id'/i);
    expect(sql).toMatch(/access_method\.amname\s*=\s*'btree'/i);
  });

  it("matches every review ACL column and omitted insert default to the deployed core schema", () => {
    const core = readFileSync(coreSchemaUrl, "utf8");
    const reviewTable = core.match(/create table public\.reviews\s*\(([\s\S]*?)\n\);/i)?.[1] ?? "";
    for (const column of ["id", "reviewer_id", "seller_id", "listing_id", "rating", "comment", "created_at", "updated_at"]) {
      expect(reviewTable).toMatch(new RegExp(`\\b${column}\\b`, "i"));
    }
    expect(reviewTable).toMatch(/id\s+uuid\s+primary\s+key\s+default\s+gen_random_uuid\(\)/i);
    expect(reviewTable).toMatch(/listing_id\s+uuid\s+references[^,]+(?:,|$)/i);
    expect(reviewTable).toMatch(/created_at\s+timestamptz\s+not\s+null\s+default\s+now\(\)/i);
    expect(reviewTable).toMatch(/updated_at\s+timestamptz\s+not\s+null\s+default\s+now\(\)/i);
  });
});
