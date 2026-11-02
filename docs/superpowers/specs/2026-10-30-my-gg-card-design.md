# My GG Card — approved design

## Goal

Add a profile-owned, interactive GGMarket identity card using the supplied lanyard badge without changing its visual geometry or physics. The feature is private by default, lazily loaded, accessible, and safe under the existing Supabase security model.

## Product contract

- Add a “My GG Card” profile section with the description “Your gaming identity, your style.”
- Owners can view and customize their card. Visitors can view it only when the owner explicitly makes it public.
- Reuse the profile display name, username, and existing avatar identity. Store only a slogan (maximum 80 characters), an allowlisted theme, and visibility.
- Themes: GG Purple, Midnight Black, Arctic White, and Crimson. Arbitrary CSS, HTML, URLs, and colors are not accepted.
- Preserve the supplied card geometry, rope physics, generated strap artwork, drag/spin/flip interaction, and front/back composition.
- Load the lanyard implementation only after the viewer is opened. Stop animation while offscreen or when the document is hidden; clean up all observers/listeners/frames; honor reduced motion.
- Use an accessible modal with focus trap, Escape dismissal, focus restoration, labelled controls, and touch targets of at least 44px.

## Data and security contract

- `public.gg_cards` is keyed by `user_id`, references `profiles(id)` with cascade deletion, and contains `slogan`, `theme_id`, `is_public`, and timestamps.
- RLS is enabled. Authenticated active owners can select/insert/update their own row. Anonymous/authenticated visitors can select only public cards belonging to non-suspended profiles.
- The mutation route derives the user from the verified session, validates an exact strict payload, uses the normal authenticated Supabase client, and never accepts a target user id.
- Suspended users cannot mutate cards. No service-role path, schema weakening, CSP change, auth change, or production access is permitted.
- No new Supabase Storage surface is required or allowed for this feature.

## Defaults

- Missing rows render a private GG Purple card with slogan “Play. Trade. Belong.” for the owner.
- Public profiles expose no card data unless `is_public` is true.
- The feature stays local and uncommitted until the user explicitly approves a commit or push.
