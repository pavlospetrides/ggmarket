# Collectibles & Cards security review — 13 November 2026

## Reviewed boundaries

The review covered both category migrations (including `202611130004`), taxonomy validation and formatting, create/edit payload mapping, URL-backed marketplace filters, listing disclosure, media reuse, existing listing authorization/RLS boundaries, public attribute exposure, report/moderation reuse, and interaction with Seller Growth.

## Findings resolved

- **High — context-invalid taxonomy claims:** server-used validation requires one of the two groups and a matching canonical item type, rejects card attributes in the Collectibles branch and grading data on ungraded cards, and bounds grades. The pre-existing seller data is retained by the forward backfill.
- **Important — grading presented as platform verification:** Sell and listing surfaces now state that grading, certification, and authenticity details are seller-provided and not verified by Lootriva. The listing disclosure explicitly separates seller badges from item authenticity.
- **Important — excessive discovery fields:** marketplace controls use an explicit allowlist for card collection and grading; group and item type use the shared taxonomy controls. Free-form card names, certification numbers, and characters are not promoted as structured filter inputs.
- **Important — category-specific value leakage:** collectibles extend the existing category-scoped formatter and specification-mapping boundary, preventing labels from unrelated gaming taxonomies from being applied to collectible values.
- **Important — duplicate product identity requirements:** the Collectibles flow uses the listing title as the existing API catalog hint instead of collecting a second required product/model string, avoiding divergent public and internal names.

## Inherited controls verified by design and regression coverage

- Listing create/edit authorization, ownership checks, active-listing reads, admin moderation, reports, offers, trades, chat, favorites, and profile listing queries remain on the existing shared paths.
- The forward migration adds no table, RPC, grant, storage policy, or RLS policy and performs no delete/drop operation. It adds filter keys to existing listing JSON while retaining original attributes and IDs; the SQL was run twice in disposable embedded PostgreSQL.
- React-rendered seller text remains escaped. Database search/filter construction continues through the shared bounded taxonomy-key and query parameter pipeline rather than raw SQL interpolation.
- Collectible photos use the existing bounded upload, signing, ownership, and cleanup path; no new public bucket or upload endpoint was introduced.
- The Collectibles branch has no code dependency on Seller Growth. Seller badges and future growth-program entitlements do not authenticate, grade, certify, or prove an item.

## Residual limitations

- Docker/Podman is unavailable in this environment, so the Supabase database/RLS suite and migration must be run in a disposable Supabase project before rollout.
- Lootriva does not independently validate grading-company records, certification numbers, counterfeit status, provenance, or ownership. Disclosure and existing moderation/reporting reduce presentation risk but do not replace operational review.
- Certification numbers are intentionally public when supplied. Product/legal owners should confirm retention and takedown handling before rollout.
- The category rollout has no runtime feature flag; operational rollback is an application revert while preserving seller data. The remote migration history remains unknown until an authorized read-only check against the intended Supabase project.

No unresolved Critical, High, or Important code finding remained after the documented fixes and local static, unit, integration, and isolated browser checks.
