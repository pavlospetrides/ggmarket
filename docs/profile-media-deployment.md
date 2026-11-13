# Profile media deployment and rollback

## What changes

Migration `supabase/migrations/202611120003_profile_media.sql` adds nullable `profiles.cover_path`, private path reservations, a rolling upload claim ledger, and an obsolete-object cleanup outbox. It preserves `profiles.avatar_path` and every existing listing image table, object, policy, and route. Existing users have no backfill. The application stores only R2 object keys in Supabase; signed URLs are generated when authorized profiles are read.

## Environment

Set these server-only Vercel variables in every environment where profile uploads or existing profile media must render:

- `R2_ACCOUNT_ID`: 32 hexadecimal character Cloudflare account ID.
- `R2_BUCKET_NAME=lootriva-images`: the existing private bucket.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`: scoped R2 credentials with object read/write/delete permissions for this bucket. Never use `NEXT_PUBLIC_` prefixes.
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only Supabase secret key remain required. The secret key is used only by trusted server routes to create upload reservations and drain cleanup jobs.

`MEDIA_STORAGE_PROVIDER` remains the listing image rollout flag and does not govern profile media. The merged CSP fix permits only the exact R2 signed-image hostname computed from the validated account and bucket values. Keep the bucket private. Do not add a public R2 custom domain for this feature. Next Image uses `unoptimized` for profile images, so Vercel performs no transformations.

## Safe rollout

1. Review the SQL and current migration history in the intended Supabase project. Verify that `202611120002_listing_image_storage_provider.sql` is already applied. Do not infer remote state from repository files.
2. Apply `202611120003_profile_media.sql` to a disposable Supabase project, confirm its target, and test owner, cross-account, anonymous, suspended-account, grant, reservation, and cleanup behavior. Do not use a shared or production database for this test.
3. Configure the server-only R2 values in a Vercel Preview deployment pointing to the isolated Supabase project. Confirm `R2_BUCKET_NAME=lootriva-images`, credentials, bucket privacy, and signed GET response/CSP behavior. Use unique test accounts and remove only the objects created by that test.
4. Review the PR, its test evidence, and the isolated integration result. In a separate, explicitly authorized production change window, apply the additive migration before deploying the new application. The previous app remains compatible with the added nullable column and tables.
5. Deploy the application. Smoke test upload, crop, replace, remove, fallback, public seller view, listings, conversations, refresh after signed URL expiry, and listing image behavior on desktop and mobile.
6. Monitor `profile_media_cleanup_jobs` where `completed_at is null`. The user mutation route retries up to 20 scoped jobs on later changes. For jobs left by account deletion or persistent storage errors, run `node --conditions=react-server --import=tsx scripts/retry-profile-media-cleanup.mjs` with the target environment configured to inspect a batch without writing. After separate authorization, set `MEDIA_CLEANUP_ALLOW_APPLY=1` and add `--apply --confirm-project-ref REF --confirm-r2-bucket lootriva-images`. Use `--cursor PROFILE_PATH` and `--batch-size N` (1–100) to resume. The command verifies the project and bucket, rechecks active profile paths, and only removes exact owner/kind keys. Do not delete unverified objects or old production files during rollout.

## Rollback

Redeploy the prior application version. Leave the additive migration in place; nullable `cover_path`, reservations, and cleanup jobs do not affect the prior version. Existing R2 objects remain private. Do not drop columns or bulk-delete files during an incident. Correct data or SQL defects with a reviewed forward migration. Resume cleanup only after validating each job's owner, kind, active profile paths, and exact object key.

## Verification scope

Vitest route/storage tests use mocked Supabase/R2 responses and Sharp image fixtures. The Playwright UI harness mocks mutation and image responses; it proves browser preview, controls, refresh, fallback, and layout behavior, not live R2 or Supabase persistence. A real integration test requires the isolated Supabase project, private R2 bucket credentials, and the migration already applied. No migration or R2 object operation is executed against Production by this PR.
