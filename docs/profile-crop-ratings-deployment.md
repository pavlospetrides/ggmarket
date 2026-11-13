# Profile crop and seller review rollout

## Database change

Apply `supabase/migrations/202611130001_seller_review_summary.sql` in a disposable Supabase project first. It adds a read-only, security-invoker aggregate over the existing public `reviews` table. It does not alter review rows, submission rules, RLS policies, or listing and profile image storage. Confirm `202611120003_profile_media.sql` and the account-ratings migration are already present in the target migration history. Do not infer remote state from repository files.

In the isolated project, test anonymous and authenticated summary reads for two different sellers, empty sellers, pagination, rating submission, cross-account write denial, and the existing private R2 profile upload flow. Verify the `reviews public read` policy and review grants remain intact. The code expects this function, so apply the migration before deploying the application in a separately authorized production change window.

## Application deployment

Deploy the reviewed PR after the migration. Smoke test avatar and cover upload, drag in both axes, zoom, cancel, retry after an upload error, save/reload, signed URL recovery, and removal on Chromium and WebKit desktop/mobile. On both owner and public seller profiles, select a populated rating summary and an empty one; confirm navigation to the paginated public reviews section with the correct aggregate, dates, names, and text. Check existing listing uploads and the R2 CSP behavior. No Cloudflare setting needs to change.

## Rollback

Redeploy the previous application version. Leave the additive function in place until a reviewed forward change removes it; the earlier app ignores it. The previous profile media migration and private R2 objects remain intact. Do not bulk-delete images or review data. The new app must not be redeployed until the summary function is available.

## Verification scope

Vitest exercises the aggregate in embedded PostgreSQL and API behavior with mocked Supabase responses. The browser harness uses generated images and review fixtures; it proves UI behavior without live Supabase, R2, or Vercel logging. Production data and configuration are not changed by these checks. Local production-mode WebKit over plain HTTP remains incompatible with the existing `upgrade-insecure-requests` CSP; use the development harness locally and verify HTTPS in an isolated Preview deployment.
