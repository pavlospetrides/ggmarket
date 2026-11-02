-- Listing images are decoded and normalized by the trusted application upload
-- endpoint. Authenticated clients retain owner-scoped delete access, but cannot
-- insert or replace raw objects while spoofing Content-Type metadata.
drop policy if exists "listing images storage own insert" on storage.objects;
drop policy if exists "listing images storage own update" on storage.objects;
