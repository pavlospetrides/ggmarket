-- Phase 2 marketplace systems: private messaging, offers, trades, notifications,
-- saved searches, recently viewed, listing intent, and verification challenges.

create type public.listing_intent as enum ('sale', 'wanted', 'trade', 'sale_or_trade');
create type public.offer_status as enum ('pending', 'accepted', 'declined', 'countered', 'withdrawn', 'expired');
create type public.trade_status as enum ('pending', 'accepted', 'declined', 'countered', 'withdrawn', 'expired');
create type public.notification_type as enum ('message', 'offer', 'offer_accepted', 'offer_declined', 'counteroffer', 'trade', 'trade_accepted', 'trade_declined', 'review', 'saved_search', 'moderation');
create type public.verification_kind as enum ('email', 'phone', 'identity', 'business', 'item_ownership');

alter table public.listings add column intent public.listing_intent not null default 'sale';
alter table public.listings add column wanted_budget_min numeric(12,2) check (wanted_budget_min is null or wanted_budget_min > 0);
alter table public.listings add column wanted_budget_max numeric(12,2) check (wanted_budget_max is null or wanted_budget_max > 0);
alter table public.listings add column trade_cash_max numeric(12,2) check (trade_cash_max is null or trade_cash_max >= 0);
alter table public.listings add constraint wanted_budget_order check (wanted_budget_min is null or wanted_budget_max is null or wanted_budget_min <= wanted_budget_max);
create index listings_intent_feed_idx on public.listings(intent, status, published_at desc);
create index listings_product_price_analytics_idx on public.listings(product_id, status, price) where product_id is not null;

update public.listings set intent = case when attributes->>'intent' in ('sale','wanted','trade','sale_or_trade') then (attributes->>'intent')::public.listing_intent else 'sale' end;
create or replace function public.sync_listing_intent() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.attributes->>'intent' in ('sale','wanted','trade','sale_or_trade') then new.intent := (new.attributes->>'intent')::public.listing_intent; end if;
  if jsonb_typeof(new.attributes->'wanted_budget_min') = 'number' then new.wanted_budget_min := (new.attributes->>'wanted_budget_min')::numeric; end if;
  if jsonb_typeof(new.attributes->'wanted_budget_max') = 'number' then new.wanted_budget_max := (new.attributes->>'wanted_budget_max')::numeric; end if;
  if jsonb_typeof(new.attributes->'trade_cash_max') = 'number' then new.trade_cash_max := (new.attributes->>'trade_cash_max')::numeric; end if;
  return new;
end; $$;
create trigger listings_sync_intent before insert or update of attributes on public.listings for each row execute function public.sync_listing_intent();

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id), unique(listing_id, buyer_id, seller_id)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz, muted boolean not null default false,
  joined_at timestamptz not null default now(), primary key(conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  client_id uuid not null, created_at timestamptz not null default now(),
  edited_at timestamptz, deleted_at timestamptz,
  unique(sender_id, client_id)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0), currency char(3) not null default 'EUR',
  status public.offer_status not null default 'pending', parent_offer_id uuid references public.offers(id) on delete set null,
  expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id and created_by in (buyer_id, seller_id))
);

create table public.trade_proposals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  target_listing_id uuid not null references public.listings(id) on delete cascade,
  offered_listing_id uuid references public.listings(id) on delete set null,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  cash_adjustment numeric(12,2) not null default 0 check (cash_adjustment >= 0),
  note text check (char_length(note) <= 1000), status public.trade_status not null default 'pending',
  parent_proposal_id uuid references public.trade_proposals(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (proposer_id <> recipient_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null, title text not null check (char_length(title) between 1 and 160),
  body text check (char_length(body) <= 500), href text check (href is null or href ~ '^/[^/\\]'),
  entity_id uuid, dedupe_key text not null, read_at timestamptz, created_at timestamptz not null default now(),
  unique(user_id, dedupe_key)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80), search_term text check (char_length(search_term) <= 120),
  category_id uuid references public.categories(id) on delete set null, condition public.listing_condition,
  intent public.listing_intent, min_price numeric(12,2), max_price numeric(12,2), location text,
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'), enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (min_price is null or min_price > 0), check (max_price is null or max_price > 0),
  check (min_price is null or max_price is null or min_price <= max_price),
  check (location is null or char_length(location) <= 120)
);

create table public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewed_at timestamptz not null default now(), view_count integer not null default 1 check (view_count > 0),
  primary key(user_id, listing_id)
);

create table public.verification_challenges (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade, kind public.verification_kind not null,
  status public.verification_status not null default 'pending', code_hash text,
  code_hint text, attempts smallint not null default 0 check (attempts between 0 and 10),
  expires_at timestamptz not null, verified_at timestamptz, created_at timestamptz not null default now()
);

create index conversations_buyer_idx on public.conversations(buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations(seller_id, last_message_at desc);
create index conversation_members_user_idx on public.conversation_members(user_id, conversation_id);
create index messages_conversation_time_idx on public.messages(conversation_id, created_at desc);
create index offers_conversation_idx on public.offers(conversation_id, created_at desc);
create index offers_participants_idx on public.offers(buyer_id, seller_id, status);
create index trade_proposals_conversation_idx on public.trade_proposals(conversation_id, created_at desc);
create index notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);
create index saved_searches_enabled_category_idx on public.saved_searches(enabled, category_id) where enabled;
create index recently_viewed_user_time_idx on public.recently_viewed(user_id, viewed_at desc);
create index verification_challenges_seller_idx on public.verification_challenges(seller_id, status, created_at desc);

create trigger conversations_touch before update on public.conversations for each row execute function public.touch_updated_at();
create trigger offers_touch before update on public.offers for each row execute function public.touch_updated_at();
create trigger trades_touch before update on public.trade_proposals for each row execute function public.touch_updated_at();
create trigger saved_searches_touch before update on public.saved_searches for each row execute function public.touch_updated_at();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.trade_proposals enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_searches enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.verification_challenges enable row level security;

create policy "conversation participants read" on public.conversations for select to authenticated using (auth.uid() in (buyer_id, seller_id));
create policy "conversation members read" on public.conversation_members for select to authenticated using (user_id = auth.uid());
create policy "conversation members update own" on public.conversation_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "messages participants read" on public.messages for select to authenticated using (exists(select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()));
create policy "messages sender insert" on public.messages for insert to authenticated with check (sender_id = auth.uid() and exists(select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()));
create policy "offers participants read" on public.offers for select to authenticated using (auth.uid() in (buyer_id, seller_id));
create policy "trades participants read" on public.trade_proposals for select to authenticated using (auth.uid() in (proposer_id, recipient_id));
create policy "notifications owner read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications owner update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved searches owner all" on public.saved_searches for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recent views owner all" on public.recently_viewed for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "verification owner read" on public.verification_challenges for select to authenticated using (seller_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.conversations, public.conversation_members, public.offers, public.trade_proposals, public.notifications, public.verification_challenges from authenticated;
revoke update, delete on public.messages from authenticated;
grant insert (conversation_id, sender_id, body, client_id) on public.messages to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.start_conversation(target_listing_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user uuid := auth.uid(); owner_id uuid; result_id uuid;
begin
  if current_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select seller_id into owner_id from public.listings where id = target_listing_id and status = 'active';
  if owner_id is null then raise exception 'listing unavailable' using errcode = 'P0002'; end if;
  if owner_id = current_user then raise exception 'cannot message yourself' using errcode = '23514'; end if;
  insert into public.conversations(listing_id, buyer_id, seller_id) values(target_listing_id, current_user, owner_id)
  on conflict(listing_id, buyer_id, seller_id) do update set updated_at = public.conversations.updated_at returning id into result_id;
  insert into public.conversation_members(conversation_id, user_id) values(result_id, current_user), (result_id, owner_id) on conflict do nothing;
  return result_id;
end; $$;

create or replace function public.create_offer(target_conversation uuid, offer_amount numeric, parent_id uuid default null)
returns public.offers language plpgsql security definer set search_path = '' as $$
declare c public.conversations; result public.offers; active_count integer; changed integer;
begin
  select * into c from public.conversations where id = target_conversation and auth.uid() in (buyer_id, seller_id);
  if c.id is null then raise exception 'conversation unavailable' using errcode = '42501'; end if;
  if offer_amount <= 0 then raise exception 'invalid offer amount' using errcode = '23514'; end if;
  select count(*) into active_count from public.offers where conversation_id = c.id and created_by = auth.uid() and created_at > now() - interval '1 hour';
  if active_count >= 10 then raise exception 'offer rate limit exceeded' using errcode = 'P0001'; end if;
  if parent_id is not null then
    update public.offers set status = 'countered' where id = parent_id and conversation_id = c.id and status = 'pending' and created_by <> auth.uid();
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'countered offer unavailable' using errcode = '42501'; end if;
  end if;
  insert into public.offers(conversation_id, listing_id, buyer_id, seller_id, created_by, amount, parent_offer_id)
  values(c.id, c.listing_id, c.buyer_id, c.seller_id, auth.uid(), offer_amount, parent_id) returning * into result;
  return result;
end; $$;

create or replace function public.respond_to_offer(target_offer uuid, action public.offer_status)
returns public.offers language plpgsql security definer set search_path = '' as $$
declare current_offer public.offers; result public.offers;
begin
  select * into current_offer from public.offers where id = target_offer and auth.uid() in (buyer_id, seller_id) for update;
  if current_offer.id is null or current_offer.status <> 'pending' then raise exception 'offer unavailable' using errcode = '42501'; end if;
  if action = 'withdrawn' and auth.uid() <> current_offer.created_by then raise exception 'only creator can withdraw' using errcode = '42501'; end if;
  if action in ('accepted','declined') and auth.uid() = current_offer.created_by then raise exception 'creator cannot accept or decline' using errcode = '42501'; end if;
  if action not in ('accepted','declined','withdrawn') then raise exception 'invalid action' using errcode = '23514'; end if;
  update public.offers set status = action where id = target_offer returning * into result; return result;
end; $$;

create or replace function public.create_trade_proposal(target_conversation uuid, offered_listing uuid, cash numeric, proposal_note text default null)
returns public.trade_proposals language plpgsql security definer set search_path = '' as $$
declare c public.conversations; result public.trade_proposals; recipient uuid;
begin
  select * into c from public.conversations where id = target_conversation and auth.uid() in (buyer_id, seller_id);
  if c.id is null then raise exception 'conversation unavailable' using errcode = '42501'; end if;
  if offered_listing is null or offered_listing = c.listing_id or not exists(select 1 from public.listings where id = offered_listing and seller_id = auth.uid() and status = 'active') then raise exception 'offered listing is unavailable' using errcode = '42501'; end if;
  recipient := case when auth.uid() = c.buyer_id then c.seller_id else c.buyer_id end;
  insert into public.trade_proposals(conversation_id,target_listing_id,offered_listing_id,proposer_id,recipient_id,cash_adjustment,note)
  values(c.id,c.listing_id,offered_listing,auth.uid(),recipient,greatest(coalesce(cash,0),0),nullif(btrim(proposal_note),'')) returning * into result;
  return result;
end; $$;

create or replace function public.respond_to_trade(target_proposal uuid, action public.trade_status)
returns public.trade_proposals language plpgsql security definer set search_path = '' as $$
declare proposal public.trade_proposals; result public.trade_proposals;
begin
  select * into proposal from public.trade_proposals where id = target_proposal and auth.uid() in (proposer_id, recipient_id) for update;
  if proposal.id is null or proposal.status <> 'pending' then raise exception 'proposal unavailable' using errcode = '42501'; end if;
  if action = 'withdrawn' and auth.uid() <> proposal.proposer_id then raise exception 'only proposer can withdraw' using errcode = '42501'; end if;
  if action in ('accepted','declined') and auth.uid() <> proposal.recipient_id then raise exception 'only recipient can respond' using errcode = '42501'; end if;
  if action not in ('accepted','declined','withdrawn') then raise exception 'invalid action' using errcode = '23514'; end if;
  update public.trade_proposals set status = action where id = target_proposal returning * into result; return result;
end; $$;

create or replace function public.on_message_created() returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid; sender_name text;
begin
  select case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end into recipient from public.conversations c where c.id = new.conversation_id;
  select display_name into sender_name from public.profiles where id = new.sender_id;
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  insert into public.notifications(user_id,type,title,body,href,entity_id,dedupe_key)
  values(recipient,'message','New message from ' || sender_name,left(new.body,120),'/messages/' || new.conversation_id,new.id,'message:' || new.id) on conflict do nothing;
  return new;
end; $$;
create trigger messages_notify after insert on public.messages for each row execute function public.on_message_created();

create or replace function public.on_offer_changed() returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid; ntype public.notification_type; label text;
begin
  if tg_op = 'INSERT' then recipient := case when new.created_by = new.buyer_id then new.seller_id else new.buyer_id end; ntype := 'offer'; label := 'New offer';
  elsif new.status is distinct from old.status and new.status in ('accepted','declined','countered') then recipient := new.created_by; ntype := case new.status when 'accepted' then 'offer_accepted' when 'declined' then 'offer_declined' else 'counteroffer' end; label := initcap(replace(new.status::text,'_',' ')) || ' offer';
  else return new; end if;
  insert into public.notifications(user_id,type,title,body,href,entity_id,dedupe_key)
  values(recipient,ntype,label,'€' || trim(to_char(new.amount,'FM999999990.00')),'/messages/' || new.conversation_id,new.id,'offer:' || new.id || ':' || new.status) on conflict do nothing;
  return new;
end; $$;
create trigger offers_notify after insert or update of status on public.offers for each row execute function public.on_offer_changed();

create or replace function public.on_trade_changed() returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid; ntype public.notification_type; label text;
begin
  if tg_op = 'INSERT' then recipient := new.recipient_id; ntype := 'trade'; label := 'New trade proposal';
  elsif new.status is distinct from old.status and new.status in ('accepted','declined') then recipient := new.proposer_id; ntype := case new.status when 'accepted' then 'trade_accepted' else 'trade_declined' end; label := 'Trade proposal ' || new.status::text;
  else return new; end if;
  insert into public.notifications(user_id,type,title,body,href,entity_id,dedupe_key)
  values(recipient,ntype,label,case when new.cash_adjustment > 0 then 'Cash adjustment: EUR ' || trim(to_char(new.cash_adjustment,'FM999999990.00')) else null end,'/messages/' || new.conversation_id,new.id,'trade:' || new.id || ':' || new.status) on conflict do nothing;
  return new;
end; $$;
create trigger trades_notify after insert or update of status on public.trade_proposals for each row execute function public.on_trade_changed();

create or replace function public.on_review_created() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id,type,title,body,href,entity_id,dedupe_key)
  values(new.seller_id,'review','New seller review',new.rating || ' out of 5 stars',(select '/profile/' || username from public.profiles where id = new.seller_id),new.id,'review:' || new.id) on conflict do nothing;
  return new;
end; $$;
create trigger reviews_notify after insert on public.reviews for each row execute function public.on_review_created();

create or replace function public.on_report_moderated() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.status in ('dismissed','actioned') then
    insert into public.notifications(user_id,type,title,body,href,entity_id,dedupe_key)
    values(new.reporter_id,'moderation','Report reviewed','Your marketplace report was ' || new.status::text,'/notifications',new.id,'moderation:' || new.id || ':' || new.status) on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger reports_moderation_notify after update of status on public.reports for each row execute function public.on_report_moderated();

create or replace function public.notify_saved_searches() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then return new; end if;
  insert into public.notifications(user_id,type,title,body,href,entity_id,dedupe_key)
  select s.user_id,'saved_search','New match for ' || s.name,new.title,'/listing/' || new.id,new.id,'saved:' || s.id || ':' || new.id
  from public.saved_searches s where s.enabled and s.user_id <> new.seller_id
    and (s.category_id is null or s.category_id = new.category_id) and (s.condition is null or s.condition = new.condition)
    and (s.intent is null or s.intent = new.intent) and (s.min_price is null or new.price >= s.min_price)
    and (s.max_price is null or new.price <= s.max_price) and (s.location is null or new.location ilike '%' || s.location || '%')
    and (s.search_term is null or new.search_vector @@ websearch_to_tsquery('simple',s.search_term) or new.title % s.search_term)
  on conflict do nothing; return new;
end; $$;
create trigger listings_saved_search_notify after insert or update of status on public.listings for each row execute function public.notify_saved_searches();

create or replace function public.limit_phase2_abuse() returns trigger language plpgsql security invoker set search_path = '' as $$
declare recent_count integer;
begin
  if tg_table_name = 'messages' then select count(*) into recent_count from public.messages where sender_id = auth.uid() and created_at > now() - interval '1 minute'; if recent_count >= 30 then raise exception 'message rate limit exceeded' using errcode = 'P0001'; end if;
  elsif tg_table_name = 'saved_searches' then select count(*) into recent_count from public.saved_searches where user_id = auth.uid(); if recent_count >= 25 then raise exception 'saved search limit exceeded' using errcode = 'P0001'; end if;
  end if; return new;
end; $$;
create trigger messages_rate_limit before insert on public.messages for each row execute function public.limit_phase2_abuse();
create trigger saved_searches_rate_limit before insert on public.saved_searches for each row execute function public.limit_phase2_abuse();

create or replace function public.create_item_verification_challenge(target_listing uuid, challenge_hash text, challenge_hint text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if length(challenge_hash) <> 64 or length(challenge_hint) <> 2 then raise exception 'invalid challenge' using errcode = '23514'; end if;
  if not exists(select 1 from public.listings where id = target_listing and seller_id = auth.uid()) then raise exception 'listing unavailable' using errcode = '42501'; end if;
  update public.verification_challenges set status = 'expired' where seller_id = auth.uid() and listing_id = target_listing and kind = 'item_ownership' and status = 'pending';
  insert into public.verification_challenges(seller_id, listing_id, kind, code_hash, code_hint, expires_at)
  values(auth.uid(), target_listing, 'item_ownership', challenge_hash, challenge_hint, now() + interval '24 hours') returning id into result_id;
  return result_id;
end; $$;

create or replace function public.listing_favorite_count(target_listing uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.favorites where listing_id = target_listing;
$$;

create or replace function public.seller_marketplace_stats(target_seller uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'activeListings', count(*) filter (where status = 'active'),
    'soldListings', count(*) filter (where status = 'sold'),
    'totalViews', coalesce(sum(view_count), 0),
    'memberSince', (select created_at from public.profiles where id = target_seller)
  ) from public.listings where seller_id = target_seller and status <> 'removed';
$$;

create policy "conversation channel receive" on realtime.messages for select to authenticated using (
  realtime.messages.extension in ('broadcast','presence') and exists(select 1 from public.conversation_members cm where cm.user_id = auth.uid() and 'conversation:' || cm.conversation_id = realtime.topic())
);
create policy "conversation channel send" on realtime.messages for insert to authenticated with check (
  realtime.messages.extension in ('broadcast','presence') and exists(select 1 from public.conversation_members cm where cm.user_id = auth.uid() and 'conversation:' || cm.conversation_id = realtime.topic())
);

revoke all on function public.start_conversation(uuid) from public; grant execute on function public.start_conversation(uuid) to authenticated;
revoke all on function public.create_offer(uuid,numeric,uuid) from public; grant execute on function public.create_offer(uuid,numeric,uuid) to authenticated;
revoke all on function public.respond_to_offer(uuid,public.offer_status) from public; grant execute on function public.respond_to_offer(uuid,public.offer_status) to authenticated;
revoke all on function public.create_trade_proposal(uuid,uuid,numeric,text) from public; grant execute on function public.create_trade_proposal(uuid,uuid,numeric,text) to authenticated;
revoke all on function public.respond_to_trade(uuid,public.trade_status) from public; grant execute on function public.respond_to_trade(uuid,public.trade_status) to authenticated;
revoke all on function public.create_item_verification_challenge(uuid,text,text) from public; grant execute on function public.create_item_verification_challenge(uuid,text,text) to authenticated;
revoke all on function public.listing_favorite_count(uuid) from public; grant execute on function public.listing_favorite_count(uuid) to anon, authenticated;
revoke all on function public.seller_marketplace_stats(uuid) from public; grant execute on function public.seller_marketplace_stats(uuid) to anon, authenticated;
revoke all on function public.on_message_created(), public.on_offer_changed(), public.on_trade_changed(), public.on_review_created(), public.on_report_moderated(), public.notify_saved_searches(), public.limit_phase2_abuse() from public, anon, authenticated;
revoke all on function public.sync_listing_intent() from public, anon, authenticated;

do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.offers; exception when duplicate_object then null; end $$;
