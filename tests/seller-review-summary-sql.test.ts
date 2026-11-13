import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sellerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sellerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("public seller review summary", () => {
  it("computes an exact owner-scoped average and count under public read permissions", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create role anon; create role authenticated;
        create table public.reviews(seller_id uuid not null, reviewer_id uuid not null, rating int not null, public_readable boolean not null);
        alter table public.reviews enable row level security;
        create policy "reviews public read" on public.reviews for select using (public_readable);
        grant select on public.reviews to anon, authenticated;
        insert into public.reviews values
          ('${sellerA}','11111111-1111-4111-8111-111111111111',5,true),
          ('${sellerA}','22222222-2222-4222-8222-222222222222',4,true),
          ('${sellerA}','55555555-5555-4555-8555-555555555555',1,false),
          ('${sellerB}','33333333-3333-4333-8333-333333333333',1,true);
      `);
      const migration = readFileSync(new URL("../supabase/migrations/202611130001_seller_review_summary.sql", import.meta.url), "utf8");
      await db.exec(migration);
      await db.exec("set role anon;");
      const own = await db.query(`select * from public.seller_review_summary('${sellerA}')`);
      const other = await db.query(`select * from public.seller_review_summary('${sellerB}')`);
      expect(own.rows).toEqual([{ average: 4.5, review_count: 2 }]);
      expect(other.rows).toEqual([{ average: 1, review_count: 1 }]);
      await expect(db.query("insert into public.reviews values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444',5,true)")).rejects.toThrow();
    } finally { await db.close(); }
  });
});
