-- Phase 1 stabilization: privilege boundaries, idempotent creation, and publish integrity.
create unique index if not exists listings_seller_request_uidx
  on public.listings(seller_id, (attributes ->> '_request_id'))
  where attributes ? '_request_id';
create unique index if not exists profiles_username_lower_uidx on public.profiles(lower(username));
alter table public.listings drop constraint if exists listings_attributes_object;
alter table public.listings add constraint listings_attributes_object check (jsonb_typeof(attributes) = 'object');

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare base_username text; chosen_username text;
begin
  base_username := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'player')), '[^a-z0-9_.]', '', 'g');
  if char_length(base_username) < 3 then base_username := 'player'; end if;
  chosen_username := left(base_username, 24);
  if exists(select 1 from public.profiles where lower(username) = lower(chosen_username)) then chosen_username := left(base_username, 17) || '_' || substr(new.id::text, 1, 6); end if;
  insert into public.profiles (id, username, display_name) values (new.id, chosen_username, left(coalesce(new.raw_user_meta_data->>'display_name', base_username), 80));
  return new;
end; $$;

create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id <> old.id then raise exception 'profile id is immutable' using errcode = '42501'; end if;
  if auth.uid() is not null and not public.is_admin() and
     (new.is_admin is distinct from old.is_admin or new.suspended_at is distinct from old.suspended_at or new.seller_type is distinct from old.seller_type)
  then raise exception 'protected profile fields cannot be changed' using errcode = '42501'; end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges before update on public.profiles for each row execute function public.protect_profile_privileges();
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;

create or replace function public.protect_listing_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and
     (new.seller_id is distinct from old.seller_id or new.view_count is distinct from old.view_count or new.published_at is distinct from old.published_at or new.sold_at is distinct from old.sold_at)
  then raise exception 'protected listing fields cannot be changed' using errcode = '42501'; end if;
  if new.status = 'active' and old.status is distinct from 'active' then
    if not exists (select 1 from public.listing_images i where i.listing_id = new.id) then raise exception 'at least one image is required to publish' using errcode = '23514'; end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'sold' and old.status is distinct from 'sold' then new.sold_at := coalesce(new.sold_at, now()); end if;
  return new;
end; $$;
drop trigger if exists listings_protect_fields on public.listings;
create trigger listings_protect_fields before update on public.listings for each row execute function public.protect_listing_fields();
revoke all on function public.protect_listing_fields() from public, anon, authenticated;

create or replace function public.validate_listing_image()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare image_count integer;
begin
  if split_part(new.storage_path, '/', 1) <> auth.uid()::text or split_part(new.storage_path, '/', 2) <> new.listing_id::text then
    raise exception 'invalid image ownership path' using errcode = '42501';
  end if;
  select count(*) into image_count from public.listing_images where listing_id = new.listing_id and id <> new.id;
  if image_count >= 8 then raise exception 'a listing can have at most 8 images' using errcode = '23514'; end if;
  return new;
end; $$;
drop trigger if exists listing_images_validate on public.listing_images;
create trigger listing_images_validate before insert or update on public.listing_images for each row execute function public.validate_listing_image();
revoke all on function public.validate_listing_image() from public, anon, authenticated;

drop policy if exists "listings own insert" on public.listings;
create policy "listings own insert" on public.listings for insert to authenticated with check (seller_id = auth.uid() and status = 'draft');

revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_path, location) on public.profiles to authenticated;
revoke insert on public.reports from authenticated;
grant insert (reporter_id, listing_id, reason, details) on public.reports to authenticated;

drop policy if exists "listing images storage own insert" on storage.objects;
drop policy if exists "listing images storage own update" on storage.objects;
drop policy if exists "listing images storage own delete" on storage.objects;
create policy "listing images storage own insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text and exists (
    select 1 from public.listings l where l.id::text = (storage.foldername(name))[2] and l.seller_id = auth.uid()
  )
);
create policy "listing images storage own update" on storage.objects for update to authenticated using (
  bucket_id = 'listing-images' and owner_id = auth.uid()::text and (storage.foldername(name))[1] = auth.uid()::text
) with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing images storage own delete" on storage.objects for delete to authenticated using (
  bucket_id = 'listing-images' and owner_id = auth.uid()::text and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.limit_phase1_abuse()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare recent_count integer;
begin
  if tg_table_name = 'listings' then
    select count(*) into recent_count from public.listings where seller_id = auth.uid() and created_at > now() - interval '1 hour';
    if recent_count >= 10 then raise exception 'listing rate limit exceeded' using errcode = 'P0001'; end if;
  elsif tg_table_name = 'reports' then
    select count(*) into recent_count from public.reports where reporter_id = auth.uid() and created_at > now() - interval '1 day';
    if recent_count >= 20 then raise exception 'report rate limit exceeded' using errcode = 'P0001'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists listings_rate_limit on public.listings;
create trigger listings_rate_limit before insert on public.listings for each row execute function public.limit_phase1_abuse();
drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports for each row execute function public.limit_phase1_abuse();
revoke all on function public.limit_phase1_abuse() from public, anon, authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.search_listings(text, text, numeric, numeric) from public;
grant execute on function public.search_listings(text, text, numeric, numeric) to anon, authenticated;
