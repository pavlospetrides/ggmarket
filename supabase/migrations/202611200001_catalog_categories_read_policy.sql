-- The original catalog policy calls is_admin() for anonymous reads, while
-- 202611190001 intentionally grants that function only to authenticated users.
-- Keep anonymous access to active categories without exposing admin status or
-- inactive taxonomy rows. Administrator access remains separately guarded.

drop policy if exists "catalog categories read" on public.categories;

create policy "catalog categories public read" on public.categories
  for select to anon, authenticated using (active);

create policy "catalog categories admin read" on public.categories
  for select to authenticated using (public.is_admin());
