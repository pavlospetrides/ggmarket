-- Seller verification decisions must use review_seller_verification so every
-- transition receives database validation, an audit row, and a notification.
-- The legacy core-schema policy otherwise permits administrators to update the
-- table directly and bypass those invariants.
drop policy if exists "verifications admin update" on public.seller_verifications;
