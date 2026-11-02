-- User-owned GGMarket identity cards. Presentation is allowlisted; cards are
-- private unless an active profile owner explicitly opts into public display.
create table public.gg_cards (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slogan text not null default 'Play. Trade. Belong.' check (char_length(slogan) between 1 and 80 and slogan !~ '[[:cntrl:]]'),
  theme_id text not null default 'gg-purple' check (theme_id in ('gg-purple', 'midnight-black', 'arctic-white', 'crimson')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gg_cards enable row level security;

create policy "gg cards public read" on public.gg_cards
  for select to anon, authenticated
  using (
    is_public = true and exists (
      select 1 from public.profiles
      where profiles.id = gg_cards.user_id
    )
  );

create policy "gg cards owner read" on public.gg_cards
  for select to authenticated using (auth.uid() = user_id);

create policy "gg cards owner insert" on public.gg_cards
  for insert to authenticated
  with check (auth.uid() = user_id and public.is_active_user());

create policy "gg cards owner update" on public.gg_cards
  for update to authenticated
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

create trigger touch_gg_cards_updated_at before update on public.gg_cards
  for each row execute function public.touch_updated_at();

create or replace function public.protect_gg_card_owner()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'GG Card owner cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_gg_card_owner() from public, anon, authenticated;
create trigger protect_gg_card_owner before update on public.gg_cards
  for each row execute function public.protect_gg_card_owner();
create trigger reject_suspended_actor before insert or update or delete on public.gg_cards
  for each row execute function public.reject_suspended_actor();

revoke all on public.gg_cards from public, anon, authenticated;
grant select (user_id, slogan, theme_id, is_public) on public.gg_cards to anon, authenticated;
grant insert (user_id, slogan, theme_id, is_public), update (user_id, slogan, theme_id, is_public) on public.gg_cards to authenticated;
