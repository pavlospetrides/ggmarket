-- Optional per-user card colors. Nullable columns preserve theme-derived
-- presentation for rows created before this application version is deployed.
alter table public.gg_cards
  add column text_color text,
  add column front_pattern_color text,
  add constraint gg_cards_text_color_hex
    check (text_color is null or text_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint gg_cards_front_pattern_color_hex
    check (front_pattern_color is null or front_pattern_color ~ '^#[0-9A-Fa-f]{6}$');

grant select (text_color, front_pattern_color) on public.gg_cards to anon, authenticated;
grant insert (text_color, front_pattern_color), update (text_color, front_pattern_color) on public.gg_cards to authenticated;
