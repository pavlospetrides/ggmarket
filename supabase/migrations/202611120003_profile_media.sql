-- Profile images share the existing private R2 bucket. Paths remain metadata;
-- the browser has no storage credentials or direct write permission.
alter table public.profiles add column if not exists cover_path text;

create table public.profile_media_reservations (
  path text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('avatar', 'cover')),
  created_at timestamptz not null default now(),
  check (path ~ '^profile-media/[0-9a-f-]+/(avatar|cover)/[0-9a-f-]+\.webp$'
    and split_part(path, '/', 2) = owner_id::text
    and split_part(path, '/', 3) = kind)
);
alter table public.profile_media_reservations enable row level security;
revoke all on public.profile_media_reservations from public, anon, authenticated;
grant all on public.profile_media_reservations to service_role;

create table public.profile_media_cleanup_jobs (
  path text primary key,
  owner_id uuid not null,
  kind text not null check (kind in ('avatar', 'cover')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index profile_media_cleanup_pending_idx on public.profile_media_cleanup_jobs(owner_id, created_at)
  where completed_at is null;
alter table public.profile_media_cleanup_jobs enable row level security;
revoke all on public.profile_media_cleanup_jobs from public, anon, authenticated;
grant all on public.profile_media_cleanup_jobs to service_role;

create table public.profile_media_upload_claims (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index profile_media_upload_claims_owner_time_idx on public.profile_media_upload_claims(owner_id, created_at desc);
alter table public.profile_media_upload_claims enable row level security;
revoke all on public.profile_media_upload_claims from public, anon, authenticated;
grant all on public.profile_media_upload_claims to service_role;

create function public.claim_profile_media_upload()
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); recent_count integer;
begin
  if actor is null or not public.is_active_user() then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('profile-media:' || actor::text, 0));
  delete from public.profile_media_upload_claims where owner_id = actor and created_at < now() - interval '1 hour';
  select count(*) into recent_count from public.profile_media_upload_claims
    where owner_id = actor and created_at >= now() - interval '1 hour';
  if recent_count >= 10 then return false; end if;
  insert into public.profile_media_upload_claims(owner_id) values(actor);
  return true;
end; $$;
revoke all on function public.claim_profile_media_upload() from public, anon;
grant execute on function public.claim_profile_media_upload() to authenticated;

create function public.validate_profile_media_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare media_kind text; media_path text;
begin
  if auth.role() is distinct from 'service_role' and new.id <> auth.uid() then
    raise exception 'profile owner required' using errcode = '42501';
  end if;
  foreach media_kind in array array['avatar', 'cover'] loop
    media_path := case when media_kind = 'avatar' then new.avatar_path else new.cover_path end;
    if media_path is distinct from (case when media_kind = 'avatar' then old.avatar_path else old.cover_path end)
      and media_path is not null and not exists (
        select 1 from public.profile_media_reservations r
        where r.path = media_path and r.owner_id = new.id and r.kind = media_kind
          and not exists (select 1 from public.profile_media_cleanup_jobs j where j.path = media_path)
          and r.path ~ ('^profile-media/' || new.id::text || '/' || media_kind || '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$')
      ) then
      raise exception 'unreserved profile media' using errcode = '42501';
    end if;
  end loop;
  return new;
end; $$;
revoke all on function public.validate_profile_media_change() from public, anon, authenticated;
create trigger profiles_validate_media before update of avatar_path, cover_path on public.profiles
  for each row execute function public.validate_profile_media_change();

create function public.enqueue_profile_media_cleanup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.avatar_path is not null and old.avatar_path like 'profile-media/%' then
      insert into public.profile_media_cleanup_jobs(path, owner_id, kind)
        values(old.avatar_path, old.id, 'avatar') on conflict (path) do nothing;
    end if;
    if old.cover_path is not null and old.cover_path like 'profile-media/%' then
      insert into public.profile_media_cleanup_jobs(path, owner_id, kind)
        values(old.cover_path, old.id, 'cover') on conflict (path) do nothing;
    end if;
    return old;
  end if;
  if old.avatar_path is distinct from new.avatar_path and old.avatar_path is not null
    and old.avatar_path like 'profile-media/%' then
    insert into public.profile_media_cleanup_jobs(path, owner_id, kind)
      values(old.avatar_path, old.id, 'avatar') on conflict (path) do nothing;
  end if;
  if old.cover_path is distinct from new.cover_path and old.cover_path is not null
    and old.cover_path like 'profile-media/%' then
    insert into public.profile_media_cleanup_jobs(path, owner_id, kind)
      values(old.cover_path, old.id, 'cover') on conflict (path) do nothing;
  end if;
  return new;
end; $$;
revoke all on function public.enqueue_profile_media_cleanup() from public, anon, authenticated;
create trigger profiles_enqueue_media_cleanup after update of avatar_path, cover_path or delete on public.profiles
  for each row execute function public.enqueue_profile_media_cleanup();

grant select (id, username, display_name, bio, avatar_path, cover_path, location, seller_type, created_at, updated_at)
  on public.profiles to anon, authenticated;
grant update (cover_path) on public.profiles to authenticated;
