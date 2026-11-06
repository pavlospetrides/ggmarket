# Lootriva production cutover runbook

Last verified: 2026-11-06 18:02 Europe/Athens

This is an owner-operated checklist. The implementation branch does not change DNS, Vercel domains or environment variables, Supabase configuration or data, Google OAuth, Resend, Search Console, merge state, or Production deployments.

## Release boundary and blockers

- [ ] Pull request approved; all required checks are green; no Production deployment has occurred from the implementation branch.
- [ ] Legal owner approves the unresolved controller identity, address, privacy contact, lawful bases, retention schedule, processor terms, transfers, and regulator wording flagged on `/privacy`.
- [ ] Operator has access to Vercel, Papaki, Supabase, Google Cloud/Auth Platform, Resend, and Google Search Console.
- [ ] A disposable Supabase/Preview target is available for browser automation. Never use the Production database for destructive or account-linking tests.
- [ ] A fresh isolated Production mailbox is available for final real-email acceptance. Never paste its token-bearing links into tickets, chat, CI logs, or this runbook.
- [ ] Current database migrations, RLS policies, private `listing-images` bucket, signed-media delivery, and backups are verified separately. This cutover requires no database migration or permission change.

## Verified public state before cutover

Read-only DNS and HTTP checks at the timestamp above showed:

- `lootriva.com`: Papaki nameservers `dns1.papaki.gr` and `dns2.papaki.gr`; A response `216.198.79.1`; HTTP 308 to `https://www.lootriva.com/` (the wrong canonical direction).
- `www.lootriva.com`: CNAME `35f9828b65166627.vercel-dns-017.com`; HTTP 200 from Vercel.
- `ggmarket.eu` and `www.ggmarket.eu`: resolve but return Vercel `404 DEPLOYMENT_NOT_FOUND`; compatibility redirects are not currently live.
- Existing mail DNS observed on `lootriva.com`: MX preference 10 to `mail-gr.securemail.pro`; TXT SPF `v=spf1 a mx include:spf.webapps.net ~all`. Preserve working mail records. Do not create a second SPF TXT record.

Private dashboard state is unknown until an operator verifies it. In particular, repository files cannot prove the deployed Supabase Site URL, redirect allowlist, hosted email templates, SMTP sender, Google consent-screen branding, Vercel Production environment, or Resend domain verification.

## Ordered cutover

### 1. Vercel Preview validation

- [ ] Deploy the pull-request commit to Preview only.
- [ ] In Preview environment variables, keep the intended non-Production Supabase project values. Do not copy Production service-role or secret keys into Preview.
- [ ] Leave `NEXT_PUBLIC_SITE_URL` unset for isolated Vercel Preview behavior, unless the review environment has an explicitly approved stable Preview origin.
- [ ] Confirm the Preview hostname is authorized temporarily in Supabase only when Preview auth testing is required.
- [ ] Run public smoke tests: `/`, `/browse`, `/marketplace`, a listing, a public profile, `/privacy`, `/cookies`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`, `/offline`, and the new icon/social assets.
- [ ] Confirm private Storage remains private, listing images use signed URLs, anonymous draft access is denied, and no service-role value appears in browser code or logs.

### 2. Supabase Auth manual verification and preparation

In Supabase Dashboard for the intended Production project:

- [ ] Authentication → URL Configuration → Site URL: set to exactly `https://lootriva.com` at cutover.
- [ ] Redirect URLs: include exactly the application destinations in use: `https://lootriva.com/auth/recovery`, `https://lootriva.com/auth/confirm-signup`, and `https://lootriva.com/auth/callback` (an approved `https://lootriva.com/**` entry may cover them).
- [ ] Temporarily retain `https://www.lootriva.com/**`, `https://ggmarket.eu/**`, `https://www.ggmarket.eu/**`, and `https://ggmarket-sage.vercel.app/**` only for already-issued links that reach the application compatibility response. Review and remove obsolete legacy entries 30 days after cutover.
- [ ] Authentication → Email Templates → Reset password: compare the complete hosted HTML with `docs/auth/reset-password-email.html`. The anchor must use `https://lootriva.com/auth/recovery?token_hash={{ .TokenHash }}&type=recovery`; it must not use `.ConfirmationURL` as the visible reset link.
- [ ] Authentication → Email Templates → Confirm signup: compare with `docs/auth/confirm-signup-email.html`. The anchor must use `https://lootriva.com/auth/confirm-signup?token_hash={{ .TokenHash }}&type=email`.
- [ ] Verify the hosted subjects say Lootriva and contain no GGMarket domain or branding.
- [ ] Authentication → Providers → Email: preserve the existing confirmation policy and rate limits; do not disable confirmation to work around delivery.
- [ ] Authentication → Providers → Google: preserve automatic verified-email identity linking and record the exact Supabase provider callback URL for Google Cloud.

Security invariant: link GET only stages the token in a Secure, HttpOnly, SameSite=Lax, Path=/ pending cookie. Only the same-origin CSRF-checked POST calls `verifyOtp` once. Do not replace this with GET verification, relax origin checks, broaden OTP types, log tokens, or bypass the recovery AMR check.

### 3. Resend and Supabase SMTP

- [ ] In Resend Domains, add or inspect `lootriva.com`; copy the exact DNS records Resend currently displays. Do not invent records from this runbook.
- [ ] In Papaki DNS, add only the displayed DKIM/return-path records. Preserve the observed MX and working inbound-mail configuration. If Resend requests SPF, follow its current guidance and merge with the existing SPF policy rather than publishing a second SPF record.
- [ ] Wait for Resend to show the domain as verified.
- [ ] Create or rotate a least-privilege sending API key according to the operator's secret-management policy; never commit or paste it into logs.
- [ ] In Supabase Authentication → SMTP Settings, verify the Resend SMTP host/port/username and secret using Resend's current dashboard values.
- [ ] Set sender name/address exactly to `Lootriva <no-reply@lootriva.com>` and send an isolated test.
- [ ] Verify SPF/DKIM results in the received message headers and confirm Reply-To behavior is intentional.

### 4. Google OAuth

- [ ] Google Auth Platform → Branding: change product name/logo/support contact to Lootriva and add/verify authorized domain `lootriva.com`.
- [ ] Google Cloud → OAuth client → Authorized redirect URIs: keep the exact Supabase callback URL shown under Supabase's Google provider (`https://<project-ref>.supabase.co/auth/v1/callback`). Do not substitute the application callback.
- [ ] Supabase Redirect URLs must separately allow `https://lootriva.com/auth/callback`.
- [ ] Verify Production audience/publishing status and requested scopes; do not add scopes for the rebrand.
- [ ] Test new signup, existing verified-email linking, cancellation, account switching, refresh, logout, protected return paths, and suspended-account denial with isolated accounts. Confirm UUIDs and existing listings/favorites/conversations do not move.

### 5. Vercel Production domain and environment preparation

- [ ] Vercel Project → Settings → Domains: add/verify `lootriva.com`, `www.lootriva.com`, `ggmarket.eu`, and `www.ggmarket.eu` on this project before DNS cutover.
- [ ] Set `lootriva.com` as the primary Production domain.
- [ ] Configure `www.lootriva.com` to permanently redirect to `lootriva.com`, not the reverse.
- [ ] Attach the retired GGMarket hosts so application-controlled exact-host compatibility redirects can run. Ordinary public paths/queries must reach the apex; token/code-bearing and auth paths must restart safely without forwarding secrets.
- [ ] Production environment variable: set `NEXT_PUBLIC_SITE_URL=https://lootriva.com`. Verify Supabase public/server variables point to the existing intended Production project. Do not change keys as part of branding.
- [ ] Confirm no variable contains a retired public URL unless it is an explicitly documented compatibility input.

### 6. Papaki DNS change window

- [ ] Export/screenshot the current zone and note TTLs. Preserve MX, SPF, DKIM, verification, and unrelated records.
- [ ] In Vercel Domains, copy the exact apex and `www` DNS targets Vercel displays for this project at cutover time.
- [ ] In Papaki, change only the apex/`www` web records needed to match those displayed targets. Do not copy historical IP addresses from this document.
- [ ] Remove conflicting apex/`www` forwarding rules that force apex → `www`.
- [ ] For retired GGMarket domains, point only the web records to the same Vercel project if domain access is available; preserve unrelated mail DNS.
- [ ] Wait for Vercel to show all domains as valid and TLS certificates as issued before proceeding.

### 7. Production release and immediate verification

- [ ] Merge only after approval, then deploy the reviewed commit to Production through the normal Vercel release flow. Do not deploy a different SHA.
- [ ] Verify with fresh requests (no cached redirect): apex returns 200; `www` returns one permanent redirect to the same apex path/query; there is no loop.
- [ ] Verify retired public listing/profile links retain safe path/query. Verify a synthetic token-bearing legacy URL returns only the documented restart destination and its `Location` contains no token, code, provider token, access token, refresh token, or fragment.
- [ ] Inspect HTML and headers for apex canonical, Open Graph, Twitter, manifest, icon, robots, and sitemap URLs; none may reference `www` or the retired domain.
- [ ] Verify all customer pages, API fallback HTML, auth screens, email copy, PWA/offline shell, and Lootriva Card show Lootriva/LT assets.
- [ ] Smoke marketplace reads, search/filter/sort, sign-in, favorites, messages, offers/trades, listing creation/editing, signed images, notifications, moderation/suspension, logout, and protected-route redirects.
- [ ] Confirm RLS/private Storage policy state is unchanged and signed image URLs are neither logged nor made public.

## Fresh-email acceptance matrix

Use a new isolated account and a new email for each case when one-time-token state matters:

- [ ] Password reset from Chrome desktop; GET shows **Continue password reset**, POST advances, new password works, old password fails, and the recovery session signs out after update.
- [ ] Open a reset email first in Gmail's link preview/scanner context, then complete in Chrome; GET must not consume the token.
- [ ] Request on desktop and complete on a different device/browser, including iPhone Safari and Gmail in-app browser.
- [ ] Repeat the confirmation POST and reuse the same link after success; neither grants another session.
- [ ] Wait for expiry in an approved test environment and verify the expired/used state without account enumeration.
- [ ] Modify one token character, remove the token, change `type`, and try a legacy PKCE/code link; each fails safely and leaks no secret.
- [ ] Confirm signup stages on GET and verifies once on explicit POST; resend behaves the same.
- [ ] Google OAuth success, cancellation, existing-email linking, refresh, logout, protected return, and suspended-user denial all behave as documented.
- [ ] Inspect browser history, `Location` headers, application/Vercel/Supabase logs, analytics (if ever added), and error UI for token leakage. Do not record the real token while checking.

Real hosted-email delivery and dashboard-template state cannot be proven by automated repository tests; this matrix is a required manual gate.

## SEO and PWA follow-up

- [ ] Google Search Console: verify the `https://lootriva.com` domain property, submit `https://lootriva.com/sitemap.xml`, and inspect apex canonical selection.
- [ ] Request indexing for the homepage and representative marketplace/listing/profile pages only after redirects/canonicals are stable.
- [ ] Monitor coverage for `www`, old-domain, duplicate-canonical, redirect, and 404 changes. Keep legacy public redirects long-lived.
- [ ] Update external profiles/backlinks under owner control; never mass-rewrite user-generated content.
- [ ] Test a clean PWA install on apex. Existing installs on another origin cannot migrate automatically and should be reinstalled. Confirm the worker deletes only known Lootriva/one-release legacy shell caches and leaves unrelated caches intact.
- [ ] Monitor 4xx/5xx, auth email delivery/bounces, OAuth errors, recovery failures, CSP reports if configured, signed-media failures, and search coverage during the release window.

## Independent rollback controls

- **Application:** use Vercel rollback to the last known-good deployment SHA. Do not revert database migrations or loosen RLS/Storage policies during an incident.
- **Vercel domains:** restore the recorded primary-domain/redirect assignment. If the new application is faulty but the domain is healthy, prefer application rollback over DNS churn.
- **Papaki DNS:** restore only the exported prior apex/`www` records and TTLs. Preserve mail/auth verification records. Expect DNS/TLS cache delay.
- **Supabase Auth:** restore the recorded previous Site URL/redirect entries/templates as one coordinated change. Never switch to `.ConfirmationURL` or GET token consumption as a shortcut. Keep a working origin attached before changing Site URL.
- **SMTP/Resend:** restore the previous verified sender/SMTP settings and keys; do not delete DNS records during the incident. If delivery is unsafe, pause new auth-email issuance while existing sessions continue.
- **Google OAuth:** restore prior branding/client settings or disable only the Google provider temporarily; email/password auth should remain available. Never delete the OAuth client during a release incident.
- **SEO:** do not roll canonical signals back independently from the serving domain. If application rollback still serves correctly on apex, keep apex canonical. Remove a submitted sitemap only if it is invalid, not merely because indexing is slow.

After rollback, repeat domain, auth, marketplace, RLS/private Storage, signed-media, and token-leakage checks and open an incident record with redacted evidence.
