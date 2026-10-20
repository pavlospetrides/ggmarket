# GGMarket product design system

This document is the visual and interaction authority for GGMarket. Existing application behavior, authentication, data access, and security remain authoritative; this system governs how those capabilities are presented.

## Product direction: the midnight exchange

GGMarket is a focused player-to-player exchange, not a generic neon gaming landing page. The interface combines cinematic campaign moments with compact, factual marketplace surfaces. Purple identifies primary action, cyan supports discovery and information, and near-black graphite keeps inventory imagery and transaction state dominant.

The official visual balance is **70% premium minimal gaming** and **30% neo-brutalist**. Premium minimal is the operating system: precise type, restrained color, compact information, and calm task surfaces. Neo-brutalism is the signature layer: strong silhouettes, asymmetric editorial grids, heavier selected-state strokes, and decisive type contrast. It belongs in discovery, campaigns, navigation moments, and important actions—not on every field or transaction control.

The recurring visual idea is an **inventory routing board**: gaming categories and marketplace states occupy interlocking tonal slabs that make the exchange feel physical and directional. Shapes must correspond to real destinations or state. Avoid faux-terminal telemetry, arbitrary serial numbers, ornamental grid lines, generic neon bloom, and borders applied to every container.

The product should feel premium without becoming sparse, gaming-specific without relying on glowing decoration, compact without becoming cramped, and trustworthy through clear information rather than unsupported claims. Editorial artwork may introduce a category or campaign, but it must never resemble a real listing.

## Brand identity: Portal Pair

The GGMarket symbol is a pair of offset geometric G channels. Together they read as two players, two inventory sides, and a hand-off across a marketplace. The open counters keep the silhouette legible at favicon size; the diagonal relationship gives it forward motion without borrowing a controller, mascot, eye, or platform trademark.

- The primary horizontal lockup pairs the symbol with the `GGMarket` wordmark. Use it in navigation, authentication, marketing, and the footer.
- The compact symbol is reserved for favicons, app icons, constrained mobile placements, and large graphic brand moments.
- On dark surfaces, use white plus brand violet (`#8F7BFF`). On light surfaces, use graphite (`#0B0D12`) plus deep violet (`#5B3FDB`). Monochrome is permitted when reproduction or contrast requires it.
- Never rotate, stretch, outline, glow, place inside a new container, or recolor the two channels independently outside the approved variants.
- Keep clear space around the mark equal to at least one quarter of its height. Do not render the compact mark below 16 CSS pixels or the horizontal lockup below 96 CSS pixels wide.
- The wordmark remains typographically calm so the symbol carries recognition. Do not substitute a novelty gaming typeface.

## Foundations

### Typography

- Display headlines use fluid `clamp()` sizing, 0.88-1.0 line height, at most two primary lines, and balanced wrapping.
- Page titles start at 2.25rem on mobile; section titles start at 1.75rem. Body copy is at least 1rem with 1.5-1.7 line height.
- Essential metadata never drops below 0.75rem. Prices, totals, counts, and comparison dates use tabular numerals.
- User-generated names, identifiers, descriptions, and messages must wrap or truncate explicitly. Flex children containing them need `min-width: 0`.

### Spacing and layout

- Base spacing unit: 4px. Preferred steps: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Mobile page gutter: 16px; tablet: 24px; desktop: 32px within the shared container.
- Touch targets are at least 44x44 CSS pixels. Full-bleed and fixed elements respect `env(safe-area-inset-*)`.
- Bottom-navigation pages include explicit content clearance. Sticky actions stack above, never under, navigation.
- Identity, actions, forms, and metadata reflow through grid/flex rather than absolute positioning.

### Color and surfaces

- Canvas is deep graphite. Navigation and raised surfaces use restrained graphite/navy steps.
- Indigo/purple identifies primary action; cyan supports discovery. Semantic colors never carry status alone.
- Running text uses primary or secondary ink, not muted ink.
- Photography may use a neutral dark scrim for readable copy. Decorative gradients and glow fields are not substitutes for composition.
- Filled tonal separation is the default. Borders and shadows are reserved for fields, selected state, overlays, and sticky layers where separation is functional.

### Motion

- Motion clarifies entry, selection, or spatial transition and never delays marketplace controls.
- Animate opacity and transform where possible, list transition properties explicitly, and honor `prefers-reduced-motion`.
- Autoplay longer than five seconds requires a visible pause control. Prefer one strong frame over a carousel.

## Shared components

### Navigation

- Desktop keeps logo, Marketplace, Browse, global search, account utilities, and Sell in a predictable header.
- Mobile keeps the safe-area five-destination navigation. Search remains visible inside Browse and marketplace surfaces.
- A displayed keyboard-search hint must activate a real shortcut or be removed.

### Search and result toolbar

- Search is a labelled GET form with URL-backed `q` state.
- Browse and Marketplace expose search on mobile without opening navigation.
- Result count, Filters, and Sort form one coherent toolbar immediately before results.
- Active filters are visible and removable; reset is explicit; filter state survives sorting and search transitions.
- Price-range inputs have individual accessible names. Empty states explain the next useful action.
- Large result sets use truthful totals and pagination or load-more behavior; a capped fetch count is never presented as the total.

### Sheets and dialogs

- Use the selected accessible registry primitive instead of duplicating partial modal behavior.
- Opening moves focus inside; Tab remains contained; Escape and Close dismiss; focus returns to the trigger; background content is inert; body scroll is locked.
- Sheet content uses `overscroll-behavior: contain` and remains usable above the mobile safe area.

### Buttons, inputs, and forms

- One filled primary action per local decision area. Secondary and destructive actions remain distinct.
- Every field has a programmatic label, correct type/input mode, relevant autocomplete, and visible `:focus-visible` treatment.
- Validation connects errors through `aria-invalid`/`aria-describedby`, announces async errors, and focuses the first invalid control.
- Hidden file, radio, and checkbox controls expose visible focus on their label/container.
- Destructive actions require confirmation or undo. Multi-step forms warn before discarding meaningful unsaved work.

### Marketplace cards

- Scan order: image, listing intent/condition, title, price, location/delivery, seller/trust.
- Cards adapt to zero, one, few, and many results. One item never stretches into an oversized empty grid.
- Images preserve aspect ratio and do not crop essential product content unpredictably.

### Profile header

- Banner, avatar, identity, metadata, actions, and stats are separate responsive regions.
- Mobile places actions in a full-width row after identity. No action competes with the name for horizontal space.
- Display names and unbroken usernames wrap safely; missing images use a stable accessible fallback.
- Statistics form a 2x2 mobile grid and compact desktop row. Listings and empty states clear bottom navigation.

## Responsive product behavior

Supported review widths: 320, 360, 375, 390, 393, 430, 768, 1024, 1280, 1440, and 1920px.

### Mobile homepage

- Do not load or display the desktop campaign photograph on mobile. Use a dedicated interface-led composition built from Portal Pair geometry, tonal surfaces, and restrained ambient light.
- Compose two related zones: brand/value/actions first, then a functional category exchange console as the visual payoff. Do not place controls over decorative imagery.
- Keep the headline concise and search usable at 320px; actions may stack at narrow widths.
- Keep the above-the-fold desktop hero photograph isolated behind the desktop media query so mobile browsers do not fetch it. Lower editorial campaign sections may retain independently lazy-loaded imagery.

### Browse and marketplace

- Mobile Browse opens with visible search/control UI, not a campaign image alone.
- Categories may use a horizontally scrollable thumb rail. Filter and Sort remain adjacent to result context.
- Desktop may use a filter sidebar; mobile uses the accessible sheet with identical URL-backed fields.

### Task and account pages

- Use restrained application surfaces, shorter headings, and dense groupings from the same tokens.
- Messaging constrains its timeline to the viewport and keeps the composer reachable above safe areas and the mobile keyboard.
- Listing contact/purchase actions remain reachable without colliding with bottom navigation.

## Accessibility and quality gates

- One `<main>` per document, hierarchical headings, labelled navigation, and a working skip link.
- All functionality is keyboard-operable with visible focus. Icon controls have names; decorative icons are hidden.
- Async changes use live regions. Message timelines use log semantics where appropriate.
- Contrast includes text, focus, disabled, hover, and selected states.
- Test short, average, and adversarial long content, missing images, empty collections, loading, failure, and permission-denied states.
- Every major route receives screenshot review at phone, tablet, and desktop. Priority failures receive all eleven widths in Chromium and WebKit.
- Automated checks never replace visual inspection; release evidence identifies authenticated versus redirected coverage.

## Architecture constraints

- Preserve App Router server rendering, existing data/API contracts, authentication, authorization, Supabase RLS, and all migrations.
- Add client boundaries only for interaction; keep independent data fetching parallel.
- Reuse shared primitives and tokens. Do not introduce a second visual system or a large component family for one control.
- The selected shadcn sheet/dialog primitive may use its minimal audited dependencies because it replaces incomplete modal behavior across multiple surfaces.
- 21st.dev material is research input unless license, dependencies, accessibility, and architecture fit are verified. Never copy demo data or unrelated styling.
