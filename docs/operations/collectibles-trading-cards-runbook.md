# Collectibles & Cards runbook

## Scope and rollout

This release extends the existing `collectibles` category and the shared listing system. It adds no parallel marketplace, storage bucket, authentication path, privileged RPC, table, or RLS policy. The final display name is exactly **Collectibles & Cards**. The new `supabase/migrations/202611130004_collectibles_cards_hierarchy.sql` migration adds the two-group schema and backfills canonical filter keys without replacing older listing values.

Verify the target project's migration history before rollout; repository files alone do not show which migrations ran remotely. If `202611130003_collectibles_trading_cards.sql` is pending, apply it first and `202611130004_collectibles_cards_hierarchy.sql` second using the migration runner. If `003` already ran, apply `004` only. The `004` SQL itself is idempotent and tolerates a database where `003` has not run, but migration history should still be kept in filename order. There is no feature flag. Coordinate the application rollout after `004` completes.

## Deployment checks

1. Back up the database, verify its current migration history without exposing credentials, then apply pending migrations through `202611130004` in a disposable or staging Supabase project. Check the affected collectible listing count and backfill runtime before production scheduling.
2. Run the repository database/RLS suite and confirm ordinary users can still mutate only their own listings while anonymous users retain read-only access to active public listings.
3. Deploy the application and confirm the category name is **Collectibles & Cards** on the homepage, Browse, Marketplace, Sell, edit, listing detail, and category navigation.
4. Publish one test listing under Collectibles → Funko Pop and one under Cards → Pokémon Cards or Graded Cards. Confirm both group and item type are required, the shared listing essentials remain required, and specialized attributes are conditional.
5. Browse all category listings, then each group and leaf. Filter by card collection and grading where applicable, plus price, condition, and city; verify sort, pagination, search and browser back. Remove filters and confirm unrelated categories retain their controls.
6. Confirm collectible listing pages show the seller-provided grading/authenticity disclosure and that seller badges are not presented as item-authenticity evidence.
7. Exercise existing report, admin moderation, favorites, offers, trades, chat, profile listings, image upload/signing, and ownership-denied paths with a collectible listing.

## Operational guidance

- Treat grading company, score, certification number, sealed state, and authenticity statements as seller claims. Support and moderation must not describe them as Lootriva-verified.
- Use the existing report and admin listing-moderation workflows for counterfeit, misleading, prohibited, or incorrectly categorized items.
- Older certification numbers remain public listing metadata when a seller supplied them. The new Sell flow does not request them. Remove them through the existing edit/moderation workflow when requested or inappropriate.
- Existing image type, size, count, signing, ownership, and deletion controls remain authoritative; no collectible-specific upload path exists.

## Rollback

Roll back the application deployment first. The prior application safely ignores the new `family` and `item_type` JSON attributes and continues to use the stable `collectibles` slug. Do not delete collectible listings or strip their attributes.

If the category label or schema must also be reverted, update only the existing category row to the previously approved label/schema in a forward migration. Do not drop the category, delete attributes, or reverse the applied migration after sellers have created data. Re-deploy after diagnosis and repeat the deployment checks above.

## Combined post-merge checks

After both Seller Growth and Collectibles PRs merge, keep all Seller Growth feature flags and database kill switches disabled until its separate activation review. Confirm seller verification, founding status, featured eligibility, and referral behavior remain category-agnostic and that no badge or program status is interpreted as collectible authenticity.
