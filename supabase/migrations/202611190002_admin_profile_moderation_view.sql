-- Forward-only repair for installations of 202611190001 that predate the
-- administrator profile view. This does not alter moderation RPCs or grants
-- on the underlying profiles table.
-- Prerequisite: 202611190001 has added the restriction columns and is_admin().

create or replace view public.admin_profile_moderation
  with (security_barrier = true)
as select p.* from public.profiles p where public.is_admin();

revoke all on public.admin_profile_moderation from public, anon, authenticated;
grant select on public.admin_profile_moderation to authenticated;
