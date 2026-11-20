import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/202611190001_admin_password_reauth_moderation.sql", import.meta.url),
  "utf8",
);

const ADMIN_A = "00000000-0000-4000-8000-000000000001";
const ADMIN_B = "00000000-0000-4000-8000-000000000002";
const USER_A = "00000000-0000-4000-8000-000000000003";
const USER_B = "00000000-0000-4000-8000-000000000004";
const LISTING_A = "10000000-0000-4000-8000-000000000001";
const LISTING_B = "10000000-0000-4000-8000-000000000002";
const REPORT_A = "20000000-0000-4000-8000-000000000001";

let db: PGlite;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const cap = (label: string) => label.padEnd(32, "-");

async function setActor(id: string, role = "authenticated") {
  await db.exec(`set role ${role}; set request.jwt.claim.sub = '${id}'; set request.jwt.claim.role = '${role}';`);
}

async function resetRole() {
  await db.exec("reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;");
}

async function issue(token: string, scope: string, actor = ADMIN_A) {
  await setActor(actor, "service_role");
  await db.query(
    "select public.issue_admin_mutation_capability($1::uuid, $2, $3, now() + interval '10 minutes', 1, $4::uuid)",
    [actor, hash(token), scope, crypto.randomUUID()],
  );
  await resetRole();
}

const bootstrap = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, updated_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function auth.role() returns text language sql stable as $$
    select nullif(current_setting('request.jwt.claim.role', true), '')
  $$;

  create type public.listing_status as enum ('draft', 'active', 'reserved', 'sold', 'removed');
  create type public.report_status as enum ('open', 'dismissed', 'actioned');
  create table public.profiles (
    id uuid primary key references auth.users(id),
    username text not null unique,
    display_name text not null,
    is_admin boolean not null default false,
    suspended_at timestamptz,
    updated_at timestamptz not null default now()
  );
  create table public.listings (
    id uuid primary key,
    seller_id uuid not null references public.profiles(id),
    title text not null,
    status public.listing_status not null default 'draft',
    published_at timestamptz,
    sold_at timestamptz,
    updated_at timestamptz not null default now()
  );
  create table public.categories (
    id uuid primary key,
    active boolean not null
  );
  create table public.listing_images (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings(id),
    storage_path text not null unique
  );
  create table public.reports (
    id uuid primary key,
    reporter_id uuid not null references public.profiles(id),
    listing_id uuid not null references public.listings(id),
    status public.report_status not null default 'open',
    moderated_by uuid references public.profiles(id),
    moderated_at timestamptz
  );
  create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id),
    type text not null,
    title text not null,
    body text,
    href text,
    entity_id uuid,
    dedupe_key text not null unique,
    created_at timestamptz not null default now()
  );
  create table public.moderation_audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references public.profiles(id),
    action text not null constraint moderation_audit_logs_action_check check (action in ('report_dismissed', 'listing_removed')),
    target_type text not null constraint moderation_audit_logs_target_type_check check (target_type in ('report', 'listing')),
    target_id uuid not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  alter table public.profiles enable row level security;
  alter table public.categories enable row level security;
  alter table public.listings enable row level security;
  alter table public.listing_images enable row level security;
  alter table public.reports enable row level security;
  alter table public.moderation_audit_logs enable row level security;
  create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
    select exists(select 1 from public.profiles where id = auth.uid() and is_admin and suspended_at is null)
  $$;
  create function public.is_active_user() returns boolean language sql stable security definer set search_path = '' as $$
    select exists(select 1 from public.profiles where id = auth.uid() and suspended_at is null)
  $$;
  create function public.is_active_profile(target_profile uuid) returns boolean language sql stable security definer set search_path = '' as $$
    select exists(select 1 from public.profiles where id = target_profile and suspended_at is null)
  $$;
  create policy "profiles public read" on public.profiles for select using (suspended_at is null or id = auth.uid() or public.is_admin());
  create policy "catalog categories read" on public.categories for select using (active or public.is_admin());
  create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and is_admin = false);
  create policy "active listings public read" on public.listings for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
  create policy "listings own insert" on public.listings for insert to authenticated with check (seller_id = auth.uid() and status = 'draft');
  create policy "listings own update" on public.listings for update to authenticated using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());
  create policy "listings own delete" on public.listings for delete to authenticated using (seller_id = auth.uid() or public.is_admin());
  create policy "listing images public read" on public.listing_images for select using (true);
  create policy "reports own insert" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
  create policy "reports own or admin read" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
  create policy "reports admin update" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
  create policy "moderation audit admin read" on public.moderation_audit_logs for select to authenticated using (public.is_admin());
  create function public.moderate_report(uuid, uuid, text) returns void language sql as $$ select $$;
  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
  grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
  grant select on public.profiles, public.listings, public.listing_images to anon;
  grant select on public.categories to anon, authenticated;
  grant execute on all functions in schema public to authenticated, service_role;

  insert into auth.users(id) values ('${ADMIN_A}'), ('${ADMIN_B}'), ('${USER_A}'), ('${USER_B}');
  insert into public.profiles(id, username, display_name, is_admin) values
    ('${ADMIN_A}', 'admin_a', 'Admin A', true),
    ('${ADMIN_B}', 'admin_b', 'Admin B', true),
    ('${USER_A}', 'seller_a', 'Seller A', false),
    ('${USER_B}', 'seller_b', 'Seller B', false);
  insert into public.categories(id, active) values
    ('30000000-0000-4000-8000-000000000001', true),
    ('30000000-0000-4000-8000-000000000002', false);
  insert into public.listings(id, seller_id, title, status, published_at) values
    ('${LISTING_A}', '${USER_A}', 'Listing A', 'active', now()),
    ('${LISTING_B}', '${USER_B}', 'Listing B', 'active', now());
  insert into public.reports(id, reporter_id, listing_id) values ('${REPORT_A}', '${USER_B}', '${LISTING_A}');
  insert into public.moderation_audit_logs(actor_id, action, target_type, target_id)
  values ('${ADMIN_A}', 'listing_removed', 'listing', '99999999-9999-4999-8999-999999999999');
`;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(bootstrap);
  await db.exec(migration);
});

afterEach(async () => {
  await db.close();
});

describe("password-reauthenticated moderation migration", () => {
  it("restores public category reads without granting anonymous admin execution", async () => {
    await db.exec("set role anon; reset request.jwt.claim.sub; set request.jwt.claim.role = 'anon';");
    await expect(db.query("select id from public.categories where active = true")).rejects.toThrow(/permission denied.*is_admin/i);
    await resetRole();
    const repair = readFileSync(new URL("../supabase/migrations/202611200001_catalog_categories_read_policy.sql", import.meta.url), "utf8");
    await db.exec(repair);
    await db.exec("set role anon; reset request.jwt.claim.sub; set request.jwt.claim.role = 'anon';");
    expect((await db.query("select id from public.categories")).rows).toHaveLength(1);
    const anonAdminExecute = await db.query<{ allowed: boolean }>("select has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') allowed");
    expect(anonAdminExecute.rows[0]?.allowed).toBe(false);
    await resetRole();
    await setActor(USER_A);
    expect((await db.query("select id from public.categories")).rows).toHaveLength(1);
    await resetRole();
    await setActor(ADMIN_A);
    expect((await db.query("select id from public.categories")).rows).toHaveLength(2);
    await resetRole();
  });

  it("repairs a missing admin view without changing moderation RPCs or public column grants", async () => {
    await db.exec("drop view public.admin_profile_moderation; revoke select on public.profiles from anon, authenticated; grant select (id, username, display_name, updated_at) on public.profiles to anon, authenticated;");
    const rpcBefore = await db.query<{ signature: string }>(`
      select oid::regprocedure::text signature from pg_proc
      where oid in (
        'public.admin_moderate_listing(uuid,text,text,uuid,text)'::regprocedure,
        'public.admin_set_user_restriction(uuid,text,timestamptz,text,bigint,uuid,text)'::regprocedure,
        'public.admin_resolve_report(uuid,text,boolean,text,uuid,text)'::regprocedure
      ) order by 1
    `);
    const repair = readFileSync(new URL("../supabase/migrations/202611190002_admin_profile_moderation_view.sql", import.meta.url), "utf8");
    await db.exec(repair);
    await db.exec(repair);
    const rpcAfter = await db.query<{ signature: string }>(`
      select oid::regprocedure::text signature from pg_proc
      where oid in (
        'public.admin_moderate_listing(uuid,text,text,uuid,text)'::regprocedure,
        'public.admin_set_user_restriction(uuid,text,timestamptz,text,bigint,uuid,text)'::regprocedure,
        'public.admin_resolve_report(uuid,text,boolean,text,uuid,text)'::regprocedure
      ) order by 1
    `);
    expect(rpcAfter.rows).toEqual(rpcBefore.rows);
    const access = await db.query<{ direct: boolean; admin_view: boolean; anon_view: boolean; barrier: boolean }>(`
      select
        has_column_privilege('authenticated', 'public.profiles', 'restriction_kind', 'select') direct,
        has_table_privilege('authenticated', 'public.admin_profile_moderation', 'select') admin_view,
        has_table_privilege('anon', 'public.admin_profile_moderation', 'select') anon_view,
        coalesce((select reloptions @> array['security_barrier=true'] from pg_class where oid = 'public.admin_profile_moderation'::regclass), false) barrier
    `);
    expect(access.rows[0]).toEqual({ direct: false, admin_view: true, anon_view: false, barrier: true });
    await setActor(ADMIN_A);
    expect((await db.query("select id from public.admin_profile_moderation")).rows).toHaveLength(4);
    await resetRole();
    await setActor(USER_A);
    expect((await db.query("select id from public.admin_profile_moderation")).rows).toHaveLength(0);
    await resetRole();
  });

  it("exposes restriction details only through an administrator read boundary", async () => {
    await db.exec("revoke select on public.profiles from anon, authenticated; grant select (id, username, display_name, updated_at) on public.profiles to anon, authenticated;");
    const grants = await db.query<{ direct: boolean; admin_view: boolean; anon_view: boolean }>(`
      select
        has_column_privilege('authenticated', 'public.profiles', 'restriction_kind', 'select') direct,
        has_table_privilege('authenticated', 'public.admin_profile_moderation', 'select') admin_view,
        has_table_privilege('anon', 'public.admin_profile_moderation', 'select') anon_view
    `);
    expect(grants.rows[0]).toEqual({ direct: false, admin_view: true, anon_view: false });
    await setActor(ADMIN_A);
    expect((await db.query("select id from public.admin_profile_moderation")).rows).toHaveLength(4);
    await resetRole();
    await setActor(USER_A);
    expect((await db.query("select id from public.admin_profile_moderation")).rows).toHaveLength(0);
    await resetRole();
  });

  it("keeps capability storage private and issuance service-role-only", async () => {
    const privileges = await db.query<{ authenticated: boolean; service: boolean }>(`
      select
        has_function_privilege('authenticated', 'public.issue_admin_mutation_capability(uuid,text,text,timestamptz,integer,uuid)', 'execute') authenticated,
        has_function_privilege('service_role', 'public.issue_admin_mutation_capability(uuid,text,text,timestamptz,integer,uuid)', 'execute') service
    `);
    expect(privileges.rows[0]).toEqual({ authenticated: false, service: true });
    const boundary = await db.query<{ relrowsecurity: boolean; policies: number }>(`
      select c.relrowsecurity, (select count(*)::int from pg_policies where schemaname = 'private' and tablename = 'admin_mutation_capabilities') policies
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'private' and c.relname = 'admin_mutation_capabilities'
    `);
    expect(boundary.rows[0]).toEqual({ relrowsecurity: true, policies: 0 });
    const bypasses = await db.query<{ direct_listing_admin: number; direct_report_admin: number; legacy_rpc: boolean }>(`
      select
        (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'listings' and cmd in ('INSERT', 'UPDATE', 'DELETE') and (qual ilike '%is_admin%' or with_check ilike '%is_admin%')) direct_listing_admin,
        (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'reports' and cmd = 'UPDATE' and (qual ilike '%is_admin%' or with_check ilike '%is_admin%')) direct_report_admin,
        has_function_privilege('authenticated', 'public.moderate_report(uuid,uuid,text)', 'execute') legacy_rpc
    `);
    expect(bypasses.rows[0]).toEqual({ direct_listing_admin: 0, direct_report_admin: 0, legacy_rpc: false });
  });

  it("hides and restores listings with audit, notification, and replay protection", async () => {
    await issue(cap("hide-token"), "listing:hide");
    await setActor(ADMIN_A);
    await db.query("select public.admin_moderate_listing($1::uuid, 'hide', $2, $3::uuid, $4)", [LISTING_A, "Confirmed prohibited listing", crypto.randomUUID(), cap("hide-token")]);
    expect((await db.query<{ status: string }>("select status::text status from public.listings where id = $1", [LISTING_A])).rows[0]?.status).toBe("removed");
    expect((await db.query<{ count: number }>("select count(*)::int count from public.moderation_audit_logs where target_id = $1", [LISTING_A])).rows[0]?.count).toBe(1);
    expect((await db.query<{ count: number }>("select count(*)::int count from public.notifications where user_id = $1", [USER_A])).rows[0]?.count).toBe(1);
    await expect(db.query("select public.admin_moderate_listing($1::uuid, 'hide', $2, $3::uuid, $4)", [LISTING_B, "Second attempt", crypto.randomUUID(), cap("hide-token")])).rejects.toThrow(/capability/i);
    expect((await db.query<{ status: string }>("select status::text status from public.listings where id = $1", [LISTING_B])).rows[0]?.status).toBe("active");
    await resetRole();

    await issue(cap("restore-token"), "listing:restore");
    await setActor(ADMIN_A);
    await db.query("select public.admin_moderate_listing($1::uuid, 'restore', $2, $3::uuid, $4)", [LISTING_A, "Appeal accepted", crypto.randomUUID(), cap("restore-token")]);
    const restored = await db.query<{ status: string; published_at: string | null }>("select status::text status, published_at from public.listings where id = $1", [LISTING_A]);
    expect(restored.rows[0]).toEqual({ status: "draft", published_at: null });
  });

  it("rejects wrong-user, wrong-scope, expired, and revoked capabilities", async () => {
    await issue(cap("scope-token"), "listing:hide");
    await setActor(ADMIN_B);
    await expect(db.query("select public.admin_moderate_listing($1::uuid, 'hide', $2, $3::uuid, $4)", [LISTING_A, "Wrong administrator", crypto.randomUUID(), cap("scope-token")])).rejects.toThrow(/capability/i);
    await resetRole();

    await setActor(ADMIN_A);
    await expect(db.query("select public.admin_moderate_listing($1::uuid, 'restore', $2, $3::uuid, $4)", [LISTING_A, "Wrong action scope", crypto.randomUUID(), cap("scope-token")])).rejects.toThrow(/capability/i);
    await resetRole();

    await issue(cap("expired-token"), "listing:hide");
    await db.query("update private.admin_mutation_capabilities set issued_at = now() - interval '20 minutes', expires_at = now() - interval '1 second' where token_hash = sha256(convert_to($1, 'UTF8'))", [cap("expired-token")]);
    await setActor(ADMIN_A);
    await expect(db.query("select public.admin_moderate_listing($1::uuid, 'hide', $2, $3::uuid, $4)", [LISTING_A, "Expired capability", crypto.randomUUID(), cap("expired-token")])).rejects.toThrow(/capability/i);
    await resetRole();

    await issue(cap("revoked-token"), "listing:hide");
    await setActor(ADMIN_A, "service_role");
    await db.query("select public.revoke_admin_mutation_capabilities($1::uuid)", [ADMIN_A]);
    await resetRole();
    await setActor(ADMIN_A);
    await expect(db.query("select public.admin_moderate_listing($1::uuid, 'hide', $2, $3::uuid, $4)", [LISTING_A, "Revoked capability", crypto.randomUUID(), cap("revoked-token")])).rejects.toThrow(/capability/i);
    await resetRole();

    await issue(cap("password-change-token"), "listing:hide");
    await db.query("update auth.users set updated_at = now() + interval '1 second' where id = $1", [ADMIN_A]);
    await setActor(ADMIN_A);
    await expect(db.query("select public.admin_moderate_listing($1::uuid, 'hide', $2, $3::uuid, $4)", [LISTING_A, "Password changed", crypto.randomUUID(), cap("password-change-token")])).rejects.toThrow(/capability/i);
  });

  it("denies a non-admin even if a privileged issuer is compromised into creating a matching capability", async () => {
    const raw = cap("non-admin-token");
    await db.query(`
      insert into private.admin_mutation_capabilities(
        actor_id, token_hash, scope, auth_updated_at, expires_at, max_uses, issuance_correlation_id
      )
      select $1::uuid, sha256(convert_to($2, 'UTF8')), 'listing:hide', u.updated_at,
             now() + interval '5 minutes', 1, $3::uuid
      from auth.users u where u.id = $1::uuid
    `, [USER_B, raw, crypto.randomUUID()]);
    await setActor(USER_B);
    await expect(db.query(
      "select public.admin_moderate_listing($1::uuid, 'hide', $2, $3::uuid, $4)",
      [LISTING_A, "Unauthorized decision", crypto.randomUUID(), raw],
    )).rejects.toThrow(/admin required/i);
  });

  it("enforces self-restriction, last-admin, version, and suspended-user protections", async () => {
    await issue(cap("self-token"), "user:suspend");
    await setActor(ADMIN_A);
    await expect(db.query("select public.admin_set_user_restriction($1::uuid, 'suspended', now() + interval '1 day', $2, 0, $3::uuid, $4)", [ADMIN_A, "Cannot self suspend", crypto.randomUUID(), cap("self-token")])).rejects.toThrow(/own account/i);
    await resetRole();

    await issue(cap("suspend-token"), "user:suspend");
    await setActor(ADMIN_A);
    const result = await db.query<{ version: string }>("select public.admin_set_user_restriction($1::uuid, 'suspended', now() + interval '1 day', $2, 0, $3::uuid, $4)->>'version' version", [USER_A, "Repeated policy violations", crypto.randomUUID(), cap("suspend-token")]);
    expect(result.rows[0]?.version).toBe("1");
    await resetRole();

    await setActor(USER_A);
    await expect(db.query("insert into public.listings(id, seller_id, title) values (gen_random_uuid(), $1::uuid, 'Blocked listing')", [USER_A])).rejects.toThrow(/suspended/i);
    await resetRole();
    await db.exec("set role anon; reset request.jwt.claim.sub; reset request.jwt.claim.role;");
    expect((await db.query<{ count: number }>("select count(*)::int count from public.listings where id = $1", [LISTING_A])).rows[0]?.count).toBe(0);
    await resetRole();

    await issue(cap("restore-user-token"), "user:restore");
    await setActor(ADMIN_A);
    await expect(db.query("select public.admin_set_user_restriction($1::uuid, null, null, $2, 0, $3::uuid, $4)", [USER_A, "Stale version", crypto.randomUUID(), cap("restore-user-token")])).rejects.toThrow(/version/i);
    await resetRole();
    const uses = await db.query<{ use_count: number }>("select use_count from private.admin_mutation_capabilities where token_hash = sha256(convert_to($1, 'UTF8'))", [cap("restore-user-token")]);
    expect(uses.rows[0]?.use_count).toBe(0);

    await issue(cap("restore-user-success"), "user:restore");
    await setActor(ADMIN_A);
    await db.query("select public.admin_set_user_restriction($1::uuid, null, null, $2, 1, $3::uuid, $4)", [USER_A, "Restriction lifted", crypto.randomUUID(), cap("restore-user-success")]);
    await resetRole();
    await db.exec("set role anon; reset request.jwt.claim.sub; reset request.jwt.claim.role;");
    expect((await db.query<{ count: number }>("select count(*)::int count from public.listings where id = $1", [LISTING_A])).rows[0]?.count).toBe(1);
  });

  it("resolves reports atomically and rolls capability consumption back on duplicate decisions", async () => {
    await issue(cap("report-token"), "report:action");
    await setActor(ADMIN_A);
    await db.query("select public.admin_resolve_report($1::uuid, 'actioned', true, $2, $3::uuid, $4)", [REPORT_A, "Confirmed report", crypto.randomUUID(), cap("report-token")]);
    expect((await db.query<{ status: string }>("select status::text status from public.reports where id = $1", [REPORT_A])).rows[0]?.status).toBe("actioned");
    expect((await db.query<{ status: string }>("select status::text status from public.listings where id = $1", [LISTING_A])).rows[0]?.status).toBe("removed");
    await resetRole();

    await issue(cap("duplicate-token"), "report:dismiss");
    await setActor(ADMIN_A);
    await expect(db.query("select public.admin_resolve_report($1::uuid, 'dismissed', false, $2, $3::uuid, $4)", [REPORT_A, "Duplicate decision", crypto.randomUUID(), cap("duplicate-token")])).rejects.toThrow(/already decided/i);
    await resetRole();
    const uses = await db.query<{ use_count: number }>("select use_count from private.admin_mutation_capabilities where token_hash = sha256(convert_to($1, 'UTF8'))", [cap("duplicate-token")]);
    expect(uses.rows[0]?.use_count).toBe(0);
  });
});
