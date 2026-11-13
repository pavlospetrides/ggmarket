begin;
select plan(12);

select has_table('public', 'seller_verification_audit', 'verification audit exists');
select has_table('public', 'founding_sellers', 'founding sellers exists');
select has_table('public', 'promotion_entitlements', 'promotion entitlements exists');
select has_table('public', 'featured_listing_campaigns', 'featured campaigns exists');
select has_table('public', 'referrals', 'referrals exists');
select has_table('public', 'promotion_reward_ledger', 'reward ledger exists');
select row_security_active('public', 'seller_verification_audit');
select row_security_active('public', 'promotion_entitlements');
select row_security_active('public', 'referrals');
select row_security_active('public', 'promotion_reward_ledger');
select function_privs_are('public', 'review_seller_verification', array['uuid','text','text','text'], 'authenticated', array['EXECUTE']);
select function_privs_are('public', 'review_seller_verification', array['uuid','text','text','text'], 'anon', array[]::text[]);

select * from finish();
rollback;
