# Seller Growth Program runbook

## Scope and activation

The release is additive and ships disabled. Apply `supabase/migrations/202611130002_seller_growth_program.sql` before deploying application code, then validate the pgTAP suite in a disposable Supabase environment. Keep all flags false until owner review is complete:

The free verification entry follow-up also requires `supabase/migrations/202611130005_seller_verification_entry_safety.sql`. Check the target project's migration history first and apply pending files in timestamp order. Migration `005` keeps existing records, tables, policies, and grants; it prevents an already approved seller from opening another application, prohibits administrators from deciding their own applications, and makes public badges follow the latest decision. Do not deploy the updated application before `005` has been applied and checked in staging.

```env
SELLER_VERIFICATION_ENABLED=false
FOUNDING_SELLERS_ENABLED=false
FEATURED_LISTINGS_ENABLED=false
REFERRAL_REWARDS_ENABLED=false
```

Enable in dependency order: seller review, founders, featured listings, then referrals. Do not enable Founding 100 until staff review operations are staffed; do not enable referrals until the fraud-review and qualification cadence has an owner.

To open **Apply for Free Verification** specifically, set `SELLER_VERIFICATION_ENABLED=true` in the application environment and enable only the `seller_verification` row in `public.seller_growth_feature_config`. Both switches are required; applying migrations alone leaves applications closed. Leave the other Seller Growth switches disabled until their separate rollout decisions. This runbook does not authorize changing production settings automatically.

```sql
update public.seller_growth_feature_config
set enabled = true, updated_at = now()
where feature = 'seller_verification';
```

The database also has a deny-by-default kill switch so direct RPC calls cannot bypass application flags. In the Supabase SQL editor, enable the matching rows only when the corresponding environment flag is enabled:

```sql
update public.seller_growth_feature_config
set enabled = true, updated_at = now()
where feature in ('seller_verification', 'founding_sellers', 'featured_listings', 'referral_rewards');
```

Enable only the rows approved for the current rollout stage; the four-row example is for full activation.

## Operations

- Staff review applications at `/admin/seller-growth`. Decisions and private notes are written through database RPCs and immutable audit rows.
- Founders are allocated under an advisory transaction lock after approval or publication. The counter includes allocated slots, including later-revoked slots; slots are not recycled.
- Featured campaigns use server timestamps. Ineligible listing status changes pause campaigns; the public rail reads only the narrow active-listings view.
- Referral qualification is initiated by an administrator from `/admin/seller-growth`. It is safe to retry. Run at least daily until a scheduler is approved.
- Review all non-clear referral risk states before qualification. Five rewards per referrer per calendar month is enforced in the transaction.

## Deployment checks

1. Back up the database and apply the migration in staging/disposable Supabase.
2. Run `supabase test db` and exercise RLS as anon, ordinary authenticated user, seller, and admin.
3. Deploy code with all flags false; verify existing auth, listings, chat, offers, trades, and profiles.
4. Enable one flag at a time and run the matching smoke tests.
5. As a signed-in seller, check `/profile`, `/settings`, and `/settings/verification` for the free application entry, submit the seller statement, and confirm the status is **Application Under Review** without a badge. Confirm a second submission is rejected.
6. As an authorized admin, approve and reject separate applications at `/admin/seller-growth`. Confirm only approval displays **Verified Seller** on public profiles and listing cards, and revocation removes it. Check rejection cooldown and revoked reapplication.
7. Confirm OAuth, native signup confirmation, and password recovery still complete without referral parameters or token leakage.

## Rollback

Set all four application flags to `false` first, then set every `seller_growth_feature_config.enabled` value to `false`. This removes entry points and blocks direct mutation RPCs while preserving histories, founder assignments, referral ledgers, and campaigns. Roll back the application deployment if needed. Do not drop the additive tables or remove the migration after production data exists; retain records for audit and legal review. Pause or revoke active entitlements through the admin workflow.

## Owner decisions before activation

- Approve seller-review criteria, staffing, appeal/support route, and reviewer training.
- Require MFA for administrator accounts; the repository does not currently provide an MFA gate.
- Approve privacy lawful bases, retention periods, controller/contact details, referral terms, fraud policy, and the non-cash/non-transferable reward wording.
- Approve the daily referral-qualification owner or a future authenticated scheduler.
