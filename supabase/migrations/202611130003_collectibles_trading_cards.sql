-- Expand the existing stable collectibles category without rewriting listings.
insert into public.categories(name, slug, icon, sort_order, attribute_schema, active)
values (
  'Collectibles & Trading Cards',
  'collectibles',
  'Trophy',
  110,
  '{"subcategory":{"type":"string"},"product_type":{"type":"string"},"card_game":{"type":"string"},"card_game_other":{"type":"string"},"card_name":{"type":"string"},"set_name":{"type":"string"},"card_number":{"type":"string"},"rarity":{"type":"string"},"language":{"type":"string"},"language_other":{"type":"string"},"edition":{"type":"string"},"grading_status":{"type":"string"},"grading_company":{"type":"string"},"grading_company_other":{"type":"string"},"grading_score":{"type":"string"},"grading_certification_number":{"type":"string"},"sealed_condition":{"type":"string"},"manufacturer":{"type":"string"},"figure_series":{"type":"string"},"character":{"type":"string"},"packaging_condition":{"type":"string"},"original_box":{"type":"boolean"},"product_type_other":{"type":"string"}}'::jsonb,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  attribute_schema = excluded.attribute_schema,
  active = true;
