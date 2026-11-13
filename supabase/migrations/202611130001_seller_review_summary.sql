-- The review list remains paginated. Aggregate all publicly readable reviews
-- in PostgreSQL so the displayed average and count cannot diverge at 1,000 rows.
create function public.seller_review_summary(target_seller uuid)
returns table(average double precision, review_count bigint)
language sql stable security invoker set search_path = '' as $$
  select coalesce(avg(r.rating), 0)::double precision, count(*)::bigint
  from public.reviews r
  where r.seller_id = target_seller;
$$;

revoke all on function public.seller_review_summary(uuid) from public;
grant execute on function public.seller_review_summary(uuid) to anon, authenticated;
