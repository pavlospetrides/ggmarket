# GGMarket Gaming Taxonomy & Smart Filters Design

**Date:** 2026-10-15  
**Status:** Approved for implementation by the user’s explicit “research, audit, implement, and verify” directive  
**Scope:** Category architecture, seller categorization, buyer discovery, structured search, compatibility, and safe regression coverage

## Intent

GGMarket needs one comprehensible gaming taxonomy that helps a seller place an item accurately and helps a buyer find the corresponding inventory without relying on title keywords alone. The system must remain a peer-to-peer marketplace: it should describe transferable physical products and hardware, not mimic retailer merchandising or introduce account/digital-license trading.

The implementation must preserve the current redesign, existing category rows, listing URLs, Supabase authorization, and legacy listing visibility. It must not require changes to the seven existing migrations or writes to the configured protected Supabase project.

## Research findings

Chrome DevTools successfully inspected Public.gr on 2026-10-15. The initial MCP session was stale and was restarted using only its dedicated automation profile; the reference pages then loaded successfully.

Pages inspected:

- `https://www.public.gr/`
- `https://www.public.gr/root/gaming/video-game`
- `https://www.public.gr/cat/gaming/playstation/games`
- `https://www.public.gr/cat/gaming/playstation/games/ps5`
- `https://www.public.gr/cat/gaming/xbox/games`
- `https://www.public.gr/cat/gaming/xbox/games/xbox-one`
- `https://www.public.gr/cat/gaming/nintendo/games`
- `https://www.public.gr/root/gaming/gaming-controllers`
- `https://www.public.gr/cat/gaming/gaming-controllers/gamepads`

Observed organization:

- The site separates landing pages from product-list pages. Landing pages expose a small, useful subcategory index; product lists add breadcrumbs, result totals, sorting, filters, and related categories.
- Video games branch first by platform family and then by generation. PlayStation exposes PS5/PS4/PS3/Vita, Xbox exposes Series/One, and Nintendo exposes Switch 2/Switch/3DS in the current catalog.
- Game facets are product-specific: genre, series, release year, multiplayer, PEGI, game features, publisher, edition, packaging, manuals, and region. Physical format is intentionally not collected, displayed, or filtered.
- Controllers use compatibility as a first-class, multi-valued facet, separate from manufacturer. The current page exposes PS5, PS4, Xbox Series, Nintendo Switch, PC, Android, and iOS compatibility and related compatibility landing links.
- Accessories are organized by product type: headsets, controllers, mice, keyboards, mousepads, streaming accessories, racing seats, wheels, joysticks, VR, charging stations, controller accessories, cases, cables, and batteries.
- Breadcrumbs are persistent and URLs encode filters. Desktop uses a facet sidebar; the mobile layout hides that sidebar and surfaces compact inline discovery controls.
- Counts are shown at the category and result level, and the list discloses how many items are visible out of the total.

What GGMarket adopts:

- Stable parent → family → product type/platform → leaf hierarchy.
- Product-type-specific facets instead of one universal attribute form.
- Compatibility independent from manufacturer and represented as multiple values.
- URL-backed filters, clear selected state, truthful totals, breadcrumbs, and useful empty states.

What GGMarket does not adopt:

- Promotional ribbons, retailer stock/fulfilment facets, proprietary copy/assets, brand styling, or retailer-only merchandising.
- A category row for every platform generation. That would require a database migration and would make legacy compatibility harder without adding value to the current schema.

## Current architecture audit

The existing schema already provides the required storage primitives:

- `categories` has stable UUID rows, unique slugs, optional `parent_id`, JSONB `attribute_schema`, ordering, and RLS-protected public reads.
- `listings` references a category, stores indexed JSONB `attributes`, and includes attributes in its generated search vector.
- The current seed defines stable top-level slugs: `consoles`, `gaming-pcs`, `pc-components`, `games`, `peripherals`, `controllers`, `monitors`, `retro`, `vr`, `gaming-setup`, `collectibles`, and `for-parts`.
- `product_catalog` can link exact known models without making that link mandatory.
- `getPaginatedListings` already owns URL-backed category, price, condition, location, seller, intent, sorting, exact totals, and pagination.

Current gaps:

- Category knowledge is flat and repeated across page copy, form conditions, and links.
- Listing attributes are typed and validated as primitives only, so multi-value compatibility is not representable in application types even though JSONB supports it.
- The create flow chooses only a top-level category; its two booleans are shown for every item.
- Editing cannot update category-specific attributes.
- Buyer filters know only global listing fields.
- Search does not infer structured platform/category intent.
- Listing details print raw attribute keys and values.

## Architecture

### One central taxonomy

Create a single server/client-safe TypeScript module containing immutable data and pure helpers. It is the authority for:

- stable IDs and labels;
- top-level database category slug;
- parent family, product type, platform/generation, exact console-model options, and compatibility options;
- category-specific field definitions and buyer-filter definitions;
- breadcrumbs, URL parameters, labels, display formatting, search inference, and legacy aliases.

No React, Supabase client, mutable state, or browser API belongs in this module.

### Storage contract

The existing database category remains the coarse product class. Deeper choices are stored in `listings.attributes`:

- `taxonomy_version: "1"`
- `subcategory`: stable product-type ID such as `game`, `console`, `gamepad`, or `gpu`
- `family`: stable family ID such as `playstation`, `xbox`, `nintendo`, or `sega`
- `platform`: one specific platform/generation such as `ps5`, `psp`, `xbox-one`, or `switch-2`
- `model`: an exact hardware model when applicable
- `compatibility`: an array of verified platform IDs where multi-select is meaningful
- product-specific keys such as `genre`, `edition`, `region`, `pegi`, `storage`, `manufacturer`, `vram_gb`, `socket`, `ram_type`, or `connection`

Arrays are allowed only for controlled multi-value fields. Values remain strings, finite numbers, booleans, or arrays of controlled strings. Unknown legacy keys are preserved during edit.

### Hierarchy semantics

- **Database category:** coarse stable inventory class used by current foreign keys and saved searches.
- **Subcategory:** product type within that category, e.g. game, console, GPU, headset, steering wheel.
- **Family:** manufacturer ecosystem where applicable, e.g. PlayStation, Xbox, Nintendo, Sega.
- **Platform:** generation/software target, e.g. PS5, PSP, Xbox One, Nintendo Switch.
- **Model:** exact hardware variant, e.g. PS5 Slim Disc, Switch OLED, Steam Deck OLED.
- **Compatibility:** independently verified platforms supported by an accessory; never inferred from brand.
- **Product-specific attribute:** a field meaningful only for its selected product type.

### No-migration compatibility strategy

No schema migration is required for the initial implementation. Current JSONB and its GIN index support the planned values and containment filters.

- Existing category UUIDs and slugs remain unchanged.
- Existing listing detail URLs remain unchanged.
- Listings without `taxonomy_version` remain visible through their top-level category and text search.
- Known legacy string values are normalized only when read for labels/filter matching; records are never silently rewritten.
- Edit forms prefill recognized values and preserve unrecognized attributes in the update payload.
- Structured filters target new stable keys and may not match unclassified legacy records. Search and top-level category browsing continue to expose those records; the UI explains when a narrow structured filter excludes unclassified listings.
- Sellers can classify a legacy listing explicitly while editing it. No background recategorization occurs.

## Taxonomy

### Video games (`games`)

Families and platforms:

- PlayStation: PS5, PS4, PS3, PS2, PS1, PSP, PS Vita.
- Xbox: Xbox Series X, Xbox Series X|S, Xbox One, Xbox 360, and Original Xbox.
- Nintendo: Switch 2, Switch, Wii U, Wii, 3DS, DS, GameCube, Nintendo 64, SNES, NES, Game Boy, Game Boy Color, Game Boy Advance.
- PC: Windows PC, macOS, and Linux where a transferable product is valid.
- Sega: Mega Drive / Genesis, Master System, Dreamcast, Saturn, Game Gear.
- Atari and Other / Legacy: controlled fallback options that do not claim exhaustive historical coverage.

Game fields: exact title/product name, platform, genre, existing listing condition, edition, original packaging, manuals/inserts, region, PEGI where applicable, price, description, and images. Physical format is not a seller field or buyer facet. Historical metadata may remain stored but stays hidden and cannot be replaced by create/edit payloads. Digital account/license resale is not an option.

### Gaming consoles (`consoles`)

- PlayStation: PS5, PS5 Slim, PS5 Pro, PS5 Digital Edition, PS4, PS4 Pro, PS4 Slim, PS3, PS2, PS1, PSP, PS Vita.
- Xbox: Xbox Series X, Xbox Series S, Xbox One, Xbox One S, Xbox One X, Xbox 360, Original Xbox.
- Nintendo: Switch 2, Switch OLED, Switch, Switch Lite, Wii U, Wii, 3DS, DS, GameCube, older Nintendo.
- Handheld PCs: Steam Deck, Steam Deck OLED, ASUS ROG Ally, ROG Ally X, Lenovo Legion Go, other handheld PC.
- Sega / Retro and Other established manufacturers use controlled family/model fallbacks.

Console fields: exact model, storage, existing condition, included accessories, controller count, original box, working condition, modifications, price, description, and images.

### Controllers (`controllers`)

Subcategories: gamepads, PlayStation controllers, Xbox controllers, Nintendo controllers, PC controllers, retro controllers, arcade sticks, fighting controllers, specialty controllers, and controller accessories.

Controller fields: manufacturer/brand, model, connection, condition, compatibility multi-select, included receiver/cable, original box, and modifications. Compatibility is explicit and is never derived from manufacturer.

### Peripherals & accessories (`peripherals`, plus existing `monitors`, `vr`, and `gaming-setup` categories)

Product types include headsets, keyboards, mice, mousepads, microphones, webcams, capture cards, monitors, steering wheels, racing pedals, flight sticks, arcade controllers, VR headsets, VR accessories, controller/console charging stations, stands, cases, cables/adapters, chairs, desks, and other useful gaming accessories.

Fields are conditional:

- Keyboard: manufacturer, mechanical/membrane, layout, switch type, connection.
- Mouse: manufacturer, connection, DPI.
- Headset: manufacturer, connection, microphone, compatibility.
- Wheel: manufacturer, compatibility, pedals included, force feedback.
- Monitor: manufacturer, size, resolution, refresh rate, panel type.
- VR/accessory: model and compatibility where applicable.

### PC hardware (`pc-components`, `gaming-pcs`)

Subcategories: GPU, CPU, motherboard, RAM, storage, PSU, case, cooling, complete gaming PC, gaming laptop, and other PC component.

- GPU: manufacturer, series, exact model, VRAM, condition, mining-use disclosure.
- CPU: manufacturer, model, socket.
- Motherboard: manufacturer, model, socket, form factor.
- RAM: manufacturer, capacity, type, speed.
- Storage: type, capacity, interface.
- PSU: wattage, efficiency rating, modularity.
- Complete PC/laptop: CPU, GPU, RAM, storage; laptop screen size where useful.

## Seller experience

The first listing step keeps the existing intent choice, then guides the seller through:

1. Product category.
2. Product type or ecosystem family when applicable.
3. Platform/generation or exact model when required.
4. A visible “You’re listing in…” path.

The next step keeps the exact product/model input and renders only fields defined for the selected taxonomy path. Required taxonomy selections are validated before advancing. Multi-select compatibility uses native labelled checkboxes with 44px targets, not an inaccessible custom combobox. Form values survive moving between wizard steps. Switching the top-level category intentionally removes incompatible taxonomy attributes but leaves title, photos, delivery, and description untouched.

The edit form displays the existing category path, allows classification/refinement with the same definitions, and sends a merged attribute object so unknown legacy fields are not lost.

## Buyer discovery

The existing `MarketplaceBrowser` remains the single filtering system.

- Top-level category selection reveals a compact hierarchy navigator and contextual breadcrumb.
- Family/platform/product-type selections are links with URL parameters, so open-in-new-tab and back/forward work.
- The shared filter form adds only fields relevant to the active category/subcategory.
- Compatibility is a separate filter and uses JSONB array containment.
- Active filter chips use taxonomy labels, and clearing a filter preserves `q` and unrelated filters.
- The result title and empty state reflect the selected taxonomy path.
- Browse adds a structured gaming-category directory that links to real marketplace URLs; no decorative dead controls are added.
- Result counts remain the exact count returned by the existing query.

Supported structured URL keys include `category`, `subcategory`, `family`, `platform`, `model`, `compatibility`, plus a bounded allowlist of product-specific attribute keys. Unknown keys are ignored by query construction and preserved only where existing generic URL behavior already does so.

## Search behavior

A pure search-intent helper recognizes unambiguous aliases such as `PS5 games`, `PSP games`, `Xbox One controller`, `Nintendo Switch accessories`, and GPU model patterns. Explicit URL filters always win over inferred values.

When a query consists entirely of recognized structural terms, the residual text query is empty and the request uses structured filters. When meaningful text remains, it continues through the existing search RPC while inferred category/attributes narrow the eligible IDs. Search security and ranking stay server-side; no broad client fetch is introduced.

Ambiguous terms such as `switch`, `one`, or `series` do not infer a platform without gaming context.

## Validation and safety

- Server validation accepts only scalar values and bounded arrays of strings.
- Taxonomy validation rejects values not allowed for the selected top-level category/path.
- API handlers continue to authenticate and scope updates by `seller_id`.
- The existing category `attribute_schema` check remains, extended to understand arrays and to validate known taxonomy fields centrally.
- No Supabase migration, seed execution, service-role access, RLS change, or production write is part of this work.
- Tests use pure fixtures, source-independent unit behavior, and safe public read-only browser flows.

## Responsive and accessibility behavior

- Search remains visible.
- Category paths wrap or horizontally scroll without page overflow.
- Desktop keeps a contextual sticky sidebar; mobile uses the existing accessible Sheet.
- Hierarchy links and checkbox rows meet 44px touch targets.
- Every field has a programmatic label, errors are connected, and decorative icons are hidden.
- Native form controls receive explicit dark colors and visible focus.
- No nested scroll container is added inside the filter sheet beyond its existing single scrolling content region.
- Test widths: 320, 375, 390, 393, 430, 768, 1024, 1440, and 1920 CSS pixels in Chromium and WebKit.

## Design direction

The category system extends the existing “midnight exchange” rather than inventing a new visual language. Its identifying device is the **loadout tree**: each selected tier forms a compact, readable path and the next tier presents dense tonal choices. Filled graphite surfaces carry hierarchy; violet marks the active path; cyan is reserved for discovery cues. It prioritizes scan speed and truthful inventory over decorative category art.

21st.dev research found a cascader, responsive breadcrumbs, and an ecommerce category page with filter chips/sheet. Shadcn provides breadcrumb, command, and collapsible primitives. These are research inputs only. The implementation uses semantic links, native controls, and the existing Sheet to avoid new dependencies and preserve accessibility/performance.

## Non-goals and anti-goals

- No whole-site visual redesign.
- No claim to cover every historical console ever made.
- No fake listings, counts, brands, compatibility, or marketplace proof.
- No digital account, activation key, or non-transferable license resale.
- No automatic recategorization or data backfill.
- No second marketplace filter implementation.
- No huge client-side catalog dependency, nested dropdown maze, or mobile functionality removal.
- No commit, push, deploy, migration application, or production data mutation.

## Acceptance evidence

- Unit tests prove taxonomy paths, aliases, allowed fields, attribute normalization, search inference, URL/filter behavior, and server validation.
- Component/browser tests prove seller hierarchy, dynamic fields, state preservation, multi-value compatibility, active filter clearing, breadcrumbs, back/forward navigation, and empty states.
- Safe Playwright exercises public pages only; seller submission uses isolated/mocked persistence and never writes to Supabase.
- TypeScript, ESLint, Vitest, production build, Chromium, WebKit, responsive screenshots, accessibility review, and changed-file review run after implementation.

## Builder calls

- Keep the database taxonomy coarse and the UI taxonomy deep. This is the smallest architecture that meets the requirement without a migration.
- Prefer stable kebab-case IDs and English UI labels consistent with the existing application.
- Treat compatibility as a controlled string array and use JSONB containment for one selected compatibility value.
- Preserve unknown legacy attributes during edit and display them with humanized fallback labels.
- Implement the complete requested initial platform list, but keep the data model open for later additions.
