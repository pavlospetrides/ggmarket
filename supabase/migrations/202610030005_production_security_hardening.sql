-- Final production security hardening: suspension enforcement, immutable state
-- transitions, public-data minimization, bounded negotiation values, and
-- atomic moderation audit logging.

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and suspended_at is null
  );
$$;
revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

create or replace function public.reject_suspended_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_active_user() then
    raise exception 'account is suspended' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.reject_suspended_actor() from public, anon, authenticated;

do $migration$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'listings', 'listing_images', 'favorites', 'reviews', 'reports',
    'conversations', 'conversation_members', 'messages', 'offers',
    'trade_proposals', 'notifications', 'saved_searches', 'recently_viewed',
    'verification_challenges'
  ]
  loop
    execute format('drop trigger if exists reject_suspended_actor on public.%I', table_name);
    execute format(
      'create trigger reject_suspended_actor before insert or update or delete on public.%I for each row execute function public.reject_suspended_actor()',
      table_name
    );
  end loop;
end;
$migration$;

create or replace function public.protect_listing_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and
     (new.seller_id is distinct from old.seller_id or new.view_count is distinct from old.view_count or new.published_at is distinct from old.published_at or new.sold_at is distinct from old.sold_at)
  then raise exception 'protected listing fields cannot be changed' using errcode = '42501'; end if;

  if auth.uid() is not null and not public.is_admin() and new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('active', 'removed')) or
    (old.status = 'active' and new.status in ('reserved', 'sold', 'removed')) or
    (old.status = 'reserved' and new.status in ('active', 'sold', 'removed'))
  ) then
    raise exception 'invalid listing status transition' using errcode = '23514';
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    if not exists (select 1 from public.listing_images i where i.listing_id = new.id) then
      raise exception 'at least one image is required to publish' using errcode = '23514';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at := coalesce(new.sold_at, now());
  end if;
  return new;
end;
$$;
revoke all on function public.protect_listing_fields() from public, anon, authenticated;

alter table public.offers
  add constraint offers_amount_application_limit check (amount <= 1000000) not valid;
alter table public.offers validate constraint offers_amount_application_limit;
alter table public.trade_proposals
  add constraint trades_cash_application_limit check (cash_adjustment <= 1000000) not valid;
alter table public.trade_proposals validate constraint trades_cash_application_limit;

-- Direct Data API callers receive only fields intended for public profiles.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, bio, avatar_path, location, seller_type, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- Owners can see challenge status and hint, never the stored hash.
revoke select on public.verification_challenges from authenticated;
grant select (id, seller_id, listing_id, kind, status, code_hint, attempts, expires_at, verified_at, created_at)
  on public.verification_challenges to authenticated;

-- Public buckets bypass object SELECT policies. Keep drafts private and issue
-- short-lived signed URLs only for active listings or the owning seller/admin.
update storage.buckets set public = false where id = 'listing-images';
drop policy if exists "listing images storage public read" on storage.objects;
create policy "listing images storage controlled read" on storage.objects
  for select using (
    bucket_id = 'listing-images' and exists (
      select 1
      from public.listing_images i
      join public.listings l on l.id = i.listing_id
      where i.storage_path = storage.objects.name
        and (l.status = 'active' or l.seller_id = auth.uid() or public.is_admin())
    )
  );

create table public.moderation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('report_dismissed', 'listing_removed')),
  target_type text not null check (target_type in ('report', 'listing')),
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index moderation_audit_actor_time_idx on public.moderation_audit_logs(actor_id, created_at desc);
create index moderation_audit_target_idx on public.moderation_audit_logs(target_type, target_id, created_at desc);
alter table public.moderation_audit_logs enable row level security;
create policy "moderation audit admin read" on public.moderation_audit_logs
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.moderation_audit_logs from anon, authenticated;

create or replace function public.moderate_report(
  target_report uuid,
  target_listing uuid,
  decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare report_listing uuid;
begin
  if not public.is_admin() then
    raise exception 'admin required' using errcode = '42501';
  end if;
  if decision not in ('dismiss', 'remove') then
    raise exception 'invalid moderation decision' using errcode = '23514';
  end if;

  select listing_id into report_listing
  from public.reports
  where id = target_report and status = 'open'
  for update;
  if report_listing is null or report_listing <> target_listing then
    raise exception 'report unavailable' using errcode = 'P0002';
  end if;

  if decision = 'remove' then
    update public.listings set status = 'removed' where id = target_listing;
    update public.reports
      set status = 'actioned', moderated_by = auth.uid(), moderated_at = now()
      where id = target_report;
    insert into public.moderation_audit_logs(actor_id, action, target_type, target_id, metadata)
      values(auth.uid(), 'listing_removed', 'listing', target_listing, jsonb_build_object('report_id', target_report));
  else
    update public.reports
      set status = 'dismissed', moderated_by = auth.uid(), moderated_at = now()
      where id = target_report;
    insert into public.moderation_audit_logs(actor_id, action, target_type, target_id)
      values(auth.uid(), 'report_dismissed', 'report', target_report);
  end if;
end;
$$;
revoke all on function public.moderate_report(uuid, uuid, text) from public, anon;
grant execute on function public.moderate_report(uuid, uuid, text) to authenticated;
