-- Forward correction to the two-group Collectibles & Cards taxonomy.
-- Existing category slug, listing IDs, and older attribute values remain unchanged.
insert into public.categories(name, slug, icon, sort_order, attribute_schema, active)
values (
  'Collectibles & Cards', 'collectibles', 'Trophy', 110,
  '{"family":{"type":"string"},"item_type":{"type":"string"},"subcategory":{"type":"string"},"manufacturer":{"type":"string"},"character":{"type":"string"},"original_box":{"type":"boolean"},"limited_edition":{"type":"boolean"},"card_game":{"type":"string"},"card_name":{"type":"string"},"set_name":{"type":"string"},"card_number":{"type":"string"},"grading_status":{"type":"string"},"grading_company":{"type":"string"},"grading_score":{"type":"string"},"product_type":{"type":"string"},"card_game_other":{"type":"string"},"language":{"type":"string"},"language_other":{"type":"string"},"edition":{"type":"string"},"rarity":{"type":"string"},"figure_series":{"type":"string"},"packaging_condition":{"type":"string"},"sealed_condition":{"type":"string"},"grading_certification_number":{"type":"string"},"grading_company_other":{"type":"string"},"product_type_other":{"type":"string"}}'::jsonb,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  attribute_schema = excluded.attribute_schema,
  active = true;

-- Add buyer-filter keys while preserving all seller-provided values.
with classified as (
  select l.id,
    case
      when l.attributes->>'family' in ('collectibles', 'cards') then l.attributes->>'family'
      when l.attributes->>'subcategory' in ('pokemon-tcg', 'yugioh-tcg', 'magic-the-gathering', 'one-piece-card-game', 'other-trading-card-games', 'pokemon-cards', 'yugioh-cards', 'sports-cards', 'graded-cards', 'other-trading-cards') then 'cards'
      when l.attributes->>'product_type' in ('single-card', 'graded-card', 'booster-pack', 'booster-box', 'sealed-product', 'deck') then 'cards'
      else 'collectibles'
    end as group_id,
    case
      when l.attributes->>'item_type' is not null then l.attributes->>'item_type'
      when l.attributes->>'product_type' = 'graded-card' then 'graded-cards'
      when l.attributes->>'subcategory' in ('pokemon-tcg', 'pokemon-cards') then 'pokemon-cards'
      when l.attributes->>'subcategory' in ('yugioh-tcg', 'yugioh-cards') then 'yugioh-cards'
      when l.attributes->>'subcategory' = 'magic-the-gathering' then 'magic-the-gathering'
      when l.attributes->>'subcategory' = 'sports-cards' then 'sports-cards'
      when l.attributes->>'subcategory' in ('one-piece-card-game', 'other-trading-card-games', 'other-trading-cards') then 'other-trading-cards'
      when l.attributes->>'subcategory' in ('gaming-anime-figures', 'anime-collectibles') then 'anime-collectibles'
      when l.attributes->>'subcategory' in ('funko-collectible-figures', 'funko-pop') then 'funko-pop'
      when l.attributes->>'subcategory' in ('collectors-editions-merchandise', 'limited-editions') then 'limited-editions'
      when l.attributes->>'subcategory' in ('action-figures-statues', 'gaming-memorabilia') then l.attributes->>'subcategory'
      when l.attributes->>'product_type' in ('single-card', 'booster-pack', 'booster-box', 'sealed-product', 'deck') then 'other-trading-cards'
      when l.attributes->>'family' = 'cards' then 'other-trading-cards'
      else 'other-collectibles'
    end as type_id
  from public.listings l
  join public.categories c on c.id = l.category_id
  where c.slug = 'collectibles'
    and (not l.attributes ? 'family' or not l.attributes ? 'item_type')
)
update public.listings l
set attributes = l.attributes || jsonb_build_object(
  'family', coalesce(l.attributes->>'family', classified.group_id),
  'item_type', coalesce(l.attributes->>'item_type', classified.type_id)
)
from classified
where l.id = classified.id;
