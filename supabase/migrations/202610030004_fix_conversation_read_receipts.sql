-- Phase 2 revoked table mutation privileges and then restored only the
-- column-level notification grant. Read receipts use an RLS-protected direct
-- update, so authenticated members also need the matching column grant.
grant update (last_read_at) on public.conversation_members to authenticated;
