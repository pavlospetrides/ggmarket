import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../supabase/migrations/202611130004_collectibles_cards_hierarchy.sql", import.meta.url), "utf8");

describe("Collectibles & Cards forward migration", () => {
  it("upserts one category and adds canonical filters while preserving old attributes", async () => {
    const db = new PGlite();
    try {
      await db.exec("create schema if not exists public; create table public.categories(id integer generated always as identity primary key, name text not null, slug text unique not null, icon text, sort_order integer, attribute_schema jsonb not null default '{}'::jsonb, active boolean not null default true); create table public.listings(id integer generated always as identity primary key, category_id integer not null references public.categories(id), attributes jsonb not null default '{}'::jsonb);");
      await db.exec("insert into public.categories(name,slug,icon,sort_order) values ('Collectibles & Trading Cards','collectibles','Trophy',110),('Games','games','Disc3',20); insert into public.listings(category_id,attributes) values (1,'{\"subcategory\":\"pokemon-tcg\",\"product_type\":\"single-card\",\"card_name\":\"Pikachu\"}'),(1,'{\"subcategory\":\"funko-collectible-figures\",\"character\":\"Link\"}'),(1,'{\"subcategory\":\"pokemon-tcg\",\"product_type\":\"graded-card\",\"grading_score\":\"10\"}'),(1,'{\"brand\":\"Unknown\"}'),(2,'{\"genre\":\"action\"}');");
      await db.exec(sql);
      await db.exec(sql);
      const categories = await db.query<{ name: string; slug: string; attribute_schema: Record<string, { type: string }> }>("select name,slug,attribute_schema from public.categories where slug='collectibles'");
      expect(categories.rows).toHaveLength(1);
      expect(categories.rows[0].name).toBe("Collectibles & Cards");
      expect(categories.rows[0].attribute_schema.item_type.type).toBe("string");
      const listings = await db.query<{ attributes: Record<string, unknown> }>("select attributes from public.listings order by id");
      expect(listings.rows[0].attributes).toMatchObject({ subcategory: "pokemon-tcg", product_type: "single-card", card_name: "Pikachu", family: "cards", item_type: "pokemon-cards" });
      expect(listings.rows[1].attributes).toMatchObject({ subcategory: "funko-collectible-figures", character: "Link", family: "collectibles", item_type: "funko-pop" });
      expect(listings.rows[2].attributes).toMatchObject({ subcategory: "pokemon-tcg", grading_score: "10", family: "cards", item_type: "graded-cards" });
      expect(listings.rows[3].attributes).toMatchObject({ brand: "Unknown", family: "collectibles", item_type: "other-collectibles" });
      expect(listings.rows[4].attributes).toEqual({ genre: "action" });
      const cards = await db.query<{ count: number }>("select count(*)::int as count from public.listings l join public.categories c on c.id=l.category_id where c.slug='collectibles' and l.attributes @> '{\"family\":\"cards\"}'::jsonb");
      const pokemon = await db.query<{ count: number }>("select count(*)::int as count from public.listings l join public.categories c on c.id=l.category_id where c.slug='collectibles' and l.attributes @> '{\"family\":\"cards\",\"item_type\":\"pokemon-cards\"}'::jsonb");
      const collectibles = await db.query<{ count: number }>("select count(*)::int as count from public.listings l join public.categories c on c.id=l.category_id where c.slug='collectibles' and l.attributes @> '{\"family\":\"collectibles\"}'::jsonb");
      expect(cards.rows[0].count).toBe(2);
      expect(pokemon.rows[0].count).toBe(1);
      expect(collectibles.rows[0].count).toBe(2);
    } finally {
      await db.close();
    }
  });
});
