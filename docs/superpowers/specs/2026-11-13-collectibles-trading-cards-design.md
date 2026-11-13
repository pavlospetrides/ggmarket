# Collectibles & Trading Cards design

## Architecture

Preserve the existing top-level `collectibles` category slug and row. An additive migration renames it to **Collectibles & Trading Cards** and expands its attribute schema. Stable subcategory and product-type identifiers live in the existing indexed `listings.attributes` JSONB and are owned by `lib/gaming-taxonomy.ts`; no parallel listing, media, search, or moderation system is introduced.

## Seller experience

The required path is category -> collectible subcategory -> product type. Existing listing essentials remain title, condition, price, description, photos, city, and delivery method. All collector-specific details are optional and live under **Additional details (optional)**. Collectibles do not require a separate catalog product/model entry; the API receives the listing title as the catalog hint to preserve the existing create contract.

Card fields appear only for card/sealed/deck types. Grading fields appear only when a seller selects a graded-card product type or marks a card as graded. Figure fields appear only for figures/statues. `Other` selections reveal bounded custom text. Grade and certification values are seller-provided and never described as verified.

## Trust and moderation

Published details label grading/authenticity metadata as seller-provided. Existing report, admin moderation, ownership/RLS, offer, trade, and media rules remain authoritative. Seller-review badges do not imply collectible authenticity.

## Discovery

Existing category queries, full-text indexing of JSON attributes, listing cards, related listings, profiles, saved searches, favorites, and sitemaps work generically. URL-backed taxonomy filters add collectible subcategory, product type, card game, graded status/company/grade, sealed state, language, price, base condition, and existing city search without changing filters for other categories.

## Compatibility

The implementation starts independently from `origin/main`. Seller Growth has no code dependency: once both PRs merge, its generic listing ownership and eligibility rules naturally accept collectible listings. The prior specification-mapping repair on `main` remains the formatter boundary and prevents cross-category option labels.
