import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../supabase/migrations/202611120002_listing_image_storage_provider.sql", import.meta.url),
  "utf8",
);

describe("listing image storage provider migration", () => {
  it("adds a backward-compatible Supabase provider discriminator", () => {
    expect(sql).toMatch(/alter table public\.listing_images/i);
    expect(sql).toMatch(/add column if not exists storage_provider text not null default 'supabase'/i);
    expect(sql).toMatch(/check\s*\(storage_provider in \('supabase',\s*'r2'\)\)/i);
    expect(sql).not.toMatch(/update\s+public\.listing_images/i);
    expect(sql).not.toMatch(/drop\s+(column|table)/i);
  });

  it("does not broaden listing image RLS or Storage access", () => {
    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/grant\s+.*(?:anon|authenticated)/i);
    expect(sql).not.toMatch(/storage\.objects/i);
  });
});
