-- Existing listing image paths remain in Supabase Storage. New application
-- versions may explicitly record R2 after all objects have been stored.
alter table public.listing_images
  add column if not exists storage_provider text not null default 'supabase'
  check (storage_provider in ('supabase', 'r2'));

-- Only the trusted server can reserve an upload provider. These rows also pin
-- retries across feature-flag changes and survive an ambiguous metadata result.
create table public.listing_image_storage_assignments (
  id uuid primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  storage_provider text not null check (storage_provider in ('supabase', 'r2')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.listing_image_storage_assignments enable row level security;
revoke all on public.listing_image_storage_assignments from public, anon, authenticated;
grant all on public.listing_image_storage_assignments to service_role;

create function public.bind_listing_image_storage_provider()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assignment public.listing_image_storage_assignments%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'UPDATE' then
      if new.storage_provider is distinct from old.storage_provider
        or new.id is distinct from old.id or new.listing_id is distinct from old.listing_id
        or (old.storage_provider = 'r2' and (
          new.storage_path is distinct from old.storage_path or new.card_path is distinct from old.card_path
          or new.detail_path is distinct from old.detail_path)) then
        raise exception 'protected image metadata' using errcode = '42501';
      end if;
    else
      select * into assignment from public.listing_image_storage_assignments where id = new.id;
      if found then
        if assignment.seller_id is distinct from auth.uid() or assignment.listing_id <> new.listing_id then
          raise exception 'invalid image assignment' using errcode = '42501';
        end if;
        new.storage_provider := assignment.storage_provider;
      elsif new.storage_provider <> 'supabase' then
        raise exception 'trusted image assignment required' using errcode = '42501';
      end if;
    end if;
  end if;
  if tg_op = 'INSERT' and new.storage_provider = 'r2' and new.storage_path <>
    (select seller_id::text from public.listings where id = new.listing_id)
      || '/' || new.listing_id::text || '/' || new.id::text || '/original.webp' then
    raise exception 'invalid R2 original path' using errcode = '42501';
  end if;
  return new;
end; $$;
revoke all on function public.bind_listing_image_storage_provider() from public, anon, authenticated;
create trigger listing_images_bind_provider before insert or update on public.listing_images
  for each row execute function public.bind_listing_image_storage_provider();

