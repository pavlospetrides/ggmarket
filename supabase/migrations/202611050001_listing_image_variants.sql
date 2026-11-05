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
