# Premium Animated Favorites Design

## Intent

Transform the authenticated Favorites route from a conventional listing grid into a premium, physical collection rail. The supplied `team-lanyard-rail.tsx` is the behavioral reference: metallic rail and attachments, hanging straps, spring momentum, drag and pull interactions, collision handling, card lift/pop, 3D flipping, keyboard control, reduced motion, and a touch carousel. GGMarket's Midnight Exchange design system is the visual reference.

The page continues to show only the current user's real, authorized, active favorite listings. This is a presentation change over the existing server-side Favorites query and `/api/favorites` mutation path, not a new data system.

## Experience

### Page framing

- Preserve the current Favorites route, authentication redirect, `BrowsingStateRestorer`, count, Browse action, mobile navigation clearance, and empty state behavior.
- Keep the masthead concise and task-oriented. The rail is the page's dominant object.
- The GGMarket-specific idea is literal saved inventory hanging from a purple equipment rail: the marketplace shortlist becomes a physical loadout rack.

### Product badges

- Each badge is keyed by listing ID and consumes the existing `Listing` type without repurposing employee fields.
- The front shows the signed primary image when present, title, formatted price, condition/category context, and restrained GGMarket identity.
- The back shows a concise listing summary and visually opens a connected detail panel. The panel is the allowed expanded back treatment from the brief and provides readable title, price, category, condition, seller, location, description, shipping/meetup, availability, View Listing, and Remove from Favorites controls.
- Interactive actions stay outside the draggable badge button to avoid nested controls and invisible focus targets.
- Missing images use a stable, labelled fallback; no sample or stock product imagery is introduced.

### Rail and collection behavior

- Adapt the supplied spring simulation rather than replacing it with basic CSS cards or a new animation dependency.
- Preserve swing, drag momentum, pull/stretch and reel response, neighboring-card collision avoidance, lift/pop, hover response, and 3D flip perspective.
- Simulate at most eight listings at once. Collections larger than eight use Previous/Next batch controls with an accessible range label; all listings remain reachable.
- Desktop uses the multi-card rail. Narrow viewports use the source carousel behavior, swipe gestures, position dots, and at least 44px controls.
- A click/tap selects a badge; a second activation flips it. Flipping never navigates.
- View Listing uses `ListingNavigationLink` with the existing `favorites` anchor context so browser history and scroll restoration continue to work.
- Removing the selected listing uses the existing `FavoriteButton` optimistic mutation/store behavior. On confirmed removal, the controller removes the listing by ID, clamps the batch/selection, and lets the remaining rail rebuild naturally. Failure rolls back through the existing store callback.

### Motion lifecycle

- The simulation writes transforms directly to refs and does not trigger React renders on animation frames.
- RAF only runs while springs are moving or interaction is active, then settles and stops.
- Page visibility and intersection state prevent RAF scheduling while hidden/offscreen; observers, listeners, timers, and RAF handles are cleaned up.
- `prefers-reduced-motion` snaps to stable targets and retains full keyboard/touch functionality without sway, autoplay, or momentum.
- The rail is dynamically imported from the existing client controller so its animation implementation is split from the first route bundle.

## Data and security

- `app/favorites/page.tsx` remains a Server Component and calls `requireUser` and `getFavoriteListings`.
- `getFavoriteListings` remains the authorization/visibility boundary: favorite IDs come from the authenticated server client; listing rows remain restricted to active public listings and existing signed-image enrichment.
- No user ID is accepted from the browser for reads or mutations. `/api/favorites` continues to resolve identity server-side and enforce ownership.
- No migration, RLS change, service-role bypass, new public endpoint, or production Supabase mutation is required.

## Accessibility

- The stage is a labelled collection control; badge controls expose listing title, price, position, selected state, and flipped state.
- Roving tab focus and Left/Right/Home/End keys move through the current batch; Enter/Space activate; Escape closes the back; Down gives the physical pull cue when motion is enabled.
- Focus remains on a valid badge or moves to the detail heading when the expanded panel opens. Removing the focused listing moves focus predictably to a remaining badge or the Browse action.
- The full detail panel uses normal document semantics and contains the only action controls for the flipped listing.
- Live regions announce selection, batch changes, flip state, and collection count changes.

## Responsive direction

- Review widths: 320, 360, 375, 390, 414, 430, 768, 1024, 1280, and 1440px.
- On phones, one centered badge is legible, adjacent badges suggest swiping, the expanded detail panel follows below, and page vertical scrolling remains available because the stage uses `touch-action: pan-y` until a horizontal swipe or downward pull is recognized.
- Content includes bottom padding above the fixed mobile navigation. The detail panel never becomes a fixed layer over navigation.
- Desktop cards remain compact enough for the physical rail; the connected panel, not an oversized swinging body, carries dense controls and copy.

## Visual direction

- Reuse GGMarket surface, ink, border, radius, focus, and primary-purple tokens.
- Use a graphite field, violet woven straps, muted metal, square product imagery, and one purple action emphasis. Avoid decorative gradients beyond material rendering, neon glow, generic team colors, faux QR/barcodes, and unrelated ornament.
- The rail and real listing imagery provide the visual substance; resting panels use tonal separation rather than decorative shadows.

## Verification and deliverables

- Unit/contract tests cover batching, keyed removal/clamping, reduced-motion and lifecycle scheduling decisions, and the listing adapter/price semantics.
- Playwright harness coverage verifies front data, flip/detail behavior, navigation metadata, removal/rollback, keyboard use, carousel swiping, mobile overflow, and empty state.
- Run TypeScript, ESLint, Vitest, relevant Playwright Chromium and WebKit specs, production build, production `next start` smoke checks, and `git diff --check`.
- Capture desktop and mobile screenshots from the synthetic Favorites harness without production data.
- Supabase/RLS tests run only if a disposable local test environment is available; otherwise report that gate as not executed rather than touching shared data.

## Non-goals

- No Favorites sorting/filtering is invented where the existing page has none.
- No database or API redesign.
- No fake listings, images, metadata, QR codes, or barcodes.
- No autoplay showcase; Favorites is a task page and motion begins only as an entrance/interaction response.
- No merge or deployment to production.
