# Lootriva Card Custom Colors Deployment

## Migration requirement

This release requires the additive migration [`202611120001_gg_card_custom_colors.sql`](../../supabase/migrations/202611120001_gg_card_custom_colors.sql). It adds nullable, database-constrained `text_color` and `front_pattern_color` columns to `public.gg_cards` and extends only the existing presentation-column grants.

The migration has not been executed against Production by this work.

## Safe deployment order

1. Confirm the intended Supabase project and take the normal pre-deployment backup. Do not print credentials or complete connection strings.
2. Apply all already-approved preceding migrations through `202611050001_listing_image_variants.sql` in a disposable or staging project.
3. Apply `202611120001_gg_card_custom_colors.sql` in that isolated project.
4. Verify both constraints reject malformed colors, the new columns remain nullable, and grants expose only the approved presentation columns.
5. Run pgTAP `supabase/tests/gg_card_rls.test.sql` and `tests/security/gg-card-direct-api.mjs` against the isolated project. Confirm owner writes, cross-user denial, anonymous private-card denial, and public presentation reads.
6. Deploy the application build after the migration succeeds. The old application remains compatible with the nullable columns, and the new application resolves legacy `NULL` values through each existing theme's readable ink color.
7. Smoke-test one authenticated owner save, reload the profile, verify the two colors remain independent, then verify a second account cannot update the first account's row.
8. Verify public/private visibility and both viewer controls on a phone and desktop browser.
9. Monitor `/api/gg-card` error rates and PostgreSQL constraint/RLS errors before widening rollout.

## Rollback and forward-fix strategy

Roll back the application before considering any schema change. The additive nullable columns can safely remain in place for the previous application version and should not be dropped during an incident. If a schema correction is required, ship a new ordered forward migration; do not edit or remove migration history.

Because saved color values are presentation data constrained to exact six-digit HEX strings, no data backfill is required. Existing rows remain unchanged until their owners save customization.

## Security checks

- The API derives `user_id` from the authenticated session and rejects extra client fields.
- Client and server accept only `#RRGGBB`; database checks enforce the same boundary.
- The JSON body remains capped at 64 KiB.
- Existing owner-only insert/update RLS policies remain unchanged.
- Anonymous users receive colors only for cards already permitted by the existing public-read policy.
- React receives validated values only as color properties; values are never inserted into HTML, scripts, selectors, or complete CSS declarations.
- User identity and slogan content continue to render as escaped React text.

## Visual evidence

- [`lootriva-card-customize-mobile.png`](../screenshots/lootriva-card-customize-mobile.png)
- [`lootriva-card-customize-tablet.png`](../screenshots/lootriva-card-customize-tablet.png)
- [`lootriva-card-customize-desktop.png`](../screenshots/lootriva-card-customize-desktop.png)
- [`lootriva-card-viewer-front-desktop.png`](../screenshots/lootriva-card-viewer-front-desktop.png)
- [`lootriva-card-viewer-back-desktop.png`](../screenshots/lootriva-card-viewer-back-desktop.png)
