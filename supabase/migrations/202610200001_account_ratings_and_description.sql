-- Account trust improvements: allow concise required descriptions and permit
-- authenticated users to maintain one community rating per profile pair.
--
-- This is a versioned, forward-only migration. The IF NOT EXISTS guards make
-- recovery from a partially completed local/staging run predictable; an
-- existing object with the same name is assumed to have this definition.

-- Fail before any DDL if the deployed reviews table cannot support the
-- application insert shape. Extra columns are allowed, but all client ACLs on
-- every live column are removed below before narrow grants are restored.
do $migration$
begin
  if exists (
    select 1
    from unnest(array[
      'id', 'reviewer_id', 'seller_id', 'listing_id',
      'rating', 'comment', 'created_at', 'updated_at'
    ]) as required(column_name)
    left join information_schema.columns c
      on c.table_schema = 'public'
      and c.table_name = 'reviews'
      and c.column_name = required.column_name
    where c.column_name is null
  ) then
    raise exception 'public.reviews does not match the required column schema';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews'
      and column_name = 'id' and is_nullable = 'NO'
      and column_default is not null
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews'
      and column_name = 'listing_id' and is_nullable = 'YES'
      and column_default is null
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews'
      and column_name = 'created_at' and is_nullable = 'NO'
      and column_default is not null
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews'
      and column_name = 'updated_at' and is_nullable = 'NO'
      and column_default is not null
  ) then
    raise exception 'public.reviews defaults do not support the rating insert shape';
  end if;
end;
$migration$;

-- Install and validate the replacement before removing the stricter legacy
-- constraint. Existing rows remain protected throughout the normal migration.
do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_description_required'
  ) then
    alter table public.listings
      add constraint listings_description_required
      check (
        description is not null
        and char_length(btrim(
          description,
          U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
        )) between 1 and 5000
      ) not valid;
  end if;
end;
$migration$;

alter table public.listings
  validate constraint listings_description_required;

alter table public.listings
  drop constraint if exists listings_description_check;

-- Fail closed rather than selecting an arbitrary review to retain.
do $migration$
begin
  if exists (
    select 1
    from public.reviews
    group by reviewer_id, seller_id
    having count(*) > 1
  ) then
    raise exception 'duplicate reviewer/target ratings must be resolved before migration';
  end if;
end;
$migration$;

-- IF NOT EXISTS alone can silently accept a same-named but incompatible index.
-- Refuse that state before using the guard for partial-run recovery.
do $migration$
begin
  if to_regclass('public.reviews_reviewer_seller_uidx') is not null
    and not exists (
      select 1
      from pg_catalog.pg_index i
      join pg_catalog.pg_class index_relation on index_relation.oid = i.indexrelid
      join pg_catalog.pg_am access_method on access_method.oid = index_relation.relam
      where i.indexrelid = to_regclass('public.reviews_reviewer_seller_uidx')
        and i.indrelid = 'public.reviews'::regclass
        and access_method.amname = 'btree'
        and i.indisunique
        and i.indisvalid
        and i.indisready
        and i.indpred is null
        and i.indexprs is null
        and i.indnkeyatts = 2
        and i.indnatts = 2
        and pg_catalog.pg_get_indexdef(i.indexrelid, 1, true) = 'reviewer_id'
        and pg_catalog.pg_get_indexdef(i.indexrelid, 2, true) = 'seller_id'
    )
  then
    raise exception 'existing reviews_reviewer_seller_uidx has an incompatible definition';
  end if;
end;
$migration$;

create unique index if not exists reviews_reviewer_seller_uidx
  on public.reviews(reviewer_id, seller_id);

-- Match the trusted suspension predicate used by is_active_user(), while
-- accepting an explicit target profile for reviewer/target authorization.
do $migration$
begin
  execute $definition$
    create or replace function public.is_active_profile(target_profile uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $function$
      select exists (
        select 1
        from public.profiles
        where id = target_profile and suspended_at is null
      );
    $function$
  $definition$;
  execute 'revoke all on function public.is_active_profile(uuid) from public, anon, authenticated';
  execute 'grant execute on function public.is_active_profile(uuid) to authenticated';
end;
$migration$;

alter table public.reviews enable row level security;

-- Clamp both ACL layers before enabling client writes. Table-level REVOKE does
-- not remove grants stored on individual columns, and PUBLIC grants are
-- inherited by every database role.
revoke all privileges on table public.reviews from public, anon, authenticated;
do $migration$
declare review_columns text;
begin
  select string_agg(format('%I', a.attname), ', ' order by a.attnum)
    into review_columns
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.reviews'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if review_columns is null then
    raise exception 'public.reviews has no grantable columns';
  end if;

  execute format(
    'revoke all privileges (%s) on table public.reviews from public, anon, authenticated',
    review_columns
  );
end;
$migration$;

-- Preserve the trusted backend role's DML capability without granting broad
-- client privileges. Table owners retain their normal owner privileges.
grant select, insert, update, delete on table public.reviews to service_role;

-- Public profile pages continue to read reviews through the anon/authenticated
-- Data API roles.
grant select on table public.reviews to anon, authenticated;

drop policy if exists "reviews own insert" on public.reviews;
create policy "reviews own insert"
  on public.reviews
  for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and seller_id <> auth.uid()
    and public.is_active_user()
    and public.is_active_profile(seller_id)
  );

drop policy if exists "reviews own update" on public.reviews;
create policy "reviews own update"
  on public.reviews
  for update
  to authenticated
  using (
    reviewer_id = auth.uid()
    and public.is_active_user()
    and public.is_active_profile(seller_id)
  )
  with check (
    reviewer_id = auth.uid()
    and seller_id <> auth.uid()
    and public.is_active_user()
    and public.is_active_profile(seller_id)
  );

-- No table-level INSERT/UPDATE is granted. These column grants are the only
-- client write capabilities; ownership, target, timestamps, and listing_id
-- cannot be changed after insertion.
grant insert (reviewer_id, seller_id, rating, comment)
  on public.reviews to authenticated;
grant update (rating, comment)
  on public.reviews to authenticated;
