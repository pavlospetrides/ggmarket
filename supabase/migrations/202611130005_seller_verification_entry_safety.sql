-- Seller verification follow-up safety correction. No new table, policy, or grant.
-- Existing application history and audit rows remain unchanged.

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
  if not public.seller_growth_feature_enabled('seller_verification') then
    raise exception 'seller growth feature is disabled' using errcode = '42501';
  end if;
  application_text := btrim(coalesce(application_text, ''));
  if char_length(application_text) not between 20 and 2000 then
    raise exception 'application must be between 20 and 2000 characters' using errcode = '22023';
  end if;
  select * into latest from public.seller_verifications
    where seller_id = actor order by created_at desc, id desc limit 1 for update;
  if latest.status = 'pending' then
    raise exception 'application already pending' using errcode = '23505';
  end if;
  if latest.status = 'verified' then
    raise exception 'application already approved' using errcode = '23505';
  end if;
  if latest.status = 'more_info' then
    update public.seller_verifications set
      status = 'pending', application_note = application_text,
      decision_reason = null, reviewer_note = null, reviewed_by = null, reviewed_at = null
    where id = latest.id returning * into result;
    insert into public.seller_verification_audit(application_id, seller_id, actor_id, action, previous_status, next_status)
    values (result.id, actor, actor, 'resubmitted', 'more_info', 'pending');
    return result;
  end if;
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

-- An administrator cannot approve, reject, or revoke their own application.
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
  if current_app.seller_id = actor then
    raise exception 'cannot review own application' using errcode = '42501';
  end if;
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
    case next_status when 'verified' then 'GGMarket completed its manual seller review. This is not a transaction guarantee.' else reason_text end,
    '/settings/seller-growth', result.id, 'seller-verification:' || result.id::text || ':' || next_status)
  on conflict (user_id, dedupe_key) do nothing;
  return result;
end;
$$;

-- Keep the seller-facing status read in the same deterministic order as the badge.
create or replace function public.get_my_seller_verification()
returns table (
  id uuid, seller_id uuid, status text, application_note text,
  decision_reason text, reviewed_at timestamptz,
  resubmission_eligible_at timestamptz, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select sv.id, sv.seller_id, sv.status, sv.application_note, sv.decision_reason,
    sv.reviewed_at, sv.resubmission_eligible_at, sv.created_at, sv.updated_at
  from public.seller_verifications sv
  where sv.seller_id = auth.uid()
  order by sv.created_at desc, sv.id desc
  limit 1;
$$;

-- One current decision per seller drives the public badge. An old approved row
-- cannot keep a badge visible after a later pending, rejected, or revoked row.
create or replace view public.seller_trust_signals
with (security_barrier = true) as
select signal.seller_id,
  bool_or(signal.kind = 'reviewed') as seller_reviewed,
  bool_or(signal.kind = 'founder') as founding_seller
from (
  select latest.seller_id, 'reviewed'::text as kind
  from (
    select distinct on (seller_id) seller_id, status
    from public.seller_verifications
    order by seller_id, created_at desc, id desc
  ) latest
  where latest.status = 'verified'
  union all
  select seller_id, 'founder'::text as kind
  from public.founding_sellers where badge_active and revoked_at is null
) signal
group by signal.seller_id;
