-- Add participant-only voice attachments without changing existing text messages.
alter table public.messages
  add column message_type text not null default 'text',
  add column attachment_path text,
  add column attachment_mime text,
  add column attachment_duration_ms integer;

alter table public.messages
  add constraint messages_type_allowed check (message_type in ('text', 'voice')),
  add constraint messages_attachment_shape check (
    (message_type = 'text' and attachment_path is null and attachment_mime is null and attachment_duration_ms is null)
    or
    (message_type = 'voice'
      and attachment_path is not null
      and attachment_mime in ('audio/webm', 'audio/ogg', 'audio/mp4')
      and attachment_duration_ms between 250 and 300000)
  );

grant insert (
  conversation_id, sender_id, body, client_id,
  message_type, attachment_path, attachment_mime, attachment_duration_ms
) on public.messages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-audio', 'message-audio', false, 15728640, array['audio/webm', 'audio/ogg', 'audio/mp4'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "message audio participant read" on storage.objects
  for select to authenticated using (
    bucket_id = 'message-audio'
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id::text = (storage.foldername(name))[1]
        and cm.user_id = auth.uid()
    )
  );

create policy "message audio member insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'message-audio'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id::text = (storage.foldername(name))[1]
        and cm.user_id = auth.uid()
    )
  );

create policy "message audio owner delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'message-audio'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );
