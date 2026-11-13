# Seller Growth Program security review — 13 November 2026

## Reviewed boundaries

Authentication callbacks, seller/admin APIs, SQL functions, grants/RLS, public trust views, founder allocation, promotion ownership/expiry, referral attribution, qualification, and reward redemption were reviewed against the implementation plan.

## Findings resolved

- **Critical — private reviewer-note disclosure:** replaced seller table reads with a seller-safe RPC; direct verification and audit reads are admin-only. Public badges use a narrow view.
- **High — post-signup referral claiming:** referral codes no longer authorize attribution. A random server-issued visit UUID must exist before profile creation, expires after seven days, and is stored only in an HttpOnly SameSite cookie.
- **High — ordinary users could run global qualification:** qualification now requires `is_admin()` in the security-definer function.
- **Important — interrupted seven-day eligibility:** a server trigger resets eligibility whenever a listing leaves and re-enters active state.
- **Important — public campaign/founder row exposure:** public discovery now uses narrow views; full records are limited to owners/admins by RLS.
- **Important — delete trigger referenced `NEW`:** listing campaign pause logic now handles DELETE separately.
- **Important — admin search filter injection:** reserved PostgREST filter characters are stripped before composing the admin filter.

## Free verification follow-up

- The forward `202611130005` migration blocks a seller whose latest application is approved from submitting again and prevents an administrator from deciding their own application. Both checks run inside the existing security-definer RPCs; API checks alone are not the authorization boundary.
- The public trust view and seller-only status RPC use the same latest-application ordering. A later pending, rejected, or revoked decision removes the Verified Seller signal; historical applications and audit rows remain intact.
- Application POST responses now include only seller-safe fields. Submitted `sellerId` and `status` values are ignored; the database uses `auth.uid()` and only administrator review can set `verified`.
- Local embedded PostgreSQL exercises approval, rejection, revocation, duplicate pending prevention, own-application access, and the administrator self-review denial. The follow-up adds no table, grant, or RLS policy. The Supabase pgTAP/RLS suite remains a staging deployment gate.

## Residual limitations

- Docker/Podman is unavailable in this environment, so the migration and pgTAP suite require execution in disposable Supabase before rollout.
- Admin MFA is not implemented in the repository and is a mandatory owner prerequisite.
- Referral qualification is admin-triggered rather than scheduled; the runbook requires a daily owner until an authenticated scheduler is approved.
- Legal/privacy controller details, lawful bases, retention, and referral terms require owner/legal approval.

No unresolved Critical, High, or Important code finding remained after the documented fixes and local static/unit/browser checks.
