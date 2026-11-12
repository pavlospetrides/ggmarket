# Lootriva Card Color Personalization Design

## Intent

Give authenticated Lootriva members independent control over the personal typography and front ornament colors on the existing interactive lanyard card. Preserve the card dimensions, HTML/CSS 3D flip, canvas lanyard, Verlet physics, dragging, swinging, lazy loading, and reduced-motion lifecycle.

## Current-state findings

- `inkColor` currently controls four unrelated concerns: lanyard print, card typography, front ornaments, and back ornaments.
- The back identity block uses `strapColor` for the display name and username. On the Arctic White theme this places near-white identity text on a near-white card.
- The viewer dialog Close button and the lanyard flip control both occupy the top-right corner. The flip control has a local `z-10`; the Close button has no local z-index, so the flip control can paint over and intercept it.
- The card already persists a user-owned row in `public.gg_cards`, validates writes in the API, derives ownership from the authenticated session, and enforces owner-only writes with RLS. Extending that row is safer and smaller than adding another customization table.

## Product behavior

The existing Customize dialog becomes a responsive two-region workspace: a live, full 3D lanyard preview and compact controls matching Lootriva's graphite/purple application surfaces. Desktop places the preview and controls side by side; mobile stacks them without changing the 220 by 330 card dimensions.

Each color control contains a labelled native color well, an editable `#RRGGBB` field, and a short shared preset row. Text Color and Front Pattern Color update only their own value. Theme selection continues to control card stock and strap colors and does not rewrite either custom color.

Valid colors are canonicalized to uppercase six-digit HEX. Invalid text remains editable, receives inline error semantics, and cannot be saved. A valid low-contrast color remains saveable but produces a live warning. Text contrast is measured against the selected theme's card stock at 4.5:1; the decorative pattern uses a 3:1 visibility warning.

Reset to Defaults restores the existing GG Purple theme, default slogan and privacy behavior, plus theme-safe text and pattern colors. Existing rows whose new columns are `NULL` resolve through their current theme's established ink color, which preserves existing personalized themes. This also gives light card themes the required dark readable fallback while avoiding a new dark-on-dark regression for existing dark themes.

## Rendering architecture

`LanyardBadge` gains separate `textColor` and `frontPatternColor` presentation props while retaining `inkColor` for strap print and unchanged callers. The built-in front applies `textColor` only to typography and applies `frontPatternColor` directly to the existing ornament and arrow SVG layers. The built-in back applies `textColor` to display name and username; unrelated back geometry retains its existing theme treatment.

Neither new prop enters the physics/canvas effect dependency list. Typing a color therefore updates React-rendered HTML/SVG styles without rebuilding the canvas textures, observers, event listeners, physics points, or animation loop. Theme/strap changes may continue to rebuild the strap texture as they do today. Closing the Radix dialog still unmounts the experience, which cancels animation frames and disconnects observers through the existing effect cleanup.

## Persistence and security

Add nullable `text_color` and `front_pattern_color` columns to `public.gg_cards` in a forward-only migration. Both columns have database checks allowing only exact six-digit HEX strings. Nullable columns let deployed application code remain compatible during a staged rollout and preserve theme-aware fallback for old rows.

The API schema requires both values for new writes, remains strict, and keeps the existing 64 KiB JSON body cap. The server writes `user_id` only from the authenticated session. Existing RLS policies remain unchanged; column grants are extended narrowly to the new fields. Public card reads expose only the same presentation data plus these safe colors.

No color is interpolated into HTML or a style string containing declarations. Validated values are passed only as React CSS color property values. React continues to escape all user-provided identity and slogan text.

## Modal and accessibility behavior

The reusable dialog Close control receives a local stacking level above dialog children, explicit 44 by 44 sizing, and safe-area-aware top/right insets. The Lootriva card viewer places its flip control at top-left, leaving the top-right exclusively for Close. Both controls remain keyboard accessible and visually focused.

Radix Dialog continues to provide focus trapping, Escape dismissal, scroll lock, and trigger focus restoration. The canvas remains `pointer-events: none`; the draggable card keeps its existing pointer handling. Browser tests verify non-overlap and clickability on 390 px, 768 px, and desktop widths on both faces.

## Deployment and non-goals

- Do not run the migration against production in this work.
- Deploy the additive migration first, then deploy the application, then run authenticated smoke checks. The nullable columns keep the old application compatible if rollback is necessary.
- Do not replace the lanyard implementation, physics model, card dimensions, or flip mechanism.
- Do not tint the card as a whole, use CSS filters, add a second data model, or broaden profile/card write permissions.
