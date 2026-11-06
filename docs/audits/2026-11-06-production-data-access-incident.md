# GGMarket Production Data Access Incident — 2026-11-06

## Executive decision

- **Marketplace listing pipeline:** healthy in repeated read-only production checks. Make no marketplace code change.
- **Public sitemap:** confirmed application regression. The deployed queries request the protected `profiles.suspended_at` column and fail with PostgreSQL `42501` (`permission denied for table profiles`).
- **Fix:** code-only and safe to review for deployment. It removes protected-column selection/filtering and uses the existing anonymous RLS-filtered inner relationships as visibility gates.
- **Database, RLS, grants, Storage, and migrations:** no change required or permitted for this incident.

The earlier marketplace `DataAccessError` is no longer reproducible. Available evidence cannot establish its historical provider or network cause, so it remains **recovered, cause unconfirmed**. The sitemap failure is deterministic, predates PR #32, and is not evidence of a continuing general Supabase outage.

## Production evidence

All checks used the public anonymous Supabase configuration or unauthenticated HTTPS requests. No production writes, authenticated sessions, service-role credentials, migrations, or Storage mutations were used.

Two consecutive database diagnostic rounds produced the same results:

| Operation | Result |
| --- | --- |
| Base public listing select | Success |
| Legacy listing-image embed | Success |
| Variant listing-image embed | Success |
| Exact active-listing count | Success; 8 records |
| Seller review enrichment | Success |
| Seller verification enrichment | Success |
| Original-path signed URL batch | Success; 9/9 |
| Selected card/fallback signed URL batch | Success; 9/9 |
| Deployed sitemap listing/profile page query | Failed; PostgreSQL `42501` |
| Replacement listing/profile count query | Success; 8 listings and 2 profiles |
| Replacement listing/profile page query | Success |

Two unauthenticated HTTP rounds returned `200` for `/`, `/marketplace`, and `/pages/sitemap.xml`. A current public listing discovered from marketplace HTML returned `200` in three consecutive checks. The previously sampled listing URL returned `404`, but it was no longer advertised by the marketplace and was replaced in the diagnostic with a current public listing.

The deployed `/sitemap.xml`, `/sitemaps/listings/1.xml`, and `/sitemaps/profiles/1.xml` each returned `500` in both rounds. This is expected to remain true until the code fix is explicitly approved and deployed.

## Root cause and non-causes

The production hardening migration intentionally revokes broad profile-table reads and grants anonymous/authenticated callers only the safe public columns. `suspended_at` is deliberately omitted. The sitemap implementation nevertheless selected or filtered that column in its count and page queries. PostgREST correctly rejected the requests with `42501`.

The failure is not fixed by granting `anon` access to `suspended_at`; doing so would weaken profile privacy. It is also not a current schema-cache mismatch: the same production endpoint accepts the replacement query shapes immediately, while the protected-column shapes fail consistently. The sitemap implementation was introduced before PR #32, so PR #32 did not introduce this query defect.

No Supabase availability or connection failure was observed during the repeated diagnostics. This does not prove the earlier marketplace incident was never transient; it means there is no current reproducible platform/connectivity failure and no evidence supporting a speculative marketplace patch.

## Security behavior after the fix

The sitemap server creates a non-persistent anonymous client using the public anon key. It does not load a user session. Visibility therefore remains:

- Anonymous users see only profiles allowed by `profiles public read` RLS.
- A suspended profile is hidden from the anonymous inner relationship, so its otherwise-active listings do not enter the listing sitemap.
- A suspended profile is absent from the profile sitemap before application builders run.
- Profiles without an active listing are excluded by the required inner listing relationship.
- Draft, removed, and other non-active listings are excluded by the listing status predicate.
- The existing authenticated owner and active-admin RLS exceptions remain available to their intended authenticated application flows, but cannot broaden an anonymous sitemap request.

The regression suite verifies the four count/page query shapes, their inner relationships, the absence of restricted-column requests, the non-persistent client configuration, missing-relation exclusion, active-status filtering, and all sitemap route builders. Existing RLS policies, column grants, Storage privacy, ownership checks, and admin checks are untouched.

Authenticated owner/admin behavior was not mutation-tested against production because that would require credentials and state changes. Its preservation is established by the zero-diff database policy surface plus the anonymous-client regression. A disposable Supabase RLS test remains the appropriate environment for stateful policy testing.

## Verification record

- Focused Vitest: 3 files, 13 tests passed.
- Full Vitest: 85 files, 600 tests passed.
- TypeScript: `tsc --noEmit` passed.
- ESLint: `eslint . --max-warnings=0` passed.
- Next.js 16.4.3 production build: passed; 59 static pages generated.
- Playwright read-only sitemap flow: Chromium desktop, Chromium mobile, WebKit desktop, and WebKit mobile passed (4/4).
- Dependency audit: `npm audit --omit=dev` reported 0 vulnerabilities.
- Secret scan: no high-risk credential patterns in the branch diff.
- `git diff --check`: passed.

## Deployment and rollback

Deployment requires explicit approval. No migration or production database command belongs in this release.

1. Review and approve the pull request against the latest `main`.
2. Deploy the application commit only. Do not change Supabase grants, RLS, Storage policy, bucket privacy, or environment secrets.
3. Confirm `/sitemap.xml` returns `200`, `application/xml`, and advertises `/pages/sitemap.xml` plus the populated listing/profile sitemap pages.
4. Confirm every advertised listing/profile page sitemap returns `200`, `application/xml`, and contains only public canonical URLs.
5. Recheck `/`, `/marketplace`, and a currently advertised listing detail.
6. Monitor Vercel for `SitemapDataError`, Supabase/PostgREST `42501`, timeouts, and 5xx rates for at least one sitemap cache window (one hour), then continue normal monitoring through the 24-hour stale-while-revalidate window.

Rollback is an application redeploy of the prior known-good commit. There is no database rollback because this change has no migration or data mutation. A rollback will restore the sitemap 500 and should be used only if the application deployment causes a broader regression.

## GO / NO-GO

| Decision | Status | Reason |
| --- | --- | --- |
| Merge | **NO-GO pending human review/approval** | This investigation does not merge automatically. |
| Sitemap application deployment | **GO after PR approval** | Minimal code-only fix; production replacement queries and local browser flow passed. |
| Marketplace speculative fix | **NO-GO** | Listing pipeline is healthy and the original error is not reproducible. |
| Production database migration or grant change | **NO-GO / not required** | Would add risk and could expose protected moderation state. |
| Production data or Storage mutation | **NO-GO / not required** | No backfill, bucket, object, or row change is part of the fix. |

The change does not add infrastructure, storage, image processing, or database workloads beyond restoring the sitemap queries that were already intended to run. No material cost increase is expected.
