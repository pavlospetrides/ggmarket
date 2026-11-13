# Collectibles & Cards hierarchy design

## Intent

The existing `collectibles` category becomes **Collectibles & Cards** throughout the shared marketplace. Buyers can see all category listings or narrow to **Collectibles** or **Cards**, then to one of six item types in the chosen group. Sellers must select the group and item type before adding the normal listing essentials. Existing category and listing rows stay in place.

## Data contract

Keep the top-level `collectibles` category slug. Use `family` for the primary group (`collectibles` or `cards`) and `item_type` for the six canonical item types in each group. New listings also store the canonical type in `subcategory` for compatibility with the current taxonomy builder. A forward migration adds `family` and `item_type` to existing collectible listing attributes based on their old `subcategory` and `product_type`, without replacing either old value. Unknown older items default to the Collectibles group and Other Collectibles type. The category upsert works whether or not migration `202611130003` was previously applied.

The six Collectibles item types are Action Figures & Statues, Funko Pop, Anime Collectibles, Gaming Memorabilia, Limited Editions, and Other Collectibles. The six Cards item types are Pokémon Cards, Yu-Gi-Oh! Cards, Magic: The Gathering, Sports Cards, Graded Cards, and Other Trading Cards. Legacy item identifiers remain interpretable on existing listings. There are no separate child category rows; category filtering, counts, and inherited features continue to use the existing category ID.

## Seller and discovery behavior

The existing taxonomy selector gets a two-level Collectibles branch: group, then item type. The group and item type are required; the usual title, description, photos, price, base condition, city, and delivery requirements remain. Conditional collector fields appear in the existing optional-details area: brand/franchise, character/series, original packaging and limited edition for Collectibles; card game/collection, card name, set/edition, optional number, grading status and conditional grading company/grade for Cards. Condition stays in the shared listing field. Seller-provided grading disclosure stays in Sell and listing detail.

Browse, Marketplace, and Search use the same `family` and `item_type` URL filters. Selecting the top-level category shows both groups; choosing a group shows every listing in it. Sorting, pagination, search, saved searches, profiles, related listings, favorites, back restoration, and category counts use their existing generic listing paths. Navigation changes preserve the search term and sort while clearing stale taxonomy keys.

## Constraints and verification

Follow `DESIGN.md`; reuse existing category icons and media. The migration is additive and idempotent, with no policy or grant changes. Verify taxonomy and query behavior, migration backfill on embedded PostgreSQL, both seller draft paths, both buyer paths on mobile and desktop Chromium/WebKit, static checks, production build, and inherited security boundaries. No production migration, merge, or deployment is performed.
