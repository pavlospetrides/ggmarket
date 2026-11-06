-- Additive listing-media metadata for upload-time variants. Existing rows keep
-- nullable variant paths and continue to use storage_path as a legacy fallback.
alter table public.listing_images
  add column if not exists card_path text,
  add column if not exists detail_path text,
  add column if not exists original_bytes integer check (original_bytes is null or original_bytes > 0),
  add column if not exists card_bytes integer check (card_bytes is null or card_bytes > 0),
  add column if not exists detail_bytes integer check (detail_bytes is null or detail_bytes > 0),
  add column if not exists mime_type text check (mime_type is null or mime_type = 'image/webp'),
  add column if not exists media_version smallint not null default 1 check (media_version between 1 and 32767);

-- The owner-write table policy permits sellers to update their own rows. Bind
-- every recorded object path to the authoritative listing owner, listing row,
-- and image row before Storage SELECT or privileged cleanup trusts it.
create or replace function public.validate_listing_image()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  image_count integer;
  image_owner uuid;
  expected_prefix text;
begin
  select seller_id into image_owner from public.listings where id = new.listing_id;
  if image_owner is null
    or split_part(new.storage_path, '/', 1) <> image_owner::text
    or split_part(new.storage_path, '/', 2) <> new.listing_id::text
  then
    raise exception 'invalid image ownership path' using errcode = '42501';
  end if;

  expected_prefix := image_owner::text || '/' || new.listing_id::text || '/' || new.id::text;
  if (new.card_path is not null and new.card_path <> expected_prefix || '/card.webp')
    or (new.detail_path is not null and new.detail_path <> expected_prefix || '/detail.webp')
  then
    raise exception 'invalid image variant ownership path' using errcode = '42501';
  end if;

  select count(*) into image_count
  from public.listing_images
  where listing_id = new.listing_id and id <> new.id;
  if image_count >= 8 then
    raise exception 'a listing can have at most 8 images' using errcode = '23514';
  end if;
  return new;
end; $$;
revoke all on function public.validate_listing_image() from public, anon, authenticated;

create unique index if not exists listing_images_card_path_uidx
  on public.listing_images(card_path)
  where card_path is not null;

create unique index if not exists listing_images_detail_path_uidx
  on public.listing_images(detail_path)
  where detail_path is not null;

-- Public buckets bypass object RLS. Keep every listing artifact private and
-- authorize only paths that are recorded on a row the caller may view.
update storage.buckets set public = false where id = 'listing-images';

drop policy if exists "listing images storage controlled read" on storage.objects;
create policy "listing images storage controlled read" on storage.objects
  for select using (
    bucket_id = 'listing-images' and exists (
      select 1
      from public.listing_images i
      join public.listings l on l.id = i.listing_id
      where storage.objects.name in (i.storage_path, i.card_path, i.detail_path)
        and (l.status = 'active' or l.seller_id = auth.uid() or public.is_admin())
    )
  );
