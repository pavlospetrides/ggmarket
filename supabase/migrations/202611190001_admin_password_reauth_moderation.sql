-- Password-reauthenticated, RPC-only administration for listings, users and reports.
-- Forward-only: production application flags remain disabled until this migration is
-- applied, independently verified, and explicitly acknowledged by the Admin app.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles
  add column if not exists restriction_kind text,
  add column if not exists restricted_until timestamptz,
  add column if not exists restriction_reason text,
  add column if not exists restriction_version bigint not null default 0,
  add column if not exists restriction_updated_at timestamptz,
  add column if not exists restriction_actor_id uuid references public.profiles(id) on delete set null,
  add column if not exists auth_sync_status text,
  add column if not exists auth_sync_updated_at timestamptz;

update public.profiles
set restriction_kind = 'banned',
    restriction_reason = coalesce(restriction_reason, 'Legacy account suspension'),
    restriction_updated_at = coalesce(restriction_updated_at, suspended_at, now()),
    auth_sync_status = coalesce(auth_sync_status, 'synced')
where suspended_at is not null and restriction_kind is null;

alter table public.profiles
  drop constraint if exists profiles_restriction_kind_check,
  drop constraint if exists profiles_restriction_state_check,
  drop constraint if exists profiles_restriction_reason_check,
  drop constraint if exists profiles_auth_sync_status_check;

alter table public.profiles
  add constraint profiles_restriction_kind_check
    check (restriction_kind is null or restriction_kind in ('suspended', 'banned')),
  add constraint profiles_restriction_state_check
    check (
      (restriction_kind is null and restricted_until is null)
      or (restriction_kind = 'suspended' and restricted_until is not null)
      or (restriction_kind = 'banned' and restricted_until is null)
    ),
  add constraint profiles_restriction_reason_check
    check (restriction_reason is null or char_length(restriction_reason) between 5 and 1000),
  add constraint profiles_auth_sync_status_check
    check (auth_sync_status is null or auth_sync_status in ('pending', 'synced', 'failed'));

create index if not exists profiles_restriction_state_idx
  on public.profiles(restriction_kind, restricted_until)
  where restriction_kind is not null;

create or replace function public.is_active_profile(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_profile
      and (
        (p.restriction_kind is null and p.suspended_at is null)
        or (p.restriction_kind = 'suspended' and p.restricted_until <= now())
      )
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and public.is_active_profile(auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
      and public.is_active_profile(p.id)
  );
$$;

revoke all on function public.is_active_profile(uuid) from public, anon, authenticated;
grant execute on function public.is_active_profile(uuid) to anon, authenticated;
revoke all on function public.is_active_user() from public, anon, authenticated;
grant execute on function public.is_active_user() to authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.enforce_active_actor_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_active_user() then
    raise exception 'suspended accounts cannot modify marketplace data' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.enforce_active_actor_mutation() from public, anon, authenticated;

do $migration$
declare relation_name text;
begin
  foreach relation_name in array array[
    'profiles', 'listings', 'listing_images', 'favorites', 'reviews', 'reports',
    'messages', 'offers', 'trade_proposals', 'saved_searches', 'recently_viewed',
    'verification_challenges', 'seller_verifications', 'gg_cards'
  ] loop
    if to_regclass('public.' || relation_name) is not null then
      execute format('drop trigger if exists enforce_active_actor_mutation on public.%I', relation_name);
      execute format(
        'create trigger enforce_active_actor_mutation before insert or update or delete on public.%I for each row execute function public.enforce_active_actor_mutation()',
        relation_name
      );
    end if;
  end loop;
end;
$migration$;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles
  for select using (public.is_active_profile(id) or id = auth.uid());
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles
  for select to authenticated using (public.is_admin());

-- The public profiles table has column-level SELECT grants. Expose the
-- moderation columns through a guarded view without granting them directly
-- to every authenticated Marketplace user.
create or replace view public.admin_profile_moderation
  with (security_barrier = true)
as select p.* from public.profiles p where public.is_admin();
revoke all on public.admin_profile_moderation from public, anon, authenticated;
grant select on public.admin_profile_moderation to authenticated;

drop policy if exists "active listings public read" on public.listings;
create policy "active listings public read" on public.listings
  for select using (
    (status = 'active' and public.is_active_profile(seller_id))
    or seller_id = auth.uid()
  );
drop policy if exists "listings admin read" on public.listings;
create policy "listings admin read" on public.listings
  for select to authenticated using (public.is_admin());

drop policy if exists "listings own insert" on public.listings;
create policy "listings own insert" on public.listings
  for insert to authenticated
  with check (seller_id = auth.uid() and status = 'draft' and public.is_active_user());

drop policy if exists "listings own update" on public.listings;
create policy "listings own update" on public.listings
  for update to authenticated
  using (seller_id = auth.uid() and public.is_active_user())
  with check (seller_id = auth.uid() and public.is_active_user());

drop policy if exists "listings own delete" on public.listings;
create policy "listings own delete" on public.listings
  for delete to authenticated
  using (seller_id = auth.uid() and public.is_active_user());

drop policy if exists "listing images public read" on public.listing_images;
create policy "listing images public read" on public.listing_images
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          (l.status = 'active' and public.is_active_profile(l.seller_id))
          or l.seller_id = auth.uid()
        )
    )
  );
drop policy if exists "listing images admin read" on public.listing_images;
create policy "listing images admin read" on public.listing_images
  for select to authenticated using (public.is_admin());

drop policy if exists "reports admin update" on public.reports;

do $storage_policy$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "listing images storage controlled read" on storage.objects';
    execute 'drop policy if exists "listing images storage admin read" on storage.objects';
    execute 'drop policy if exists "listing images storage own delete" on storage.objects';
    execute $policy$
      create policy "listing images storage controlled read" on storage.objects
      for select using (
        bucket_id = 'listing-images' and exists (
          select 1
          from public.listing_images i
          join public.listings l on l.id = i.listing_id
          where storage.objects.name in (i.storage_path, i.card_path, i.detail_path)
            and (
              (l.status = 'active' and public.is_active_profile(l.seller_id))
              or l.seller_id = auth.uid()
            )
        )
      )
    $policy$;
    execute $policy$
      create policy "listing images storage admin read" on storage.objects
      for select to authenticated using (
        bucket_id = 'listing-images' and public.is_admin()
      )
    $policy$;
    execute $policy$
      create policy "listing images storage own delete" on storage.objects
      for delete to authenticated using (
        bucket_id = 'listing-images'
        and owner_id = auth.uid()::text
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.is_active_user()
      )
    $policy$;
  end if;
end;
$storage_policy$;

alter table public.moderation_audit_logs
  drop constraint if exists moderation_audit_logs_action_check,
  drop constraint if exists moderation_audit_logs_target_type_check;

alter table public.moderation_audit_logs
  add constraint moderation_audit_logs_action_check check (action in (
    'listing_removed', -- retained for audit rows written by the legacy moderation RPC
    'listing_hidden', 'listing_restored',
    'user_suspended', 'user_banned', 'user_restored',
    'report_actioned', 'report_dismissed',
    'auth_sync_synced', 'auth_sync_failed'
  )),
  add constraint moderation_audit_logs_target_type_check check (target_type in ('listing', 'user', 'report'));

create unique index if not exists moderation_audit_correlation_action_uidx
  on public.moderation_audit_logs ((metadata ->> 'correlation_id'), action)
  where metadata ? 'correlation_id';

create table private.admin_mutation_capabilities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  scope text not null check (scope in (
    'listing:hide', 'listing:restore',
    'user:suspend', 'user:ban', 'user:restore',
    'report:action', 'report:dismiss'
  )),
  issued_at timestamptz not null default now(),
  auth_updated_at timestamptz not null,
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses = 1),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  revoked_at timestamptz,
  consumed_at timestamptz,
  consumed_correlation_id uuid,
  issuance_correlation_id uuid not null unique,
  check (expires_at > issued_at)
);

create index admin_mutation_capabilities_actor_active_idx
  on private.admin_mutation_capabilities(actor_id, expires_at)
  where revoked_at is null and use_count = 0;

alter table private.admin_mutation_capabilities enable row level security;
revoke all on private.admin_mutation_capabilities from public, anon, authenticated, service_role;

create or replace function public.issue_admin_mutation_capability(
  p_actor_id uuid,
  p_token_hash text,
  p_scope text,
  p_expires_at timestamptz,
  p_max_uses integer,
  p_correlation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  capability_id uuid;
  actor_auth_updated_at timestamptz;
begin
  if p_actor_id is null
     or not exists (
       select 1 from public.profiles p
       where p.id = p_actor_id and p.is_admin = true and public.is_active_profile(p.id)
     ) then
    raise exception 'administrator unavailable' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid capability hash' using errcode = '22023';
  end if;
  if p_scope not in (
    'listing:hide', 'listing:restore',
    'user:suspend', 'user:ban', 'user:restore',
    'report:action', 'report:dismiss'
  ) then
    raise exception 'invalid capability scope' using errcode = '22023';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '10 minutes' or p_max_uses <> 1 then
    raise exception 'invalid capability lifetime' using errcode = '22023';
  end if;

  select u.updated_at into actor_auth_updated_at from auth.users u where u.id = p_actor_id;
  if actor_auth_updated_at is null then
    raise exception 'administrator unavailable' using errcode = '42501';
  end if;

  insert into private.admin_mutation_capabilities(
    actor_id, token_hash, scope, expires_at, max_uses, issuance_correlation_id, auth_updated_at
  ) values (
    p_actor_id, decode(p_token_hash, 'hex'), p_scope, p_expires_at, p_max_uses, p_correlation_id, actor_auth_updated_at
  ) returning id into capability_id;
  return capability_id;
end;
$$;

create or replace function public.revoke_admin_mutation_capabilities(p_actor_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare revoked_count integer;
begin
  update private.admin_mutation_capabilities
  set revoked_at = coalesce(revoked_at, now())
  where actor_id = p_actor_id and revoked_at is null and use_count < max_uses;
  get diagnostics revoked_count = row_count;
  return revoked_count;
end;
$$;

create or replace function private.consume_admin_mutation_capability(
  p_token text,
  p_scope text,
  p_correlation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare capability_id uuid;
begin
  if p_token is null or length(p_token) < 32 or p_correlation_id is null then
    raise exception 'valid administrative capability required' using errcode = '42501';
  end if;

  select c.id into capability_id
  from private.admin_mutation_capabilities c
  join auth.users u on u.id = c.actor_id and u.updated_at = c.auth_updated_at
  where c.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and c.actor_id = auth.uid()
    and c.scope = p_scope
    and c.revoked_at is null
    and c.expires_at > now()
    and c.use_count < c.max_uses
  for update;

  if capability_id is null then
    raise exception 'valid administrative capability required' using errcode = '42501';
  end if;

  update private.admin_mutation_capabilities
  set use_count = use_count + 1,
      consumed_at = now(),
      consumed_correlation_id = p_correlation_id
  where id = capability_id;
  return capability_id;
end;
$$;

revoke all on function public.issue_admin_mutation_capability(uuid,text,text,timestamptz,integer,uuid) from public, anon, authenticated;
grant execute on function public.issue_admin_mutation_capability(uuid,text,text,timestamptz,integer,uuid) to service_role;
revoke all on function public.revoke_admin_mutation_capabilities(uuid) from public, anon, authenticated;
grant execute on function public.revoke_admin_mutation_capabilities(uuid) to service_role;
revoke all on function private.consume_admin_mutation_capability(text,text,uuid) from public, anon, authenticated, service_role;

create or replace function public.admin_moderate_listing(
  p_target_id uuid,
  p_action text,
  p_reason text,
  p_correlation_id uuid,
  p_capability text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  seller uuid;
  old_status public.listing_status;
  new_status public.listing_status;
  capability_id uuid;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_action not in ('hide', 'restore') then raise exception 'invalid listing action' using errcode = '23514'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 or char_length(trim(p_reason)) > 1000 then
    raise exception 'moderation reason must contain 5 to 1000 characters' using errcode = '22023';
  end if;

  capability_id := private.consume_admin_mutation_capability(
    p_capability,
    case p_action when 'hide' then 'listing:hide' else 'listing:restore' end,
    p_correlation_id
  );

  select l.seller_id, l.status into seller, old_status
  from public.listings l where l.id = p_target_id for update;
  if not found then raise exception 'listing unavailable' using errcode = 'P0002'; end if;
  if p_action = 'hide' and old_status = 'removed' then raise exception 'listing is already hidden' using errcode = '23514'; end if;
  if p_action = 'restore' and old_status <> 'removed' then raise exception 'only hidden listings can be restored' using errcode = '23514'; end if;

  new_status := case p_action when 'hide' then 'removed'::public.listing_status else 'draft'::public.listing_status end;
  update public.listings
  set status = new_status,
      published_at = case when p_action = 'restore' then null else published_at end,
      sold_at = case when p_action = 'restore' then null else sold_at end,
      updated_at = now()
  where id = p_target_id;

  insert into public.moderation_audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    actor,
    case p_action when 'hide' then 'listing_hidden' else 'listing_restored' end,
    'listing',
    p_target_id,
    jsonb_build_object(
      'reason', trim(p_reason), 'from_status', old_status::text, 'to_status', new_status::text,
      'correlation_id', p_correlation_id, 'capability_id', capability_id
    )
  );

  insert into public.notifications(user_id, type, title, body, href, entity_id, dedupe_key)
  values (
    seller, 'moderation',
    case p_action when 'hide' then 'Listing hidden' else 'Listing restored to draft' end,
    trim(p_reason), '/account/listings', p_target_id,
    'admin-listing:' || p_correlation_id::text
  ) on conflict do nothing;

  return jsonb_build_object('status', new_status::text);
end;
$$;

create or replace function public.admin_set_user_restriction(
  p_target_id uuid,
  p_kind text,
  p_expires_at timestamptz,
  p_reason text,
  p_expected_version bigint,
  p_correlation_id uuid,
  p_capability text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_is_admin boolean;
  current_version bigint;
  next_version bigint;
  capability_id uuid;
  required_scope text;
  action_name text;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_target_id = actor then raise exception 'administrators cannot restrict their own account' using errcode = '42501'; end if;
  if p_kind is not null and p_kind not in ('suspended', 'banned') then raise exception 'invalid restriction kind' using errcode = '23514'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 or char_length(trim(p_reason)) > 1000 then
    raise exception 'moderation reason must contain 5 to 1000 characters' using errcode = '22023';
  end if;
  if p_kind = 'suspended' and (p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '366 days') then
    raise exception 'invalid suspension expiry' using errcode = '22023';
  end if;
  if (p_kind is null or p_kind = 'banned') and p_expires_at is not null then
    raise exception 'unexpected restriction expiry' using errcode = '22023';
  end if;

  required_scope := case p_kind when 'suspended' then 'user:suspend' when 'banned' then 'user:ban' else 'user:restore' end;
  action_name := case p_kind when 'suspended' then 'user_suspended' when 'banned' then 'user_banned' else 'user_restored' end;
  capability_id := private.consume_admin_mutation_capability(p_capability, required_scope, p_correlation_id);

  -- Serialize administrator restriction decisions so two concurrent requests
  -- cannot each observe the other administrator as active and suspend both.
  perform pg_catalog.pg_advisory_xact_lock(202611190001);

  select p.is_admin, p.restriction_version into target_is_admin, current_version
  from public.profiles p where p.id = p_target_id for update;
  if not found then raise exception 'target profile unavailable' using errcode = 'P0002'; end if;
  if current_version <> p_expected_version then raise exception 'restriction version conflict' using errcode = '40001'; end if;
  if target_is_admin and p_kind is not null and not exists (
    select 1 from public.profiles p
    where p.is_admin = true and p.id <> p_target_id and public.is_active_profile(p.id)
  ) then
    raise exception 'the last active administrator cannot be restricted' using errcode = '42501';
  end if;

  next_version := current_version + 1;
  update public.profiles
  set restriction_kind = p_kind,
      restricted_until = case when p_kind = 'suspended' then p_expires_at else null end,
      restriction_reason = case when p_kind is null then null else trim(p_reason) end,
      restriction_version = next_version,
      restriction_updated_at = now(),
      restriction_actor_id = actor,
      auth_sync_status = 'pending',
      auth_sync_updated_at = now(),
      suspended_at = case when p_kind is null then null else coalesce(suspended_at, now()) end,
      updated_at = now()
  where id = p_target_id;

  insert into public.moderation_audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    actor, action_name, 'user', p_target_id,
    jsonb_build_object(
      'reason', trim(p_reason), 'restriction_kind', p_kind, 'restricted_until', p_expires_at,
      'version', next_version, 'correlation_id', p_correlation_id, 'capability_id', capability_id
    )
  );

  insert into public.notifications(user_id, type, title, body, href, entity_id, dedupe_key)
  values (
    p_target_id, 'moderation',
    case p_kind when 'suspended' then 'Account suspended' when 'banned' then 'Account restricted' else 'Account restored' end,
    trim(p_reason), '/account', p_target_id,
    'admin-user:' || p_correlation_id::text
  ) on conflict do nothing;

  return jsonb_build_object(
    'version', next_version,
    'status', coalesce(p_kind, 'active'),
    'auth_sync_status', 'pending'
  );
end;
$$;

create or replace function public.admin_mark_auth_sync(
  p_target_id uuid,
  p_version bigint,
  p_status text,
  p_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid;
begin
  if p_status not in ('synced', 'failed') then raise exception 'invalid Auth sync status' using errcode = '23514'; end if;
  update public.profiles
  set auth_sync_status = p_status, auth_sync_updated_at = now(), updated_at = now()
  where id = p_target_id and restriction_version = p_version
  returning restriction_actor_id into actor;
  if not found then raise exception 'restriction version conflict' using errcode = '40001'; end if;
  insert into public.moderation_audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    actor,
    case p_status when 'synced' then 'auth_sync_synced' else 'auth_sync_failed' end,
    'user', p_target_id,
    jsonb_build_object('version', p_version, 'correlation_id', p_correlation_id)
  );
end;
$$;

create or replace function public.admin_resolve_report(
  p_target_id uuid,
  p_outcome text,
  p_hide_listing boolean,
  p_reason text,
  p_correlation_id uuid,
  p_capability text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  report_row public.reports%rowtype;
  listing_seller uuid;
  listing_status public.listing_status;
  capability_id uuid;
begin
  if not public.is_admin() then raise exception 'admin required' using errcode = '42501'; end if;
  if p_outcome not in ('actioned', 'dismissed') then raise exception 'invalid report outcome' using errcode = '23514'; end if;
  if p_outcome = 'dismissed' and p_hide_listing then raise exception 'dismissed reports cannot hide listings' using errcode = '23514'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 or char_length(trim(p_reason)) > 1000 then
    raise exception 'moderation reason must contain 5 to 1000 characters' using errcode = '22023';
  end if;

  capability_id := private.consume_admin_mutation_capability(
    p_capability,
    case p_outcome when 'actioned' then 'report:action' else 'report:dismiss' end,
    p_correlation_id
  );

  select * into report_row from public.reports where id = p_target_id for update;
  if not found then raise exception 'report unavailable' using errcode = 'P0002'; end if;
  if report_row.status <> 'open' then raise exception 'report is already decided' using errcode = '23514'; end if;

  if p_hide_listing then
    select l.seller_id, l.status into listing_seller, listing_status
    from public.listings l where l.id = report_row.listing_id for update;
    if not found then raise exception 'reported listing unavailable' using errcode = 'P0002'; end if;
    if listing_status <> 'removed' then
      update public.listings set status = 'removed', updated_at = now() where id = report_row.listing_id;
      insert into public.moderation_audit_logs(actor_id, action, target_type, target_id, metadata)
      values (
        actor, 'listing_hidden', 'listing', report_row.listing_id,
        jsonb_build_object(
          'reason', trim(p_reason), 'report_id', p_target_id, 'from_status', listing_status::text,
          'to_status', 'removed', 'correlation_id', p_correlation_id, 'capability_id', capability_id
        )
      );
      insert into public.notifications(user_id, type, title, body, href, entity_id, dedupe_key)
      values (
        listing_seller, 'moderation', 'Listing hidden after report review', trim(p_reason),
        '/account/listings', report_row.listing_id, 'admin-report-listing:' || p_correlation_id::text
      ) on conflict do nothing;
    end if;
  end if;

  update public.reports
  set status = p_outcome::public.report_status, moderated_by = actor, moderated_at = now()
  where id = p_target_id;

  insert into public.moderation_audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    actor,
    case p_outcome when 'actioned' then 'report_actioned' else 'report_dismissed' end,
    'report', p_target_id,
    jsonb_build_object(
      'reason', trim(p_reason), 'hide_listing', p_hide_listing,
      'listing_id', report_row.listing_id, 'correlation_id', p_correlation_id,
      'capability_id', capability_id
    )
  );

  insert into public.notifications(user_id, type, title, body, href, entity_id, dedupe_key)
  values (
    report_row.reporter_id, 'moderation', 'Report reviewed',
    'Your marketplace report was ' || p_outcome, '/notifications', p_target_id,
    'moderation:' || p_target_id::text || ':' || p_outcome
  ) on conflict do nothing;

  return jsonb_build_object('status', p_outcome, 'listing_hidden', p_hide_listing);
end;
$$;

revoke all on function public.admin_moderate_listing(uuid,text,text,uuid,text) from public, anon;
grant execute on function public.admin_moderate_listing(uuid,text,text,uuid,text) to authenticated;
revoke all on function public.admin_set_user_restriction(uuid,text,timestamptz,text,bigint,uuid,text) from public, anon;
grant execute on function public.admin_set_user_restriction(uuid,text,timestamptz,text,bigint,uuid,text) to authenticated;
revoke all on function public.admin_resolve_report(uuid,text,boolean,text,uuid,text) from public, anon;
grant execute on function public.admin_resolve_report(uuid,text,boolean,text,uuid,text) to authenticated;
revoke all on function public.admin_mark_auth_sync(uuid,bigint,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_mark_auth_sync(uuid,bigint,text,uuid) to service_role;

-- The legacy RPC and direct policies do not require the password capability.
-- Keep the function for dependency-safe forward migration, but remove API access.
revoke all on function public.moderate_report(uuid,uuid,text) from public, anon, authenticated;
