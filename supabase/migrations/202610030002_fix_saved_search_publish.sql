-- Keep saved-search matching compatible with the function's locked-down search path.
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
      or public.similarity(new.title, s.search_term) > 0.3
    )
  on conflict do nothing;

  return new;
end;
$$;

-- CURRENT_USER is a PostgreSQL keyword that resolves to type name. Use an
-- unambiguous variable name so UUID membership checks work inside the RPC.
create or replace function public.start_conversation(target_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := auth.uid(); owner_id uuid; result_id uuid;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select seller_id into owner_id
  from public.listings
  where id = target_listing_id and status = 'active';
  if owner_id is null then
    raise exception 'listing unavailable' using errcode = 'P0002';
  end if;
  if owner_id = actor_id then
    raise exception 'cannot message yourself' using errcode = '23514';
  end if;
  insert into public.conversations(listing_id, buyer_id, seller_id)
  values(target_listing_id, actor_id, owner_id)
  on conflict(listing_id, buyer_id, seller_id)
  do update set updated_at = public.conversations.updated_at
  returning id into result_id;
  insert into public.conversation_members(conversation_id, user_id)
  values(result_id, actor_id), (result_id, owner_id)
  on conflict do nothing;
  return result_id;
end;
$$;
