-- Existing listing image paths remain in Supabase Storage. New application
-- versions may explicitly record R2 after all objects have been stored.
alter table public.listing_images
  add column if not exists storage_provider text not null default 'supabase'
  check (storage_provider in ('supabase', 'r2'));

