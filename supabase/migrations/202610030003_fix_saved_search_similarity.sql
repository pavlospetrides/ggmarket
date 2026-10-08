-- Resolve pg_trgm's actual installation schema once at migration time. Supabase
-- commonly installs extensions outside public, while the notification trigger
-- intentionally runs with an empty search_path.
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
    'create or replace function public.saved_search_similarity(left_text text, right_text text)
     returns real language sql stable set search_path = ''''
     as $function$ select %I.similarity(left_text, right_text) $function$',
    extension_schema
  );
end;
$migration$;

revoke all on function public.saved_search_similarity(text, text)
from public, anon, authenticated;

create or replace function public.notify_saved_searches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  insert into public.notifications(user_id, type, title, body, href, entity_id, dedupe_key)
  select
    s.user_id,
    'saved_search',
    'New match for ' || s.name,
    new.title,
    '/listing/' || new.id,
    new.id,
    'saved:' || s.id || ':' || new.id
  from public.saved_searches s
  where s.enabled
    and s.user_id <> new.seller_id
    and (s.category_id is null or s.category_id = new.category_id)
    and (s.condition is null or s.condition = new.condition)
    and (s.intent is null or s.intent = new.intent)
    and (s.min_price is null or new.price >= s.min_price)
    and (s.max_price is null or new.price <= s.max_price)
    and (s.location is null or new.location ilike '%' || s.location || '%')
    and (
      s.search_term is null
      or new.search_vector @@ pg_catalog.websearch_to_tsquery('simple', s.search_term)
      or public.saved_search_similarity(new.title, s.search_term) > 0.3
    )
  on conflict do nothing;

  return new;
end;
$$;
