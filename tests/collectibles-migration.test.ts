import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/202611130003_collectibles_trading_cards.sql"), "utf8").toLowerCase();

describe("collectibles category migration", () => {
  it("upserts the existing stable slug without deleting listings", () => {
    expect(sql).toContain("'collectibles'");
    expect(sql).toContain("'collectibles & trading cards'");
    expect(sql).toContain("on conflict (slug) do update");
    expect(sql).not.toMatch(/delete\s+from\s+public\.categories/);
    expect(sql).not.toMatch(/drop\s+table/);
  });
});
