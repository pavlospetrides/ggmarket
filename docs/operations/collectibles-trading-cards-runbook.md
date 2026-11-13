# Collectibles & Trading Cards runbook

## Scope and rollout

This release extends the existing `collectibles` category and the shared listing system. It adds no parallel marketplace, storage bucket, authentication path, privileged RPC, table, or RLS policy. Apply `supabase/migrations/202611130003_collectibles_trading_cards.sql` before deploying the application so the stable category name and attribute schema are available when sellers begin publishing structured collectible details.

The migration is additive and idempotent: it upserts the existing category slug and never deletes listings or taxonomy data. There is no feature flag. Coordinate application rollout immediately after the migration, or temporarily hide the Collectibles homepage route at the application layer if the release must be paused.

## Deployment checks

1. Back up the database and apply the migration in a disposable or staging Supabase project.
2. Run the repository database/RLS suite and confirm ordinary users can still mutate only their own listings while anonymous users retain read-only access to active public listings.
3. Deploy the application and confirm the category name is **Collectibles & Trading Cards** on the homepage, marketplace, Sell flow, edit flow, listing page, and sitemap/category navigation.
4. Publish one test listing for a card and one for a figure. Confirm title, condition, price, description, photos, city, and delivery remain required by the existing flow, while collectible details remain optional except product type.
5. Filter by subcategory, product type, card game, grading status/company/grade, sealed condition, language, price, condition, and city. Remove each URL-backed filter and confirm unrelated categories retain their existing controls.
6. Confirm collectible listing pages show the seller-provided grading/authenticity disclosure and that seller badges are not presented as item-authenticity evidence.
7. Exercise existing report, admin moderation, favorites, offers, trades, chat, profile listings, image upload/signing, and ownership-denied paths with a collectible listing.

## Operational guidance

- Treat grading company, score, certification number, sealed state, and authenticity statements as seller claims. Support and moderation must not describe them as Lootriva-verified.
- Use the existing report and admin listing-moderation workflows for counterfeit, misleading, prohibited, or incorrectly categorized items.
- Certification numbers are public listing metadata when a seller voluntarily supplies them. Remove them through the existing edit/moderation workflow when requested or inappropriate.
- Existing image type, size, count, signing, ownership, and deletion controls remain authoritative; no collectible-specific upload path exists.

## Rollback

Roll back the application deployment first. The prior application safely ignores the additional JSON attributes and continues to use the stable `collectibles` slug. Do not delete collectible listings or strip their attributes.

If the category label or schema must also be reverted, update only the existing category row to the previously approved label/schema in a forward migration. Do not drop the category, delete attributes, or reverse the applied migration after sellers have created data. Re-deploy after diagnosis and repeat the deployment checks above.

## Combined post-merge checks

After both Seller Growth and Collectibles PRs merge, keep all Seller Growth feature flags and database kill switches disabled until its separate activation review. Confirm seller verification, founding status, featured eligibility, and referral behavior remain category-agnostic and that no badge or program status is interpreted as collectible authenticity.
