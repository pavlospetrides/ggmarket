insert into public.categories (name, slug, icon, sort_order, attribute_schema) values
('Consoles','consoles','Gamepad2',10,'{"model":{"type":"string"},"storage":{"type":"string"},"edition":{"type":"string"},"controllers":{"type":"number"},"original_box":{"type":"boolean"}}'),
('Gaming PCs','gaming-pcs','PcCase',20,'{"cpu":{"type":"string"},"gpu":{"type":"string"},"ram":{"type":"string"},"storage":{"type":"string"}}'),
('PC Components','pc-components','Cpu',30,'{"brand":{"type":"string"},"chipset":{"type":"string"},"vram":{"type":"number"},"warranty":{"type":"boolean"},"used_for_mining":{"type":"boolean"}}'),
('Games','games','Disc3',40,'{}'),('Peripherals','peripherals','Mouse',50,'{}'),('Controllers','controllers','Joystick',60,'{}'),
('Monitors','monitors','Monitor',70,'{"size":{"type":"number"},"resolution":{"type":"string"},"refresh_rate":{"type":"number"},"panel_type":{"type":"string"}}'),
('Retro','retro','Ghost',80,'{}'),('VR','vr','Glasses',90,'{}'),('Gaming Setup','gaming-setup','Armchair',100,'{}'),
('Collectibles','collectibles','Trophy',110,'{}'),('Broken / For Parts','for-parts','Wrench',120,'{}') on conflict (slug) do nothing;

insert into public.brands (name, slug) values ('Sony','sony'),('Microsoft','microsoft'),('Nintendo','nintendo'),('NVIDIA','nvidia'),('AMD','amd'),('MSI','msi'),('ASUS','asus'),('Valve','valve'),('LG','lg') on conflict (slug) do nothing;

insert into public.product_catalog (category_id, brand_id, name, slug, attributes)
select c.id, b.id, p.name, p.slug, p.attributes from (values
('consoles','sony','Sony PlayStation 5 Slim Disc','playstation-5-slim-disc','{"storage":"1TB","edition":"Disc"}'::jsonb),
('consoles','nintendo','Nintendo Switch OLED','nintendo-switch-oled','{"storage":"64GB","display":"OLED"}'::jsonb),
('consoles','valve','Steam Deck OLED 1TB','steam-deck-oled-1tb','{"storage":"1TB","display":"OLED"}'::jsonb),
('pc-components','nvidia','NVIDIA GeForce RTX 4070 SUPER','rtx-4070-super','{"vram":12}'::jsonb),
('monitors','lg','LG UltraGear 27 OLED 240Hz','lg-ultragear-27-oled-240hz','{"size":27,"resolution":"2560x1440","refresh_rate":240}'::jsonb)
) p(category_slug, brand_slug, name, slug, attributes) join public.categories c on c.slug=p.category_slug join public.brands b on b.slug=p.brand_slug on conflict (slug) do nothing;
