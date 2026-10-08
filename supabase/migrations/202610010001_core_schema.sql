create extension if not exists pg_trgm;
create extension if not exists unaccent;

create type public.seller_type as enum ('private', 'business');
create type public.listing_condition as enum ('new', 'like_new', 'good', 'fair', 'parts');
create type public.listing_status as enum ('draft', 'active', 'reserved', 'sold', 'removed');
create type public.report_reason as enum ('scam', 'prohibited', 'misleading', 'duplicate', 'spam', 'other');
create type public.report_status as enum ('open', 'dismissed', 'actioned');
create type public.verification_status as enum ('pending', 'verified', 'rejected', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_.]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text check (char_length(bio) <= 500), avatar_path text, location text,
  seller_type public.seller_type not null default 'private', is_admin boolean not null default false,
  suspended_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(), parent_id uuid references public.categories(id) on delete set null,
  name text not null, slug text not null unique, icon text, attribute_schema jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  logo_path text, created_at timestamptz not null default now()
);

create table public.product_catalog (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id),
  brand_id uuid references public.brands(id), name text not null, slug text not null unique,
  attributes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id), product_id uuid references public.product_catalog(id) on delete set null,
  title text not null check (char_length(title) between 6 and 120), description text not null check (char_length(description) between 20 and 5000),
  price numeric(12,2) not null check (price > 0), currency char(3) not null default 'EUR', condition public.listing_condition not null,
  status public.listing_status not null default 'draft', location text not null, latitude numeric(9,6), longitude numeric(9,6),
  shipping_available boolean not null default false, meetup_available boolean not null default true,
  attributes jsonb not null default '{}'::jsonb, view_count integer not null default 0 check (view_count >= 0),
  published_at timestamptz, sold_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(attributes::text, ''))) stored,
  constraint delivery_method_required check (shipping_available or meetup_available)
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null unique, sort_order smallint not null default 0 check (sort_order between 0 and 7),
  width integer, height integer, created_at timestamptz not null default now(), unique(listing_id, sort_order)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade, listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id, listing_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), reviewer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade, listing_id uuid references public.listings(id) on delete set null,
  rating smallint not null check (rating between 1 and 5), comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (reviewer_id <> seller_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade, reason public.report_reason not null,
  details text check (char_length(details) <= 1000), status public.report_status not null default 'open',
  moderated_by uuid references public.profiles(id), moderated_at timestamptz, created_at timestamptz not null default now(),
  unique(reporter_id, listing_id, reason)
);

create table public.seller_verifications (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id) on delete cascade,
  status public.verification_status not null default 'pending', evidence_path text, reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now()
);

create index listings_public_feed_idx on public.listings(status, published_at desc) where status = 'active';
create index listings_seller_idx on public.listings(seller_id, status, created_at desc);
create index listings_category_price_idx on public.listings(category_id, price) where status = 'active';
create index listings_search_idx on public.listings using gin(search_vector);
create index listings_title_trgm_idx on public.listings using gin(title gin_trgm_ops);
create index listings_attributes_idx on public.listings using gin(attributes jsonb_path_ops);
create index listings_location_trgm_idx on public.listings using gin(location gin_trgm_ops);
create index product_catalog_name_trgm_idx on public.product_catalog using gin(name gin_trgm_ops);
create index reports_queue_idx on public.reports(status, created_at desc);
create index reviews_seller_idx on public.reviews(seller_id, created_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.product_catalog for each row execute function public.touch_updated_at();
create trigger listings_touch before update on public.listings for each row execute function public.touch_updated_at();
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare base_username text;
begin
  base_username := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'player')), '[^a-z0-9_.]', '', 'g');
  if char_length(base_username) < 3 then base_username := 'player'; end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, left(base_username, 16) || '_' || substr(new.id::text, 1, 6), coalesce(new.raw_user_meta_data->>'display_name', base_username));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true and suspended_at is null);
$$;
revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.product_catalog enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.seller_verifications enable row level security;

create policy "profiles public read" on public.profiles for select using (suspended_at is null or id = auth.uid() or public.is_admin());
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_admin = false);
create policy "catalog categories read" on public.categories for select using (active or public.is_admin());
create policy "brands read" on public.brands for select using (true);
create policy "catalog products read" on public.product_catalog for select using (true);
create policy "active listings public read" on public.listings for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
create policy "listings own insert" on public.listings for insert to authenticated with check (seller_id = auth.uid() and status in ('draft', 'active'));
create policy "listings own update" on public.listings for update to authenticated using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());
create policy "listings own delete" on public.listings for delete to authenticated using (seller_id = auth.uid() or public.is_admin());
create policy "listing images public read" on public.listing_images for select using (exists(select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid() or public.is_admin())));
create policy "listing images owner write" on public.listing_images for all to authenticated using (exists(select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())) with check (exists(select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy "favorites owner read" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "favorites owner insert" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorites owner delete" on public.favorites for delete to authenticated using (user_id = auth.uid());
create policy "reviews public read" on public.reviews for select using (true);
create policy "reports own insert" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports own or admin read" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy "reports admin update" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "verifications own or admin read" on public.seller_verifications for select to authenticated using (seller_id = auth.uid() or public.is_admin());
create policy "verifications admin update" on public.seller_verifications for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 10485760, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "listing images storage public read" on storage.objects for select using (bucket_id = 'listing-images');
create policy "listing images storage own insert" on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing images storage own update" on storage.objects for update to authenticated using (bucket_id = 'listing-images' and owner_id = auth.uid()::text);
create policy "listing images storage own delete" on storage.objects for delete to authenticated using (bucket_id = 'listing-images' and owner_id = auth.uid()::text);

create or replace function public.search_listings(search_term text, category_slug text default null, min_price numeric default null, max_price numeric default null)
returns setof public.listings language sql stable set search_path = '' as $$
  select l from public.listings l join public.categories c on c.id = l.category_id
  where l.status = 'active' and (search_term is null or l.search_vector @@ websearch_to_tsquery('simple', search_term) or similarity(l.title, search_term) > .2)
    and (category_slug is null or c.slug = category_slug) and (min_price is null or l.price >= min_price) and (max_price is null or l.price <= max_price)
  order by greatest(ts_rank(l.search_vector, websearch_to_tsquery('simple', coalesce(search_term, ''))), similarity(l.title, coalesce(search_term, ''))) desc, l.published_at desc;
$$;
