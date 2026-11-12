import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const foreign = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const listing = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const image = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const prefix = `${owner}/${listing}/${image}`;
let db: PGlite;

async function asOwner(sql: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false); select set_config('request.jwt.claim.role', 'authenticated', false);`);
  try { return await db.query(sql); } finally { await db.exec("reset role;"); }
}
const insert = (provider: string, id = image) => `insert into public.listing_images(id,listing_id,storage_path,card_path,detail_path,storage_provider) values ('${id}','${listing}','${owner}/${listing}/${id}/original.webp','${owner}/${listing}/${id}/card.webp','${owner}/${listing}/${id}/detail.webp','${provider}') returning storage_provider`;

describe("provider migration in disposable embedded PostgreSQL", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; grant usage on schema auth to public;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
      create function public.is_admin() returns boolean language sql stable as $$ select false $$;
      create table public.profiles(id uuid primary key, suspended_at timestamptz);
      create table public.listings(id uuid primary key, seller_id uuid references public.profiles(id), status text);
      create table public.listing_images(id uuid primary key, listing_id uuid references public.listings(id), storage_path text unique not null, sort_order int default 0, width int, height int);
      create schema storage; create table storage.buckets(id text primary key, public boolean); create table storage.objects(name text, bucket_id text);
      alter table public.listings enable row level security;
      alter table public.listing_images enable row level security;
      grant select on public.listings, public.profiles to anon, authenticated;
      grant select, insert, update, delete on public.listing_images to authenticated;
      grant select on public.listing_images to anon;
      insert into public.profiles values ('${owner}',null),('${foreign}',null);
      insert into public.listings values ('${listing}','${owner}','draft');
    `);
    const core = read("202610010001_core_schema.sql");
    for (const name of ["active listings public read", "listing images public read", "listing images owner write"]) {
      await db.exec(core.match(new RegExp(`create policy "${name}"[^;]+;`))![0]);
    }
    await db.exec(read("202611050001_listing_image_variants.sql"));
    await db.exec("create trigger listing_images_validate before insert or update on public.listing_images for each row execute function public.validate_listing_image();");
    await db.exec(read("202611120002_listing_image_storage_provider.sql"));
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("rejects unassigned client R2 inserts and protects the assignment table", async () => {
    await expect(asOwner(insert("r2"))).rejects.toThrow("trusted image assignment required");
    await expect(asOwner("select * from public.listing_image_storage_assignments")).rejects.toThrow("permission denied");
    await expect(asOwner(`insert into public.listing_image_storage_assignments values ('${image}','${listing}','${owner}','r2','${"a".repeat(64)}',now())`)).rejects.toThrow("permission denied");
  });
  it("derives the provider from a server reservation and keeps private drafts unreadable to another account", async () => {
    await db.exec(`insert into public.listing_image_storage_assignments(id,listing_id,seller_id,storage_provider,sha256) values('${image}','${listing}','${owner}','r2','${"a".repeat(64)}')`);
    const result = await asOwner(insert("supabase"));
    expect(result.rows).toEqual([{ storage_provider: "r2" }]);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${foreign}', false);`);
    try { expect((await db.query("select id from public.listing_images")).rows).toEqual([]); }
    finally { await db.exec("reset role"); }
    await expect(asOwner(`update public.listing_images set storage_provider='supabase' where id='${image}'`)).rejects.toThrow("protected image metadata");
    await expect(asOwner(`update public.listing_images set storage_path='${prefix}/foreign.webp' where id='${image}'`)).rejects.toThrow("protected image metadata");
  });
  it("does not permit another seller to attach or reassign a reserved namespace", async () => {
    await db.exec(`update public.listing_image_storage_assignments set seller_id='${foreign}' where id='${image}'; delete from public.listing_images where id='${image}'`);
    await expect(asOwner(insert("supabase"))).rejects.toThrow("invalid image assignment");
  });
  it("keeps a legacy Supabase path intact and blocks client provider changes", async () => {
    const legacy = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await asOwner(`insert into public.listing_images(id,listing_id,storage_path) values('${legacy}','${listing}','${owner}/${listing}/legacy.jpg')`);
    expect((await asOwner(`select storage_provider,storage_path from public.listing_images where id='${legacy}'`)).rows).toEqual([{ storage_provider: "supabase", storage_path: `${owner}/${listing}/legacy.jpg` }]);
    await expect(asOwner(`update public.listing_images set storage_provider='r2' where id='${legacy}'`)).rejects.toThrow("protected image metadata");
  });
});
