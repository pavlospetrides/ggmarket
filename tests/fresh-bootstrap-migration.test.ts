import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("immutable migration fresh-bootstrap compatibility", () => {
  it("defers legacy SQL-body validation only until a corrective migration qualifies pg_trgm", () => {
    const roles = read("supabase/roles.sql");
    const correction = read("supabase/migrations/202610280002_fix_search_listings_bootstrap.sql");
    expect(roles).toContain("create extension if not exists pg_trgm with schema pg_catalog");
    expect(correction).toContain("%1$I.similarity");
    expect(correction).toContain("where e.extname = 'pg_trgm'");
  });
});
