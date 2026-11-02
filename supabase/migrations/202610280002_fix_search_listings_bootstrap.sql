-- Replace the immutable legacy function using pg_trgm's actual installation
-- schema. Fresh databases install the trusted relocatable extension in
-- pg_catalog so the immutable first migration can validate; existing databases
-- keep their current extension schema.
do $migration$
declare extension_schema text;
begin
  select n.nspname into extension_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if extension_schema is null then
    raise exception 'pg_trgm extension is required';
  end if;

  execute format(
    'create or replace function public.search_listings(
       search_term text,
       category_slug text default null,
       min_price numeric default null,
       max_price numeric default null
     )
     returns setof public.listings
     language sql stable set search_path = ''''
     as $function$
       select l
       from public.listings l
       join public.categories c on c.id = l.category_id
       where l.status = ''active''
         and (
           search_term is null
           or l.search_vector @@ websearch_to_tsquery(''simple'', search_term)
           or %1$I.similarity(l.title, search_term) > .2
         )
         and (category_slug is null or c.slug = category_slug)
         and (min_price is null or l.price >= min_price)
         and (max_price is null or l.price <= max_price)
       order by greatest(
         ts_rank(l.search_vector, websearch_to_tsquery(''simple'', coalesce(search_term, ''''))),
         %1$I.similarity(l.title, coalesce(search_term, ''''))
       ) desc, l.published_at desc
     $function$',
    extension_schema
  );
end;
$migration$;
