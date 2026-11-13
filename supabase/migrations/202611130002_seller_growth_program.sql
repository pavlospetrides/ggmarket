-- Seller Growth Program: additive, disabled at the application layer by default.
-- No identity documents are collected or stored by this migration.

alter table public.seller_verifications
  alter column status type text using status::text;
alter table public.seller_verifications
  add constraint seller_verifications_status_check
  check (status in ('pending','verified','rejected','expired','more_info','revoked'));

alter table public.seller_verifications
  add column if not exists application_note text,
  add column if not exists reviewer_note text,
  add column if not exists decision_reason text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists eligibility_reviewed_at timestamptz,
  add column if not exists resubmission_eligible_at timestamptz;

alter table public.seller_verifications
  drop constraint if exists seller_verifications_application_note_length,
  add constraint seller_verifications_application_note_length
    check (application_note is null or char_length(application_note) between 20 and 2000),
  drop constraint if exists seller_verifications_reviewer_note_length,
  add constraint seller_verifications_reviewer_note_length
    check (reviewer_note is null or char_length(reviewer_note) <= 2000),
  drop constraint if exists seller_verifications_decision_reason_length,
  add constraint seller_verifications_decision_reason_length
    check (decision_reason is null or char_length(decision_reason) <= 1000);

create unique index if not exists seller_verifications_one_open_idx
  on public.seller_verifications (seller_id)
  where status in ('pending', 'more_info');
create index if not exists seller_verifications_admin_queue_idx
  on public.seller_verifications (status, created_at asc);

create table public.seller_verification_audit (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.seller_verifications(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('submitted','resubmitted','approved','rejected','more_info','revoked')),
  previous_status text check (previous_status is null or previous_status in ('pending','verified','rejected','expired','more_info','revoked')),
  next_status text not null check (next_status in ('pending','verified','rejected','expired','more_info','revoked')),
  reason text check (reason is null or char_length(reason) <= 1000),
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 2000),
  created_at timestamptz not null default now()
);
create index seller_verification_audit_application_idx
  on public.seller_verification_audit(application_id, created_at desc);

create table public.founding_sellers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  slot_number smallint not null check (slot_number between 1 and 100),
  eligibility_met_at timestamptz not null,
  badge_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revocation_reason text check (revocation_reason is null or char_length(revocation_reason) <= 1000),
  constraint founding_sellers_seller_key unique (seller_id),
  unique (slot_number)
);

create table public.promotion_entitlements (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  source text not null check (source in ('founder','referral','admin')),
  source_reference uuid,
  duration_days smallint not null check (duration_days between 1 and 30),
  state text not null default 'available' check (state in ('available','active','expired','suspended','revoked','consumed')),
  starts_at timestamptz,
  expires_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_reference),
  check ((starts_at is null and expires_at is null) or (starts_at is not null and expires_at > starts_at))
);
create index promotion_entitlements_owner_idx
  on public.promotion_entitlements(seller_id, state, created_at);

create table public.featured_listing_campaigns (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.promotion_entitlements(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  state text not null default 'active' check (state in ('active','paused','expired','revoked')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
create unique index featured_listing_campaigns_one_active_seller_idx
  on public.featured_listing_campaigns(seller_id) where state = 'active';
create index featured_listing_campaigns_rotation_idx
  on public.featured_listing_campaigns(state, expires_at, seller_id);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  code text not null unique check (code ~ '^[A-Z0-9]{10,16}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  referrer_id uuid not null references public.profiles(id) on delete restrict,
  referred_id uuid not null unique references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','qualified','rewarded','rejected')),
  risk_status text not null default 'clear' check (risk_status in ('clear','review','blocked')),
  attributed_at timestamptz not null default now(),
  qualified_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  updated_at timestamptz not null default now(),
  check (referrer_id <> referred_id)
);
create index referrals_referrer_status_idx on public.referrals(referrer_id, status, attributed_at desc);

create table public.referral_audit (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('attributed','qualified','rewarded','rejected','risk_changed')),
  previous_status text,
  next_status text not null,
  detail text check (detail is null or char_length(detail) <= 1000),
  created_at timestamptz not null default now()
);

create table public.promotion_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete restrict,
  referral_id uuid not null,
  entitlement_id uuid unique references public.promotion_entitlements(id) on delete restrict,
  reward_type text not null default 'referral_featured_3d' check (reward_type = 'referral_featured_3d'),
  status text not null default 'earned' check (status in ('earned','redeemed','expired','revoked')),
  earned_at timestamptz not null default now(),
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint promotion_reward_ledger_referral_key unique (referral_id, reward_type),
  foreign key (referral_id) references public.referrals(id) on delete restrict
);
create index promotion_reward_ledger_owner_idx
  on public.promotion_reward_ledger(referrer_id, status, earned_at desc);

create or replace function public.prevent_seller_growth_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'immutable seller growth ledger' using errcode = '42501';
end;
$$;
create trigger verification_audit_immutable before update or delete on public.seller_verification_audit
  for each row execute function public.prevent_seller_growth_ledger_mutation();
create trigger referral_audit_immutable before update or delete on public.referral_audit
  for each row execute function public.prevent_seller_growth_ledger_mutation();
create trigger promotion_reward_ledger_immutable before delete on public.promotion_reward_ledger
  for each row execute function public.prevent_seller_growth_ledger_mutation();

create trigger seller_verifications_touch before update on public.seller_verifications
  for each row execute function public.touch_updated_at();
create trigger promotion_entitlements_touch before update on public.promotion_entitlements
  for each row execute function public.touch_updated_at();
create trigger featured_listing_campaigns_touch before update on public.featured_listing_campaigns
  for each row execute function public.touch_updated_at();
create trigger referrals_touch before update on public.referrals
  for each row execute function public.touch_updated_at();

create or replace function public.submit_seller_verification(application_text text)
returns public.seller_verifications
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  result public.seller_verifications;
  latest public.seller_verifications;
begin
  if actor is null or not public.is_active_user() then
    raise exception 'active account required' using errcode = '42501';
  end if;
  application_text := btrim(coalesce(application_text, ''));
  if char_length(application_text) not between 20 and 2000 then
    raise exception 'application must be between 20 and 2000 characters' using errcode = '22023';
  end if;
  if exists (select 1 from public.seller_verifications where seller_id = actor and status in ('pending','more_info')) then
    raise exception 'application already pending' using errcode = '23505';
  end if;
  select * into latest from public.seller_verifications
    where seller_id = actor order by created_at desc limit 1;
  if latest.status = 'rejected' and coalesce(latest.resubmission_eligible_at, latest.reviewed_at + interval '7 days') > now() then
    raise exception 'resubmission cooldown active' using errcode = '42501';
  end if;
  if (select count(*) from public.seller_verifications where seller_id = actor and created_at >= now() - interval '30 days') >= 3 then
    raise exception 'application rate limit reached' using errcode = '42901';
  end if;
  insert into public.seller_verifications(seller_id, status, application_note)
  values (actor, 'pending', application_text) returning * into result;
  insert into public.seller_verification_audit(application_id, seller_id, actor_id, action, previous_status, next_status)
  values (result.id, actor, actor, case when latest.id is null then 'submitted' else 'resubmitted' end, latest.status, 'pending');
  return result;
end;
$$;

create or replace function public.review_seller_verification(
  target_application uuid,
  review_action text,
  reason_text text default null,
  private_note text default null
)
returns public.seller_verifications
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  current_app public.seller_verifications;
  next_status text;
  result public.seller_verifications;
begin
  if actor is null or not public.is_admin() then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if review_action not in ('approve','reject','more_info','revoke') then
    raise exception 'invalid review action' using errcode = '22023';
  end if;
  select * into current_app from public.seller_verifications where id = target_application for update;
  if current_app.id is null then raise exception 'application not found' using errcode = 'P0002'; end if;
  if review_action = 'revoke' then
    if current_app.status <> 'verified' then raise exception 'only approved verification can be revoked' using errcode = '42501'; end if;
    next_status := 'revoked';
  else
    if current_app.status not in ('pending','more_info') then raise exception 'application is not reviewable' using errcode = '42501'; end if;
    next_status := case review_action when 'approve' then 'verified' when 'reject' then 'rejected' else 'more_info' end;
  end if;
  if review_action in ('reject','more_info','revoke') and char_length(btrim(coalesce(reason_text,''))) < 5 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  update public.seller_verifications set
    status = next_status,
    reviewed_by = actor,
    reviewed_at = now(),
    eligibility_reviewed_at = case when next_status = 'verified' then now() else eligibility_reviewed_at end,
    reviewer_note = nullif(btrim(private_note), ''),
    decision_reason = nullif(btrim(reason_text), ''),
    resubmission_eligible_at = case when next_status = 'rejected' then now() + interval '7 days' else null end
  where id = current_app.id returning * into result;
  insert into public.seller_verification_audit(application_id, seller_id, actor_id, action, previous_status, next_status, reason, reviewer_note)
  values (result.id, result.seller_id, actor,
    case review_action when 'approve' then 'approved' when 'reject' then 'rejected' when 'revoke' then 'revoked' else 'more_info' end,
    current_app.status, next_status, nullif(btrim(reason_text), ''), nullif(btrim(private_note), ''));
  insert into public.notifications(user_id, type, title, body, href, entity_id, dedupe_key)
  values (result.seller_id, 'moderation',
    case next_status when 'verified' then 'Seller review approved' when 'rejected' then 'Seller review decision' when 'more_info' then 'Seller review needs information' else 'Seller review revoked' end,
    case next_status when 'verified' then 'Lootriva completed its manual seller review. This is not a transaction guarantee.' else reason_text end,
    '/settings/seller-growth', result.id, 'seller-verification:' || result.id::text || ':' || next_status)
  on conflict (user_id, dedupe_key) do nothing;
  return result;
end;
$$;

create or replace function public.allocate_founding_sellers()
returns integer
language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'active account required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(1280265961);
  with approved as (
    select distinct on (sv.seller_id) sv.seller_id,
      coalesce(sv.eligibility_reviewed_at, sv.reviewed_at, sv.updated_at) approved_at
    from public.seller_verifications sv
    where sv.status = 'verified'
    order by sv.seller_id, coalesce(sv.eligibility_reviewed_at, sv.reviewed_at, sv.updated_at) desc
  ), eligible as (
    select a.seller_id, greatest(a.approved_at, min(l.published_at)) eligibility_met_at
    from approved a join public.profiles p on p.id = a.seller_id and p.suspended_at is null
    join public.listings l on l.seller_id = a.seller_id and l.status = 'active' and l.published_at is not null
    where not exists (select 1 from public.founding_sellers f where f.seller_id = a.seller_id)
    group by a.seller_id, a.approved_at
  ), ranked as (
    select seller_id, eligibility_met_at, row_number() over (order by eligibility_met_at asc, seller_id asc) rn
    from eligible
  ), available as (
    select slot_number, row_number() over (order by slot_number) rn
    from generate_series(1,100) as slots(slot_number)
    where not exists (select 1 from public.founding_sellers f where f.slot_number = slots.slot_number)
  ), inserted as (
    insert into public.founding_sellers(seller_id, slot_number, eligibility_met_at)
    select r.seller_id, a.slot_number, r.eligibility_met_at
    from ranked r join available a using (rn)
    order by r.eligibility_met_at asc, r.seller_id asc
    on conflict do nothing returning id, seller_id
  )
  insert into public.promotion_entitlements(seller_id, source, source_reference, duration_days)
  select seller_id, 'founder', id, 30 from inserted on conflict (source, source_reference) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.activate_featured_listing(target_listing uuid, target_entitlement uuid)
returns public.featured_listing_campaigns
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  entitlement public.promotion_entitlements;
  campaign public.featured_listing_campaigns;
  campaign_start timestamptz;
  campaign_end timestamptz;
begin
  if actor is null or not public.is_active_user() then raise exception 'active account required' using errcode = '42501'; end if;
  if not exists (select 1 from public.listings where id = target_listing and seller_id = actor and status = 'active') then
    raise exception 'eligible owned listing required' using errcode = '42501';
  end if;
  select * into entitlement from public.promotion_entitlements where id = target_entitlement and seller_id = actor for update;
  if entitlement.id is null or entitlement.state not in ('available','active') then raise exception 'entitlement unavailable' using errcode = '42501'; end if;
  campaign_start := coalesce(entitlement.starts_at, now());
  campaign_end := coalesce(entitlement.expires_at, campaign_start + make_interval(days => entitlement.duration_days));
  if campaign_end <= now() then
    update public.promotion_entitlements set state = 'expired' where id = entitlement.id;
    raise exception 'entitlement expired' using errcode = '42501';
  end if;
  update public.featured_listing_campaigns set state = 'paused'
    where seller_id = actor and state = 'active' and entitlement_id <> entitlement.id;
  update public.promotion_entitlements set state = 'active', starts_at = campaign_start, expires_at = campaign_end where id = entitlement.id;
  insert into public.featured_listing_campaigns(entitlement_id, seller_id, listing_id, state, starts_at, expires_at)
  values (entitlement.id, actor, target_listing, 'active', campaign_start, campaign_end)
  on conflict (entitlement_id) do update set listing_id = excluded.listing_id, state = 'active', starts_at = excluded.starts_at, expires_at = excluded.expires_at
  returning * into campaign;
  return campaign;
end;
$$;

create or replace function public.ensure_referral_code()
returns public.referral_codes
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.referral_codes; candidate text;
begin
  if actor is null or not public.is_active_user() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into result from public.referral_codes where user_id = actor;
  if result.id is not null then return result; end if;
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    begin
      insert into public.referral_codes(user_id, code) values (actor, candidate) returning * into result;
      return result;
    exception when unique_violation then null;
    end;
  end loop;
end;
$$;

create or replace function public.claim_referral_attribution(referral_code text)
returns public.referrals
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); code_row public.referral_codes; result public.referrals; created timestamptz;
begin
  if actor is null or not public.is_active_user() then raise exception 'active account required' using errcode = '42501'; end if;
  select p.created_at into created from public.profiles p where p.id = actor;
  if created < now() - interval '7 days' then raise exception 'referral attribution window expired' using errcode = '42501'; end if;
  select * into code_row from public.referral_codes where code = upper(btrim(referral_code)) and active;
  if code_row.id is null then raise exception 'referral code not found' using errcode = 'P0002'; end if;
  if code_row.user_id = actor then raise exception 'self referral is not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.referrals where referrer_id = actor and referred_id = code_row.user_id) then
    raise exception 'circular referral is not allowed' using errcode = '42501';
  end if;
  insert into public.referrals(referral_code_id, referrer_id, referred_id)
  values (code_row.id, code_row.user_id, actor) returning * into result;
  insert into public.referral_audit(referral_id, actor_id, action, next_status)
  values (result.id, actor, 'attributed', 'pending');
  return result;
end;
$$;

create or replace function public.qualify_referrals()
returns integer
language plpgsql security definer set search_path = '' as $$
declare item public.referrals; entitlement_id uuid; awarded integer := 0;
begin
  if auth.uid() is null or (not public.is_admin() and not public.is_active_user()) then
    raise exception 'active account required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(1280265962);
  for item in
    select r.* from public.referrals r
    join public.profiles rp on rp.id = r.referrer_id and rp.suspended_at is null
    join public.profiles np on np.id = r.referred_id and np.suspended_at is null
    join auth.users au on au.id = r.referred_id and au.email_confirmed_at is not null
    where r.status = 'pending' and r.risk_status = 'clear'
      and exists (select 1 from public.listings l where l.seller_id = r.referred_id and l.status = 'active' and l.published_at <= now() - interval '7 days')
    order by r.attributed_at, r.id for update of r skip locked
  loop
    if (select count(*) from public.promotion_reward_ledger l where l.referrer_id = item.referrer_id
        and l.earned_at >= date_trunc('month', now()) and l.earned_at < date_trunc('month', now()) + interval '1 month') >= 5 then
      continue;
    end if;
    insert into public.promotion_entitlements(seller_id, source, source_reference, duration_days)
    values (item.referrer_id, 'referral', item.id, 3)
    on conflict (source, source_reference) do update set source_reference = excluded.source_reference
    returning id into entitlement_id;
    insert into public.promotion_reward_ledger(referrer_id, referral_id, entitlement_id)
    values (item.referrer_id, item.id, entitlement_id) on conflict (referral_id, reward_type) do nothing;
    if found then
      update public.referrals set status = 'rewarded', qualified_at = now() where id = item.id;
      insert into public.referral_audit(referral_id, actor_id, action, previous_status, next_status)
      values (item.id, auth.uid(), 'rewarded', 'pending', 'rewarded');
      insert into public.notifications(user_id, type, title, body, href, entity_id, dedupe_key)
      values (item.referrer_id, 'moderation', 'You earned a 3-day Featured boost', 'Choose one eligible active listing to promote.', '/settings/seller-growth', item.id, 'referral-reward:' || item.id::text)
      on conflict (user_id, dedupe_key) do nothing;
      awarded := awarded + 1;
    end if;
  end loop;
  return awarded;
end;
$$;

create or replace function public.redeem_referral_reward(target_reward uuid, target_listing uuid)
returns public.featured_listing_campaigns
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); reward public.promotion_reward_ledger; campaign public.featured_listing_campaigns;
begin
  if actor is null or not public.is_active_user() then raise exception 'active account required' using errcode = '42501'; end if;
  select * into reward from public.promotion_reward_ledger where id = target_reward and referrer_id = actor for update;
  if reward.id is null or reward.status <> 'earned' then raise exception 'reward unavailable' using errcode = '42501'; end if;
  campaign := public.activate_featured_listing(target_listing, reward.entitlement_id);
  update public.promotion_reward_ledger set status = 'redeemed', redeemed_at = now() where id = reward.id;
  return campaign;
end;
$$;

alter table public.seller_verification_audit enable row level security;
alter table public.founding_sellers enable row level security;
alter table public.promotion_entitlements enable row level security;
alter table public.featured_listing_campaigns enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_audit enable row level security;
alter table public.promotion_reward_ledger enable row level security;

create policy "verification audit owner or admin read" on public.seller_verification_audit
  for select to authenticated using (seller_id = auth.uid() or public.is_admin());
create policy "founders public active read" on public.founding_sellers
  for select using (badge_active and revoked_at is null or seller_id = auth.uid() or public.is_admin());
create policy "promotion entitlements owner or admin read" on public.promotion_entitlements
  for select to authenticated using (seller_id = auth.uid() or public.is_admin());
create policy "featured campaigns public active read" on public.featured_listing_campaigns
  for select using (state = 'active' and expires_at > now() or seller_id = auth.uid() or public.is_admin());
create policy "referral codes owner read" on public.referral_codes
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "referrals participants or admin read" on public.referrals
  for select to authenticated using (auth.uid() in (referrer_id, referred_id) or public.is_admin());
create policy "referral audit participants or admin read" on public.referral_audit
  for select to authenticated using (public.is_admin() or exists (
    select 1 from public.referrals r where r.id = referral_id and auth.uid() in (r.referrer_id, r.referred_id)
  ));
create policy "reward ledger owner or admin read" on public.promotion_reward_ledger
  for select to authenticated using (referrer_id = auth.uid() or public.is_admin());

revoke all on public.seller_verification_audit, public.founding_sellers, public.promotion_entitlements,
  public.featured_listing_campaigns, public.referral_codes, public.referrals, public.referral_audit,
  public.promotion_reward_ledger from anon, authenticated;
grant select on public.founding_sellers, public.featured_listing_campaigns to anon, authenticated;
grant select on public.seller_verification_audit, public.promotion_entitlements, public.referral_codes,
  public.referrals, public.referral_audit, public.promotion_reward_ledger to authenticated;

revoke all on function public.submit_seller_verification(text) from public, anon;
revoke all on function public.review_seller_verification(uuid,text,text,text) from public, anon;
revoke all on function public.allocate_founding_sellers() from public, anon;
revoke all on function public.activate_featured_listing(uuid,uuid) from public, anon;
revoke all on function public.ensure_referral_code() from public, anon;
revoke all on function public.claim_referral_attribution(text) from public, anon;
revoke all on function public.qualify_referrals() from public, anon;
revoke all on function public.redeem_referral_reward(uuid,uuid) from public, anon;
grant execute on function public.submit_seller_verification(text) to authenticated;
grant execute on function public.review_seller_verification(uuid,text,text,text) to authenticated;
grant execute on function public.allocate_founding_sellers() to authenticated;
grant execute on function public.activate_featured_listing(uuid,uuid) to authenticated;
grant execute on function public.ensure_referral_code() to authenticated;
grant execute on function public.claim_referral_attribution(text) to authenticated;
grant execute on function public.qualify_referrals() to authenticated;
grant execute on function public.redeem_referral_reward(uuid,uuid) to authenticated;

